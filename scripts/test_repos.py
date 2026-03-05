import os
from github import Github
import subprocess
import json

def get_token_from_git_credential_helper():
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

def main():
    token = get_token_from_git_credential_helper()
    if not token:
        print("GITHUB_TOKEN not found.")
        return

    import json
    with open("public/data/projects.json", "r", encoding="utf-8") as f:
        projects = json.load(f)
    
    # Also check git links to be safe
    existing_links = {p.get("link", "").lower() for p in projects}
    
    gh = Github(token)
    user = gh.get_user()
    repos = list(user.get_repos(type="all", sort="updated", direction="desc"))
    
    print(f"Total repos on Github: {len(repos)}")
    print(f"Total projects in JSON: {len(projects)}")
    
    missing = []
    for r in repos:
        if r.html_url.lower() not in existing_links:
            missing.append(r)
            
    print(f"\nMissing from JSON ({len(missing)}):")
    for m in missing:
        print(f"- {m.full_name} (fork={m.fork}, private={m.private})")

if __name__ == "__main__":
    main()
