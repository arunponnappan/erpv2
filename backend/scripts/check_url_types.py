import asyncio
import httpx
import sqlite3
import json
import os

async def check_urls():
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
    
    async with httpx.AsyncClient() as client:
        # Scan for assets
        query_boards = "{ boards(limit: 50) { id name } }"
        r = await client.post("https://api.monday.com/v2", json={"query": query_boards}, headers=headers)
        boards = r.json().get("data", {}).get("boards", [])
        
        for board in boards:
             query = f"""
            {{
                boards(ids: [{board['id']}]) {{
                    items_page(limit: 10) {{
                        items {{
                            id
                            name
                            assets {{
                                id
                                name
                                url
                                public_url
                            }}
                        }}
                    }}
                }}
            }}
            """
             try:
                r = await client.post("https://api.monday.com/v2", json={"query": query}, headers=headers)
                items = r.json().get("data", {}).get("boards", [])[0].get("items_page", {}).get("items", [])
                
                for item in items:
                    if item.get("assets"):
                        asset = item["assets"][0]
                        print(f"\nItem: {item['name']}")
                        print(f"Asset: {asset['name']}")
                        print(f"URL:        {asset['url']}")
                        print(f"Public URL: {asset['public_url']}")
                        
                        # Exact replica of monday.py proxy logic for public_url
                        print("\n--- Simulating monday.py Proxy Logic (skip_auth=True) ---")
                        target_url_to_test = asset['public_url']
                        
                        from urllib.parse import urlparse
                        
                        # Monday.py logic start
                        domain = urlparse(target_url_to_test).netloc
                        headers = {} # skip_auth=True -> headers are empty
                        
                        client = httpx.AsyncClient(follow_redirects=False)
                        current_url = target_url_to_test
                        current_headers = headers
                        
                        final_r = None
                        
                        try:
                            for i in range(3):
                                print(f"Request {i+1}: {current_url}")
                                req = client.build_request("GET", current_url, headers=current_headers)
                                r = await client.send(req, stream=True)
                                
                                print(f"Status: {r.status_code}")
                                if r.status_code in (301, 302, 303, 307, 308):
                                    redirect_url = r.headers.get("location")
                                    if redirect_url:
                                        await r.aclose()
                                        print(f"Redirecting to: {redirect_url}")
                                        current_url = redirect_url
                                        
                                        next_domain = urlparse(redirect_url).netloc
                                        if "monday.com" not in next_domain:
                                            print("External Redirect -> Dropping ALL Headers (Already empty)")
                                            current_headers = {}
                                        else:
                                            print("Internal Redirect -> Keeping Auth (Empty)")
                                        continue
                                
                                final_r = r
                                break
                            
                            if final_r:
                                print(f"Final Status: {final_r.status_code}")
                                content = await final_r.aread()
                                print(f"Final Content Length: {len(content)}")
                                with open("debug_replica.bin", "wb") as f:
                                    f.write(content)
                                if len(content) < 1000:
                                     print(f"Content Preview: {content.decode('utf-8')}")
                            else:
                                print("Loop finished without final response?")
                                
                        finally:
                            await client.aclose()
                        
                        return
             except:
                 continue

if __name__ == "__main__":
    asyncio.run(check_urls())
