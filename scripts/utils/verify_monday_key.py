"""
Verify the Monday API key was updated in the database
"""
import sqlite3

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# Check installedapp table for Monday connector
cursor.execute("""
    SELECT ia.id, ia.app_id, ia.config, ma.name 
    FROM installedapp ia 
    JOIN marketplaceapp ma ON ia.app_id = ma.id 
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()
if result:
    app_id, marketplace_id, config, app_name = result
    print(f"Found Monday.com app: {app_name}")
    print(f"Config: {config[:100]}..." if config else "No config")
    
    # Parse the config to check API key
    if config:
        import json
        try:
            config_data = json.loads(config)
            if 'api_key' in config_data:
                api_key = config_data['api_key']
                print(f"\nAPI Key in database: {api_key[:50]}...")
                
                # Check if it's the new one
                NEW_KEY_START = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjgzNjg4"
                if api_key.startswith(NEW_KEY_START):
                    print("\n[SUCCESS] ✓ New API key is saved in database!")
                else:
                    print("\n[WARNING] Old API key still in database")
        except:
            print("Could not parse config JSON")
else:
    print("Monday.com app not found in installedapp table")

conn.close()

print("\n" + "="*60)
print("NEXT STEP: Restart Backend Server")
print("="*60)
print("1. Go to your backend terminal")
print("2. Press Ctrl+C to stop it")
print("3. Run: uvicorn app.main:app --reload")
print("4. Refresh mobile app")
