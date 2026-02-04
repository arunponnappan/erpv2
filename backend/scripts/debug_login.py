
import sys
import os
import sqlite3
# Add backend to sys.path
sys.path.append(os.getcwd())

from app.core import security

def check_admin_user():
    db_path = "sql_app.db"
    print(f"Checking database at: {os.path.abspath(db_path)}")
    
    if not os.path.exists(db_path):
        print("❌ Database file 'sql_app.db' NOT FOUND.")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user';")
        if not cursor.fetchone():
             print("❌ Table 'user' NOT FOUND in database.")
             return

        cursor.execute("SELECT id, username, email, hashed_password, status, role FROM user WHERE email = ?", ("admin@example.com",))
        row = cursor.fetchone()
        
        if not row:
            print("❌ User 'admin@example.com' NOT FOUND in 'user' table.")
            # List all users
            print("Listing all users:")
            cursor.execute("SELECT id, email FROM user")
            for u in cursor.fetchall():
                print(f" - {u}")
            return

        user_id, username, email, hashed_password, status, role = row
        print(f"User found: ID={user_id}, Username={username}, Status={status}, Role={role}")
        
        # Verify Password
        password = "admin123"
        if security.verify_password(password, hashed_password):
            print("Password 'admin123' is CORRECT.")
        else:
            print("Password 'admin123' is INCORRECT.")
            # Try to hash 'admin123' to see what it should look like
            # print(f"Expected Hash for 'admin123': {security.get_password_hash(password)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_admin_user()
