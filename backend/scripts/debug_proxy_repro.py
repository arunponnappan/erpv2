import asyncio
import httpx
import sqlite3
import json
import os

async def debug_asset_fetch():
    print("Connecting to database...")
    db_path = "sql_app.db"
    if not os.path.exists(db_path):
        # Fallback
        db_path = "backend_app.db"
        print(f"Database not found at {os.path.abspath(db_path)}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Get API Key
    try:
        cursor.execute("SELECT settings FROM installedapp WHERE app_id = 1")
        row = cursor.fetchone()
        if not row:
            print("No Monday app found (ID 1)")
            return
        
        settings = json.loads(row[0])
        api_key = settings.get("api_key")
        print(f"Got API Key: {api_key[:5]}...")
    finally:
        conn.close()

    # 2. Fetch a board item with assets to get a real URL
    headers = {
        "Authorization": api_key,
        "API-Version": "2023-10"
    }
    
    async with httpx.AsyncClient() as client:
        # Get boards
        print("Fetching boards...")
        query_boards = "{ boards(limit: 50) { id name } }"
        r = await client.post("https://api.monday.com/v2", json={"query": query_boards}, headers=headers)
        if r.status_code != 200:
            print(f"Failed to fetch boards: {r.text}")
            return
            
        boards = r.json().get("data", {}).get("boards", [])
        if not boards:
            print("No boards found")
            return
        
        if not boards:
            print("No boards found")
            return
            
        print(f"Found {len(boards)} boards. Scanning for assets...")
        
        if not boards:
            print("No boards found")
            return
            
        print(f"Found {len(boards)} boards. Scanning for assets...")
        
        target_url = None
        
        # Check ALL boards, not just the first few
        for board in boards:
            # print(f"Checking board: {board['name']} ({board['id']})")
            query_items = f"""
            {{
                boards(ids: [{board['id']}]) {{
                    items_page(limit: 10) {{
                        items {{
                            id
                            name
                            assets {{
                                id
                                public_url
                                url
                                name
                            }}
                        }}
                    }}
                }}
            }}
            """
            try:
                r = await client.post("https://api.monday.com/v2", json={"query": query_items}, headers=headers)
                if r.status_code != 200:
                    continue
                
                data = r.json()
                items = data.get("data", {}).get("boards", [])[0].get("items_page", {}).get("items", [])
                
                for item in items:
                    if item.get("assets"):
                        asset = item["assets"][0]
                        target_url = asset.get("url")
                        print(f"FOUND ASSET! Board: {board['name']}, Item: {item['name']}, Asset: {asset['name']}")
                        print(f"Target URL: {target_url}")
                        break
            except Exception:
                continue
                
            if target_url:
                break
        
        if not target_url:
            print("No assets found in ANY accessible board.")
            return
        
        if not target_url:
            print("No assets found in items. Cannot replicate.")
            return

        # 3. Simulate Proxy Request with Redirection Check
        print("\n--- Simulating Proxy Request ---")
        
        # This mirrors the logic in monday.py PROIR to my fix (or effectively what happens with redirects)
        # We want to see if Authorization leaks to S3
        
        proxy_headers = {
            "Authorization": api_key,
            "API-Version": "2023-10"
        }

        # Create a client that tracks redirects manually logic
        client_test = httpx.AsyncClient(follow_redirects=True)
        
        # Hook to request to see what headers are SENT
        async def log_request(request):
            print(f"\n[Request] {request.method} {str(request.url)[:100]}...")
            if "Authorization" in request.headers:
                print("Authorization Header: PRESENT (BAD for S3)")
            else:
                print("Authorization Header: MISSING (GOOD for S3)")

        client_test.event_hooks['request'] = [log_request]

        try:
            print(f"Fetching via Proxy Logic: {target_url}")
            # Manual redirect handling logic from monday.py
            client = httpx.AsyncClient(follow_redirects=False)
            req = client.build_request("GET", target_url, headers=proxy_headers)
            r = await client.send(req, stream=True)
            
            if r.status_code in (301, 302, 303, 307, 308):
                redirect_url = r.headers.get("location")
                print(f"Redirect caught! Location: {redirect_url}")
                if redirect_url:
                    await r.aclose()
                    print("Follow-up request (No Auth)...")
                    # Clean client for redirect
                    client2 = httpx.AsyncClient()
                    # We use standard get which essentially has empty/default headers
                    r = await client2.get(redirect_url)
                    await client2.aclose()
            
            print(f"\n[Response] Status: {r.status_code}")
            # Use aread() for async streaming response reading
            content = await r.aread()
            
            filename = "debug_artifact.bin"
            with open(filename, "wb") as f:
                f.write(content)
            print(f"Saved content to {filename} ({len(content)} bytes)")
            
            # Print preview if it looks like text (error message)
            try:
                print(f"Content preview: {content.decode('utf-8')[:500]}")
            except:
                print("Content is binary (likely an image?)")
                
        finally:
            await client.aclose()

if __name__ == "__main__":
    asyncio.run(debug_asset_fetch())
