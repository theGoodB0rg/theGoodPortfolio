import base64
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional

import requests
from github import Github, GithubException
from dotenv import load_dotenv

# ============ Configuration ============

class Config:
    MAX_IMAGES_PER_REPO = 6  # default per user instruction
    MIN_IMAGE_SIZE = 20_000  # bytes; skip tiny icons
    IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
    IMAGE_KEYWORDS = ("screenshot", "screen", "demo", "preview", "capture", "ui", "mock", "example")
    SKIP_ICON_NAMES = ("logo", "icon", "favicon", "apple-touch-icon")
    PRESERVE_IF_NO_NEW_IMAGES = True  # keep existing when nothing new discovered


# ============ Auth Helpers ============

load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")


def get_token_from_gh_cli() -> Optional[str]:
    import subprocess

    try:
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def get_token_from_git_credential_helper() -> Optional[str]:
    import subprocess

    input_text = "protocol=https\nhost=github.com\n"
    try:
        process = subprocess.Popen(
            ["git", "credential", "fill"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, _ = process.communicate(input=input_text)
        if process.returncode == 0:
            for line in stdout.splitlines():
                if line.startswith("password="):
                    return line.split("=", 1)[1]
    except FileNotFoundError:
        return None
    return None


if not GITHUB_TOKEN:
    print("GITHUB_TOKEN not found in env, trying 'gh' CLI...")
    GITHUB_TOKEN = get_token_from_gh_cli()

if not GITHUB_TOKEN:
    print("Trying git credential helper...")
    GITHUB_TOKEN = get_token_from_git_credential_helper()

if not GITHUB_TOKEN:
    print("Error: GITHUB_TOKEN not found in .env file, environment variables, or gh CLI.")
    print("Please create a .env file with GITHUB_TOKEN=your_personal_access_token")
    raise SystemExit(1)


# ============ Paths ============

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "public" / "data" / "projects.json"
DOCS_DIR = BASE_DIR / "docs"
CONTEXT_FILE = DOCS_DIR / "ALL_PROJECTS_CONTEXT.md"
PROJECTS_ASSET_DIR = BASE_DIR / "public" / "projects"

DOCS_DIR.mkdir(exist_ok=True)
PROJECTS_ASSET_DIR.mkdir(exist_ok=True)


# ============ Utility Functions ============

def slugify(text: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9-_]+", "-", text.strip())
    return re.sub(r"-+", "-", safe).strip("-").lower() or "project"


def normalize_title(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "", text).lower()
    return re.sub(r"(?:v)?\d+$", "", cleaned)


def get_file_content(repo, path: str) -> Optional[str]:
    try:
        content_file = repo.get_contents(path)
        return base64.b64decode(content_file.content).decode("utf-8", errors="ignore")
    except (GithubException, Exception):
        return None


def parse_readme_images(readme_text: str, repo_full_name: str, branch: str) -> List[Dict]:
    """
    Extract image links from README (markdown + HTML). Resolve relative paths to raw URLs.
    """
    if not readme_text:
        return []

    candidates = []

    def to_raw(url: str) -> str:
        # Already absolute
        if url.startswith("http://") or url.startswith("https://"):
            return url
        cleaned = url.lstrip("./")
        return f"https://raw.githubusercontent.com/{repo_full_name}/{branch}/{cleaned}"

    md_pattern = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<src>[^)]+)\)")
    html_pattern = re.compile(r'<img[^>]*src=["\'](?P<src>[^"\']+)["\'][^>]*alt=["\']?(?P<alt>[^"\'>]*)', re.IGNORECASE)

    for match in md_pattern.finditer(readme_text):
        src = match.group("src").split()[0]  # drop optional title
        alt = match.group("alt") or ""
        candidates.append({"src": to_raw(src), "caption": alt.strip(), "score": 50})

    for match in html_pattern.finditer(readme_text):
        src = match.group("src")
        alt = match.group("alt") or ""
        candidates.append({"src": to_raw(src), "caption": alt.strip(), "score": 50})

    return candidates


