import os
import requests
from github import Github
import subprocess
import base64

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
    
    # Coddle
    try:
        coddle_repo = gh.get_repo("theGoodB0rg/coddle_coddle")
        download_repo_file(coddle_repo, "docs/screenshots/01-initial-state.png", "public/projects/coddle/01-initial-state.png")
        download_repo_file(coddle_repo, "docs/screenshots/02-wrong-answer.png", "public/projects/coddle/02-wrong-answer.png")
        download_repo_file(coddle_repo, "docs/screenshots/03-win-modal.png", "public/projects/coddle/03-win-modal.png")
    except Exception as e:
        print(f"Coddle err: {e}")
        
    # Habit Tracker
    try:
        habit_repo = gh.get_repo("theGoodB0rg/Habit-Tracker")
        download_repo_file(habit_repo, "docs/screenshots/app-main-screen.png", "public/projects/habit_tracker/app-main-screen.png")
        download_repo_file(habit_repo, "docs/screenshots/habit-tracking-interface.png", "public/projects/habit_tracker/habit-tracking-interface.png")
    except Exception as e:
        print(f"Habit err: {e}")

if __name__ == "__main__":
    main()
