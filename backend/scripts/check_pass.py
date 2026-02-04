import sqlite3
import os

DB_FILE = "sql_app.db"

def check_passwords():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found!")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    print("--- User Passwords (first 50 chars) ---")
    try:
        cursor.execute("SELECT email, hashed_password FROM user")
        rows = cursor.fetchall()
        for email, pwd in rows:
            print(f"{email}: {pwd[:50]}...")
            
    except Exception as e:
        print(f"Error: {e}")

    conn.close()

if __name__ == "__main__":
    check_passwords()
