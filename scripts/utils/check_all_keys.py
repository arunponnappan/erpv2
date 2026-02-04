"""
Check what's ACTUALLY in the database right now
"""
import sqlite3
import json

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# Get ALL installedapp records to see what's there
cursor.execute("""
    SELECT ia.id, ia.company_id, ia.app_id, ia.settings, ma.name
    FROM installedapp ia
    LEFT JOIN marketplaceapp ma ON ia.app_id = ma.id
""")

print("ALL InstalledApp records:")
print("="*80)
for row in cursor.fetchall():
    app_id, company_id, marketplace_app_id, settings, app_name = row
    print(f"\nID: {app_id}")
    print(f"  Company ID: {company_id}")
    print(f"  App ID: {marketplace_app_id}")
    print(f"  App Name: {app_name}")
    
    if settings:
        try:
            settings_dict = json.loads(settings)
            api_key = settings_dict.get("api_key", "")
            if api_key:
                print(f"  API Key (first 60): {api_key[:60]}")
                # Check if it's the NEW key
                if api_key.startswith("eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3Nyw"):
                    print(f"  >>> THIS IS THE NEW WORKING KEY <<<")
                else:
                    print(f"  >>> THIS IS AN OLD/DIFFERENT KEY <<<")
        except:
            print(f"  Settings (raw): {settings[:100]}")
    else:
        print(f"  Settings: None")

conn.close()

print("\n" + "="*80)
print("Expected NEW key starts with:")
print("eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3Nyw")
