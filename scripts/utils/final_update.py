"""
Update database with the WORKING API key
"""
import sqlite3
import json

NEW_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNToxMzo1NC4xODNaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.0V91rL-NT4MZDIvx6XlXZGY0bwgOr-M1h8Sgmy-57lg"

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT ia.id FROM installedapp ia
    JOIN marketplaceapp ma ON ia.app_id = ma.id
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()

if result:
    app_id = result[0]
    new_settings = json.dumps({"api_key": NEW_API_KEY})
    
    cursor.execute("UPDATE installedapp SET settings = ? WHERE id = ?", (new_settings, app_id))
    conn.commit()
    
    print(f"[SUCCESS] Updated Monday.com Connector (ID: {app_id})")
    print(f"API Key: {NEW_API_KEY[:50]}...")
else:
    print("[ERROR] Monday app not found")

conn.close()

print("\n" + "="*60)
print("[FINAL STEP] Restart Backend")
print("="*60)
print("Ctrl+C then: uvicorn app.main:app --reload")
