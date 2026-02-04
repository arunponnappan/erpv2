
import sqlite3
import os

# Connect to the database
# Try multiple paths to find the DB
db_paths = ["app/sql_app.db", "sql_app.db", "backend/app/sql_app.db"]
db_path = None
for p in db_paths:
    if os.path.exists(p):
        db_path = p
        break

if not db_path:
    # If not found, create in app/sql_app.db or similar
    print("Database not found. Checked: ", db_paths)
    db_path = "app/sql_app.db" # Default fallback

print(f"Targeting database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Add username column
    # SQLite 3.35.0+ allows multiple ADD COLUMN in ALTER TABLE? No, usually one by one.
    # We'll just add it nullable first, update data, then make it NOT NULL (requires recreation in SQLite typically, 
    # but for now we create it nullable and enforce in app code).
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(user);")
    columns = cursor.fetchall()
    col_names = [c[1] for c in columns]
    
    if 'username' not in col_names:
        print("Adding 'username' column...")
        cursor.execute("ALTER TABLE user ADD COLUMN username VARCHAR;")
        
        # 2. Backfill username with email
        print("Backfilling usernames from emails...")
        cursor.execute("UPDATE user SET username = email WHERE username IS NULL;")
        
        # 3. Create Unique Index
        print("Creating unique index on username...")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_username ON user (username);")
        
        print("Migration successful.")
    else:
        print("'username' column already exists.")

    conn.commit()
    conn.close()

except Exception as e:
    print(f"Error during migration: {e}")
