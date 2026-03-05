import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("GITHUB_TOKEN")
if not token:
    print("GITHUB_TOKEN not found in .env")
    exit(1)

headers = {"Authorization": f"token {token}", "User-Agent": "Mozilla/5.0"}
repo_url = "https://api.github.com/repos/theGoodB0rg/Habit-Tracker"

for branch in ["main", "master"]:
    print(f"Checking branch: {branch}")
    url = f"{repo_url}/git/trees/{branch}?recursive=1"
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        tree = data.get("tree", [])
        images = [item["path"] for item in tree if item["path"].lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")) and "screenshot" in item["path"].lower()]
        
        if images:
            print(f"Found images in {branch}:")
            for img in images:
                print(f" - {img}")
        else:
            print(f"No screenshots found in {branch}")
    else:
        print(f"Failed to fetch tree for {branch}: {response.status_code}")
