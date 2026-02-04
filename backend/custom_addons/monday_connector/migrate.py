from sqlmodel import Session, text
from app.database import engine
from sqlalchemy.exc import ProgrammingError, OperationalError

def migrate_monday_schema():
    """
    Checks for missing columns in production database and adds them if needed.
    This is a lightweight "migration" strategy for CapRover deployments.
    """
    print("--- Checking Monday Connector Schema ---")
    with Session(engine) as session:
        try:
            # 1. Check monday_barcode_config for search_column_id
            print("Checking monday_barcode_config.search_column_id...")
            try:
                # Try to select the column. If it fails, it doesn't exist.
                # Use LIMIT 0 to avoid fetching data.
                session.exec(text("SELECT search_column_id FROM monday_barcode_config LIMIT 0"))
                print("Column 'search_column_id' exists.")
            except (ProgrammingError, OperationalError):
                print("Column 'search_column_id' MISSING. Adding it...")
                session.rollback() # Clear formatting error
                
                # Add the column
                # PostgreSQL formatting
                session.exec(text("ALTER TABLE monday_barcode_config ADD COLUMN search_column_id VARCHAR NULL"))
                session.commit()
                print("SUCCESS: Added 'search_column_id' to monday_barcode_config")

            # 2. Check sort_column_id
            print("Checking monday_barcode_config.sort_column_id...")
            try:
                session.exec(text("SELECT sort_column_id FROM monday_barcode_config LIMIT 0"))
                print("Column 'sort_column_id' exists.")
            except (ProgrammingError, OperationalError):
                print("Column 'sort_column_id' MISSING. Adding it...")
                session.rollback()
                session.exec(text("ALTER TABLE monday_barcode_config ADD COLUMN sort_column_id VARCHAR DEFAULT 'name'"))
                session.commit()
                print("SUCCESS: Added 'sort_column_id'")

            # 3. Check sort_direction
            print("Checking monday_barcode_config.sort_direction...")
            try:
                session.exec(text("SELECT sort_direction FROM monday_barcode_config LIMIT 0"))
                print("Column 'sort_direction' exists.")
            except (ProgrammingError, OperationalError):
                print("Column 'sort_direction' MISSING. Adding it...")
                session.rollback()
                session.exec(text("ALTER TABLE monday_barcode_config ADD COLUMN sort_direction VARCHAR DEFAULT 'asc'"))
                session.commit()
                print("SUCCESS: Added 'sort_direction'")
                
        except Exception as e:
            print(f"Schema Check Failed: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate_monday_schema()
