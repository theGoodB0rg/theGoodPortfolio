import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "public" / "data" / "projects.json"

def main():
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            projects = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    # Check for missing popular projects from memory
    target_names = ["smartFlyer", "React Compiler", "Landing_page_plugin", "OIT", "Keyword-Planner-Extension"]
    
    existing_titles = [p.get("title", "") for p in projects]
    print(f"Currently in JSON: {len(projects)} projects.")
    
    # In this case fetch_projects currently overwrites 'details', 'images' unless it matches.
    # Actually, fetch_projects.py preserves existing projects if they are in the JSON.
    # We just need fetch_projects to finish writing the new JSON which will APPEND the missing ones.
    
    # We will verify what's inside the JSON after the run.
    print("Merge script ready.")

if __name__ == "__main__":
    main()
