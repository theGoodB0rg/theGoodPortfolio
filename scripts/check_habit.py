import os
import requests
import subprocess
from github import Github

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
        print("No token.")
        return
        
    for repo_name in ["theGoodB0rg/habit_tracker", "theGoodB0rg/Habit-Tracker"]:
        print(f"Checking {repo_name}...")
        url = f"https://api.github.com/repos/{repo_name}/git/trees/main?recursive=1"
        r = requests.get(url, headers={'Authorization': f'token {token}'}, verify=False)
        if r.status_code == 200:
            tree = r.json().get('tree', [])
            imgs = [x['path'] for x in tree if x['path'].lower().endswith(('.png','.jpg','.jpeg','.gif','.webp')) and 'screenshot' in x['path'].lower()]
            print(f"Main Branch found {len(imgs)} imgs:")
            for img in imgs:
                print(" -", img)
        else:
            print(f"Main Branch 404/Error: {r.status_code}")

        url = f"https://api.github.com/repos/{repo_name}/git/trees/master?recursive=1"
        r = requests.get(url, headers={'Authorization': f'token {token}'}, verify=False)
        if r.status_code == 200:
            tree = r.json().get('tree', [])
            imgs = [x['path'] for x in tree if x['path'].lower().endswith(('.png','.jpg','.jpeg','.gif','.webp')) and 'screenshot' in x['path'].lower()]
            print(f"Master Branch found {len(imgs)} imgs:")
            for img in imgs:
                print(" -", img)
        else:
            print(f"Master Branch 404/Error: {r.status_code}")

if __name__ == "__main__":
    main()
