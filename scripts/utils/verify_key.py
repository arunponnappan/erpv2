"""
Quick check: Is the backend using the new API key?
"""
import sqlite3
import json

conn = sqlite3.connect('backend/sql_app.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT ia.settings FROM installedapp ia
    JOIN marketplaceapp ma ON ia.app_id = ma.id
    WHERE ma.name LIKE '%monday%'
""")

result = cursor.fetchone()

if result:
    settings = json.loads(result[0])
    api_key = settings.get("api_key", "")
    
    print("Current API key in database:")
    print(f"{api_key[:50]}...")
    
    # Check if it's the latest one
    if api_key.startswith("eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1Ni"):
        print("\n✓ This is the LATEST working API key")
    else:
        print("\n✗ This is NOT the latest API key")
        print("Expected to start with: eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1Ni")
else:
    print("No Monday app found")

conn.close()

print("\n" + "="*60)
print("IMPORTANT: Backend must be restarted to use this key!")
print("="*60)
