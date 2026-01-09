import os
import json
import base64
from github import Github, GithubException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

def get_token_from_gh_cli():
    import subprocess
    try:
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None

def get_token_from_git_credential_helper():
    import subprocess
    input_text = "protocol=https\nhost=github.com\n"
    try:
        process = subprocess.Popen(
            ["git", "credential", "fill"], 
            stdin=subprocess.PIPE, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, _ = process.communicate(input=input_text)
        if process.returncode == 0:
            for line in stdout.splitlines():
                if line.startswith("password="):
                    return line.split("=", 1)[1]
    except (FileNotFoundError):
        pass
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
    exit(1)

# Initialize GitHub client
g = Github(GITHUB_TOKEN)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "src", "data", "projects.json")
DOCS_DIR = os.path.join(BASE_DIR, "docs")
CONTEXT_FILE = os.path.join(DOCS_DIR, "ALL_PROJECTS_CONTEXT.md")

# Ensure docs directory exists
os.makedirs(DOCS_DIR, exist_ok=True)

def get_file_content(repo, path):
    """Refetch file content handling encoding."""
    try:
        content_file = repo.get_contents(path)
        return  base64.b64decode(content_file.content).decode('utf-8')
    except (GithubException, Exception):
        return None

def main():
    print(f"Authenticating with GitHub...")
    user = g.get_user()
    print(f"Logged in as: {user.login}")

    # Load existing projects to preserve manual overrides (like images which are hard to scrape)
    existing_projects = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                existing_projects = json.load(f)
            except json.JSONDecodeError:
                pass
    
    # Create a map for easy update
    project_map = {}
    for p in existing_projects:
        if p.get('title'):
            project_map[p.get('title')] = p
        if p.get('link'):
            project_map[p.get('link')] = p

    print("Fetching repositories...")
    repos = user.get_repos(sort="updated", direction="desc")
    
    context_content = "# All Projects Context\n\nThis document contains details of all projects fetched from GitHub.\n\n"

    new_projects_list = []
    
    count = 0
    for repo in repos:
        # Skip forks if desired, strictly speaking user might want them, but usually not for portfolio
        if repo.fork: 
            continue
            
        print(f"Processing: {repo.name}")
        
        # Determine category based on topics or language
        # Default to 'web' or 'mobile' if detected, else 'other'
        topics = repo.get_topics()
        language = repo.language or "Unspecified"
        
        category = "web" # Default
        if "android" in topics or "kotlin" in [str(t).lower() for t in topics] or (repo.language and repo.language.lower() == 'kotlin'):
            category = "mobile"
        
        # Tags
        tags = [language] + topics[:3] # Limit tags
        
        # Content for Context
        readme = get_file_content(repo, "README.md") or "No README found."
        
        # Check for docs folder
        docs_content = ""
        try:
            contents = repo.get_contents("docs")
            for content_file in contents:
                if content_file.name.endswith(".md"):
                    file_text = get_file_content(repo, content_file.path)
                    if file_text:
                        docs_content += f"\n### docs/{content_file.name}\n{file_text}\n"
        except:
            pass # No docs folder
            
        context_content += f"## {repo.name}\n"
        context_content += f"**Description**: {repo.description}\n"
        context_content += f"**URL**: {repo.html_url}\n"
        context_content += f"### README\n{readme}\n"
        context_content += f"{docs_content}\n"
        context_content += "---\n\n"

        # Update Project Structure
        # We try to match with existing projects by title or repo name to preserve manual fields like 'images'
        # If the project key is derived from repo name, use that. 
        
        # Match by URL first, then Title/Name
        project_data = project_map.get(repo.html_url) or project_map.get(repo.name) or project_map.get(repo.full_name)
        
        # If not found by name, try fuzzy match or just create new
        if not project_data:
             # Create new entry
             project_data = {
                 "id": repo.id,
                 "title": repo.name.replace("-", " ").title(),
                 "category": category,
                 "tags": tags,
                 "description": repo.description or "No description provided.",
                 "details": "Imported from GitHub. See README for details.",
                 "link": repo.html_url,
                 "images": [], # Placeholder, user must add manually or we need sophisticated scraping
                 "thumb": "" 
             }
        else:
            # Update fields that should be synced
            project_data["description"] = repo.description or project_data["description"]
            project_data["link"] = repo.html_url
            project_data["tags"] = list(set(project_data.get("tags", []) + tags))
        
        new_projects_list.append(project_data)
        count += 1
        # Optional: Limit to top X repos? No, user asked for "all my github projects"
        
    # Write Context File
    with open(CONTEXT_FILE, 'w', encoding='utf-8') as f:
        f.write(context_content)
    print(f"Saved context to {CONTEXT_FILE}")
    
    # Write JSON File
    # We might want to keep the old manual entries if they weren't found in GitHub? 
    # For now, let's assume the user wants the script to be the source of truth for the list, 
    # but we preserved the objects to keep image links.
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_projects_list, f, indent=2)
    print(f"Updated {DATA_FILE} with {count} projects.")

if __name__ == "__main__":
    main()
