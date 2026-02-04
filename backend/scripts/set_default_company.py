
import sqlite3
import os

db_path = "sql_app.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        print("Marking Company ID 1 as default...")
        cursor.execute("UPDATE company SET is_default = 1 WHERE id = 1")
        # Also set "Leisure World" to "My Company" as per previous requirement
        cursor.execute("UPDATE company SET name = 'My Company' WHERE id = 1 AND name = 'Leisure World'")
        conn.commit()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database {db_path} not found.")
