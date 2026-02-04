
import sqlite3
import os

db_path = "sql_app.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        print("Adding 'is_default' column to 'company' table...")
        cursor.execute("ALTER TABLE company ADD COLUMN is_default BOOLEAN DEFAULT 0")
        conn.commit()
        print("Success!")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'is_default' already exists.")
        else:
            print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database {db_path} not found.")
