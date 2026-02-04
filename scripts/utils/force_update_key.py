"""
Force update the API key and verify it's saved correctly
"""
import sqlite3
import json

NEW_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNToxMzo1NC4xODNaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.0V91rL-NT4MZDIvx6XlXZGY0bwgOr-M1h8Sgmy-57lg"

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# Find Monday.com InstalledApp
cursor.execute("""
    SELECT ia.id, ia.settings 
    FROM installedapp ia
    JOIN marketplaceapp ma ON ia.app_id = ma.id
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()

if result:
    app_id, current_settings = result
    print(f"Found InstalledApp ID: {app_id}")
    print(f"Current settings: {current_settings[:100]}...")
    
    # Parse current settings
    settings_dict = json.loads(current_settings) if current_settings else {}
    
    # Update with new API key
    settings_dict["api_key"] = NEW_API_KEY
    
    # Save back
    new_settings_json = json.dumps(settings_dict)
    cursor.execute("UPDATE installedapp SET settings = ? WHERE id = ?", (new_settings_json, app_id))
    conn.commit()
    
    print(f"\n[SUCCESS] Updated settings!")
    print(f"New API key (first 50): {NEW_API_KEY[:50]}")
    
    # Verify it was saved
    cursor.execute("SELECT settings FROM installedapp WHERE id = ?", (app_id,))
    verify = cursor.fetchone()[0]
    verify_dict = json.loads(verify)
    saved_key = verify_dict.get("api_key", "")
    
    if saved_key == NEW_API_KEY:
        print("\n[VERIFIED] API key correctly saved in database!")
    else:
        print(f"\n[ERROR] Verification failed!")
        print(f"Expected: {NEW_API_KEY[:50]}")
        print(f"Got: {saved_key[:50]}")
else:
    print("[ERROR] Monday.com app not found")

conn.close()

print("\n" + "="*60)
print("CRITICAL: You MUST restart the backend now!")
print("="*60)
print("Run: uvicorn app.main:app --reload")
