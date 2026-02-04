"""
Verify the exact settings stored in database
"""
import sqlite3
import json

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT ia.id, ia.settings, ia.is_active, ma.name 
    FROM installedapp ia
    JOIN marketplaceapp ma ON ia.app_id = ma.id
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()

if result:
    app_id, settings_json, is_active, app_name = result
    print(f"App: {app_name}")
    print(f"ID: {app_id}")
    print(f"Active: {is_active}")
    print(f"\nRaw settings string:")
    print(settings_json)
    print(f"\nParsed settings:")
    settings = json.loads(settings_json)
    print(json.dumps(settings, indent=2))
    
    if "api_key" in settings:
        api_key = settings["api_key"]
        print(f"\nAPI Key found: {api_key[:50]}...")
        
        # Check if it's the new key
        if api_key.startswith("eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjgzNjg4"):
            print("[OK] This is the NEW API key")
        else:
            print("[WARNING] This is NOT the new API key")
    else:
        print("\n[ERROR] No api_key field in settings!")
else:
    print("[ERROR] No Monday app found")

conn.close()