def derive_display_name(repo) -> str:
    """
    Prefer human-readable app name instead of repo slug.
    Order: README h1 -> package.json/app.json displayName/name -> pubspec name ->
           Android strings.xml app_name -> fallback to repo.name title-cased.
    """
    branch = repo.default_branch or "main"
    readme = get_file_content(repo, "README.md")
    if readme:
        h1 = re.search(r"^#\s+(.+)$", readme, flags=re.MULTILINE)
        if h1:
            name = h1.group(1).strip()
            if name and len(name) <= 80:
                return name

    for manifest in ("package.json", "app.json"):
        manifest_text = get_file_content(repo, manifest)
        if manifest_text:
            try:
                data = json.loads(manifest_text)
                for key in ("displayName", "name"):
                    val = data.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
            except json.JSONDecodeError:
                pass

    pubspec = get_file_content(repo, "pubspec.yaml")
    if pubspec:
        match = re.search(r"^name:\s*([A-Za-z0-9_\- ]+)", pubspec, flags=re.MULTILINE)
        if match:
            return match.group(1).strip()

    # Android strings.xml
    for path in (
        "app/src/main/res/values/strings.xml",
        "android/app/src/main/res/values/strings.xml",
    ):
        strings_xml = get_file_content(repo, path)
        if strings_xml:
            match = re.search(r'<string\s+name="app_name">([^<]+)</string>', strings_xml)
            if match:
                return match.group(1).strip()

    return repo.name.replace("-", " ").title()


def discover_image_candidates(repo) -> List[Dict]:
    """
    Collect potential image URLs from README and repository tree, score them for relevance.
    """
    branch = repo.default_branch or "main"
    candidates: Dict[str, Dict] = {}

    # README-sourced images have highest priority
    readme_text = get_file_content(repo, "README.md")
    for item in parse_readme_images(readme_text or "", repo.full_name, branch):
        key = item["src"]
        if key not in candidates:
            candidates[key] = {**item, "source": "readme"}

    # Tree walk for image files
    try:
        tree = repo.get_git_tree(branch, recursive=True).tree
    except GithubException:
        tree = []

    for entry in tree:
        path_lower = entry.path.lower()
        ext = Path(entry.path).suffix.lower()
        if ext not in Config.IMAGE_EXTS:
            continue
        if entry.size and entry.size < Config.MIN_IMAGE_SIZE:
            continue

        score = 10
        if any(k in path_lower for k in Config.IMAGE_KEYWORDS):
            score += 15
        if any(seg in path_lower for seg in ("screenshot", "screens", "docs", "assets", "public", "static", "fastlane")):
            score += 8
        if any(skip in path_lower for skip in Config.SKIP_ICON_NAMES):
            score -= 8

        raw_url = f"https://raw.githubusercontent.com/{repo.full_name}/{branch}/{entry.path}"
        if raw_url not in candidates:
            candidates[raw_url] = {
                "src": raw_url,
                "caption": "",
                "score": score,
                "source": "tree",
                "path": entry.path,
                "size": entry.size,
            }

    # Return sorted list
    return sorted(candidates.values(), key=lambda c: c.get("score", 0), reverse=True)


def download_images(repo, candidates: List[Dict], dest_root: Path) -> List[Dict]:
    """
    Download the top-ranked image candidates into per-repo folder.
    Returns list of dicts with local url and caption.
    """
    if not candidates:
        return []

    dest_root.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers.update({"Authorization": f"token {GITHUB_TOKEN}"})

    picked = []
    seen_names = set()
    for item in candidates:
        if len(picked) >= Config.MAX_IMAGES_PER_REPO:
            break

        src = item["src"]
        filename = Path(src).name
        name_root, ext = os.path.splitext(filename)
        if ext.lower() not in Config.IMAGE_EXTS:
            continue

        # Stable filename: original base + short hash of path
        short_hash = hashlib.sha1(src.encode("utf-8")).hexdigest()[:8]
        safe_name = f"{name_root}_{short_hash}{ext}".replace("%", "")
        if safe_name in seen_names:
            continue

        dest_file = dest_root / safe_name

        try:
            resp = session.get(src, timeout=15)
            if resp.status_code != 200:
                continue
            content = resp.content
            if len(content) < Config.MIN_IMAGE_SIZE:
                continue
            with open(dest_file, "wb") as f:
                f.write(content)
        except Exception:
            continue

        seen_names.add(safe_name)
        picked.append(
            {
                "url": f"/projects/{dest_root.name}/{safe_name}",
                "caption": item.get("caption", "")[:140],
            }
        )

    return picked


