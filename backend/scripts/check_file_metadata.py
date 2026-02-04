import asyncio
import httpx
import sqlite3
import json
import os

async def check_metadata():
    print("Connecting to database...")
    db_path = "sql_app.db"
    if not os.path.exists(db_path):
        db_path = "backend_app.db"

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT settings FROM installedapp WHERE app_id = 1")
        row = cursor.fetchone()
        if not row:
            print("No Monday app found")
            return
        settings = json.loads(row[0])
        api_key = settings.get("api_key")
    finally:
        conn.close()

    headers = { "Authorization": api_key, "API-Version": "2023-10" }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Fetch items and inspect column values for 'files'
        query = """
        {
            boards(ids: [5089863605]) {
                items_page(limit: 5) {
                    items {
                        name
                        column_values {
                            type
                            value
                            text
                        }
                    }
                }
            }
        }
        """
        r = await client.post("https://api.monday.com/v2", json={"query": query}, headers=headers)
        data = r.json()
        
        boards = data.get("data", {}).get("boards", [])
        for board in boards:
            items = board.get("items_page", {}).get("items", [])
            for item in items:
                for col in item.get("column_values", []):
                    if col['type'] == 'file':
                        if col['value']:
                            print(f"\nItem: {item['name']}")
                            print(f"File Column Value: {col['value']}")
                            return

if __name__ == "__main__":
    asyncio.run(check_metadata())
