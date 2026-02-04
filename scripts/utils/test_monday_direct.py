"""
Direct test of Monday.com API to see what's being returned
"""
import requests
import json

# Your Monday.com API key from the backend
API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNToxMzo1NC4xODNaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.0V91rL-NT4MZDIvx6XlXZGY0bwgOr-M1h8Sgmy-57lg"

board_id = 5090745546

# Test Query
query = """
query {
    boards (ids: [%s]) {
        id
        name
        items_page(limit: 10) {
            cursor
            items {
                id
                name
            }
        }
    }
}
""" % board_id

headers = {
    "Authorization": API_KEY,
    "Content-Type": "application/json",
    "API-Version": "2024-04"
}

print(f"Testing Monday.com API for Board {board_id}...")
print("=" * 60)

try:
    response = requests.post(
        "https://api.monday.com/v2",
        json={"query": query},
        headers=headers,
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print("\nRaw Response:")
    print(json.dumps(response.json(), indent=2))
    
    data = response.json()
    
    # Check for errors
    if "errors" in data:
        print("\n[ERROR] ERRORS FOUND:")
        print(json.dumps(data["errors"], indent=2))
    
    # Check for items
    boards = data.get("data", {}).get("boards", [])
    if boards:
        items_page = boards[0].get("items_page", {})
        items = items_page.get("items", [])
        print(f"\n[OK] Found {len(items)} items")
        if items:
            print("\nFirst few items:")
            for item in items[:3]:
                print(f"  - {item['id']}: {item['name']}")
        else:
            print("\n[WARNING] Board exists but has NO ITEMS")
    else:
        print("\n[ERROR] No boards found - possible permission issue or wrong ID")
        
except Exception as e:
    print(f"\n[ERROR] Error: {e}")
