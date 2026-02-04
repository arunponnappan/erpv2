"""
Check and update Monday API key in InstalledApp settings
"""
import sqlite3
import json

NEW_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjgzNjg4NCwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNTowMjoxNi44ODhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.a5pNlrAZERRpn8I0KizyTidXsedIZk5WVvSQuXdVU3Y"

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# Find the Monday.com InstalledApp
cursor.execute("""
    SELECT ia.id, ia.settings, ma.name 
    FROM installedapp ia
    JOIN marketplaceapp ma ON ia.app_id = ma.id
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()

if result:
    app_id, settings_json, app_name = result
    print(f"Found: {app_name} (ID: {app_id})")
    print(f"Current settings: {settings_json}")
    
    # Create new settings with API key
    new_settings = json.dumps({"api_key": NEW_API_KEY})
    
    cursor.execute("UPDATE installedapp SET settings = ? WHERE id = ?", (new_settings, app_id))
    conn.commit()
    
    print(f"\n[SUCCESS] Updated settings!")
    print(f"New settings: {new_settings[:100]}...")
else:
    print("[ERROR] Monday.com app not found in installedapp table")
    print("\nTrying to find by app_id = 1...")
    
    cursor.execute("SELECT id, settings FROM installedapp WHERE app_id = 1")
    result = cursor.execute("UPDATE monday_barcode_config SET barcode_column_id = 'formula_mkzzex2s' WHERE board_id = 5090745546")
    result = cursor.fetchone()
    
    if result:
        app_id, settings_json = result
        print(f"Found app with ID 1: {settings_json}")
        
        new_settings = json.dumps({"api_key": NEW_API_KEY})
        cursor.execute("UPDATE installedapp SET settings = ? WHERE id = ?", (new_settings, app_id))
        conn.commit()
        
        print(f"\n[SUCCESS] Updated!")
    else:
        print("[ERROR] No installed app found")

conn.close()

print("\n" + "="*60)
print("[NEXT STEP] Restart backend to load new settings")
print("="*60)
