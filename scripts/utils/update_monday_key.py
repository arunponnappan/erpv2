"""
Find and update Monday.com API key in database
"""
import sqlite3

NEW_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjgzNjg4NCwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNTowMjoxNi44ODhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.a5pNlrAZERRpn8I0KizyTidXsedIZk5WVvSQuXdVU3Y"

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

# Find all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Available tables:")
for table in tables:
    print(f"  - {table[0]}")

# Try to find Monday config in different possible table names
possible_tables = ['mondayconfig', 'monday_config', 'MondayConfig', 'monday_connector_config']

config_found = False
for table_name in possible_tables:
    try:
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
        columns = [description[0] for description in cursor.description]
        print(f"\n[OK] Found table: {table_name}")
        print(f"Columns: {columns}")
        
        # Try to update
        if 'api_key' in columns:
            cursor.execute(f"UPDATE {table_name} SET api_key = ?", (NEW_API_KEY,))
            conn.commit()
            print(f"\n[SUCCESS] Updated API key in {table_name}!")
            config_found = True
            break
    except sqlite3.OperationalError:
        continue

if not config_found:
    print("\n[WARNING] Could not find Monday config table")
    print("You may need to configure Monday.com via the web dashboard first")

conn.close()

print("\n" + "="*60)
if config_found:
    print("[SUCCESS] API Key Updated!")
    print("="*60)
    print("\nNEXT STEPS:")
    print("1. Restart backend (Ctrl+C, then uvicorn app.main:app --reload)")
    print("2. Refresh mobile app")
    print("3. Items should appear!")
else:
    print("[INFO] Manual Update Required")
    print("="*60)
    print("\nGo to http://localhost:3000")
    print("Navigate to Marketplace > Monday.com Connector")
    print("Paste this API key:")
    print(NEW_API_KEY)