def build_context_section(repo, readme: str, docs_content: str) -> str:
    context = []
    context.append(f"## {repo.name}\n")
    context.append(f"**Description**: {repo.description}\n")
    context.append(f"**URL**: {repo.html_url}\n")
    context.append(f"### README\n{readme or 'No README found.'}\n")
    if docs_content:
        context.append(docs_content)
    context.append("\n---\n\n")
    return "".join(context)


# ============ Main Logic ============


def main():
    print("Authenticating with GitHub...")
    gh = Github(GITHUB_TOKEN)
    user = gh.get_user()
    print(f"Logged in as: {user.login}")

    # Load existing projects (for optional preservation of details)
    existing_projects = []
    if DATA_FILE.exists():
        try:
            existing_projects = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing_projects = []

    project_map: Dict[str, Dict] = {}
    for p in existing_projects:
        if p.get("link"):
            project_map[p["link"]] = p
        if p.get("title"):
            project_map[p["title"]] = p
        if p.get("id"):
            project_map[str(p["id"])] = p

    repos = user.get_repos(sort="updated", direction="desc")
    context_content = ["# All Projects Context\n\nThis document contains details of all projects fetched from GitHub.\n\n"]
    new_projects: List[Dict] = []
    seen_titles = set()

    for repo in repos:
        if repo.fork:
            continue

        display_name = derive_display_name(repo)
        normalized = normalize_title(display_name)

        if normalized in seen_titles:
            print(f"- Skipping duplicate title: {display_name}")
            continue
        seen_titles.add(normalized)

        print(f"Processing: {display_name} ({repo.full_name})")

        topics = repo.get_topics()
        language = repo.language or "Unspecified"
        category = "web"
        topic_lower = [str(t).lower() for t in topics]
        if "android" in topic_lower or "kotlin" in topic_lower or (language and language.lower() == "kotlin"):
            category = "mobile"

        tags = list({language} | set(topics[:3]))

        readme = get_file_content(repo, "README.md") or ""

        # Aggregate docs content
        docs_content = ""
        try:
            contents = repo.get_contents("docs")
            for content_file in contents:
                if content_file.name.endswith(".md"):
                    file_text = get_file_content(repo, content_file.path)
                    if file_text:
                        docs_content += f"\n### docs/{content_file.name}\n{file_text}\n"
        except GithubException:
            pass

        context_content.append(build_context_section(repo, readme, docs_content))

        # Match existing project if present
        project_data = project_map.get(repo.html_url) or project_map.get(repo.full_name) or project_map.get(repo.name)

        if not project_data:
            project_data = {
                "id": repo.id,
                "title": display_name,
                "category": category,
                "tags": tags,
                "description": repo.description or "No description provided.",
                "details": "Imported from GitHub. See README for details.",
                "link": repo.html_url,
                "images": [],
                "thumb": "",
            }
        else:
            project_data["title"] = display_name
            project_data["description"] = repo.description or project_data.get("description", "")
            project_data["link"] = repo.html_url
            project_data["tags"] = list(set(project_data.get("tags", []) + tags))
            project_data.setdefault("details", "Imported from GitHub. See README for details.")
            project_data.setdefault("images", [])
            project_data.setdefault("thumb", "")

        # Discover and download images
        dest_dir = PROJECTS_ASSET_DIR / slugify(repo.name)
        candidates = discover_image_candidates(repo)
        downloaded = download_images(repo, candidates, dest_dir)

        if downloaded:
            project_data["images"] = downloaded
            project_data["thumb"] = downloaded[0]["url"]
        elif not downloaded and not Config.PRESERVE_IF_NO_NEW_IMAGES:
            project_data["images"] = []
            project_data["thumb"] = ""

        new_projects.append(project_data)

    # Write context
    CONTEXT_FILE.write_text("".join(context_content), encoding="utf-8")
    print(f"Saved context to {CONTEXT_FILE}")

    # Write JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(new_projects, f, indent=2)
    print(f"Updated {DATA_FILE} with {len(new_projects)} projects.")


if __name__ == "__main__":
    main()
