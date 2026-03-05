import json

def add_repo(projects, id, title, category, description, link, live_link=None):
    repo = {
        "id": id,
        "title": title,
        "category": category,
        "tags": ["GitHub"],
        "description": description,
        "details": "Imported from GitHub. See README for details.",
        "link": link,
        "images": [],
        "thumb": ""
    }
    if live_link:
        repo["live_link"] = live_link
    projects.append(repo)

def main():
    with open('public/data/projects.json', 'r', encoding='utf-8') as f:
        projects = json.load(f)
    
    existing_links = {p.get("link", "").lower() for p in projects}
    
    if "https://github.com/thegoodb0rg/excel_clean" not in existing_links:
        add_repo(projects, 999991, "Excel Clean", "web", "Python utility for cleaning nested Excel/CSV outputs before processing.", "https://github.com/theGoodB0rg/Excel_Clean")
        
    if "https://github.com/thegoodb0rg/expert-eureka" not in existing_links:
        add_repo(projects, 999992, "Expert Eureka (Private Fork)", "web", "Private version and experimental iteration of the Expert Eureka platform.", "https://github.com/theGoodB0rg/expert-eureka")
        
    if "https://github.com/jacen-max/49blox" not in existing_links:
        add_repo(projects, 999993, "49Blox (Jacen-max Base Repo)", "web", "Source repository for 49Blox client engagement.", "https://github.com/Jacen-max/49Blox", "https://49blox.com")
        
    with open('public/data/projects.json', 'w', encoding='utf-8') as f:
        json.dump(projects, f, indent=2)

    print(f"Successfully added missing repos. Total now: {len(projects)}")

if __name__ == "__main__":
    main()
