
import sqlite3
import os

DB_FILE = "sql_app.db"

def add_column():
    if not os.path.exists(DB_FILE):
        print(f"Error: {DB_FILE} not found.")
        return

    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        print("Adding search_column_id column to monday_barcode_config...")
        cursor.execute("ALTER TABLE monday_barcode_config ADD COLUMN search_column_id TEXT")
        conn.commit()
        print("Success! Column added.")
        
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'search_column_id' already exists.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_column()
