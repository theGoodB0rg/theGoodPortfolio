import os
import requests
import base64
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

def download_repo_file(repo, path, dest):
    print(f"Downloading {path} -> {dest}")
    try:
        content_file = repo.get_contents(path)
        img_data = base64.b64decode(content_file.content)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            f.write(img_data)
        print("Success.")
    except Exception as e:
        print(f"Failed: {e}")

def main():
    token = get_token_from_git_credential_helper()
    if not token:
        print("No token.")
        return
        
    gh = Github(token)
    
    try:
        habit_repo = gh.get_repo("theGoodB0rg/Habit-Tracker")
        download_repo_file(habit_repo, "screenshot.png", "public/projects/habit_tracker/screenshot.png")
    except Exception as e:
        print(f"Habit err: {e}")

if __name__ == "__main__":
    main()
