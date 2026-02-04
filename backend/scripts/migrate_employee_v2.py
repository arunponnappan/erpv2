
from sqlmodel import Session, select, create_engine, text
from app.models.hr import EmploymentType, Employee
import os

# Connect to the database
sqlite_url = "sqlite:///./sql_app.db"
engine = create_engine(sqlite_url)

def migrate():
    print("Starting Migration v2...")
    with Session(engine) as session:
        # 1. Create EmploymentType table if it doesn't exist
        print("Creating EmploymentType table...")
        session.exec(text("""
        CREATE TABLE IF NOT EXISTS employmenttype (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR NOT NULL UNIQUE,
            description VARCHAR
        )
        """))
        
        # 2. Add new columns to Employee table
        print("Adding new columns to Employee table...")
        new_columns = [
            ("middle_name", "VARCHAR"),
            ("date_of_birth", "DATE"),
            ("gender", "VARCHAR"),
            ("marital_status", "VARCHAR"),
            ("blood_group", "VARCHAR"),
            ("national_id_number", "VARCHAR"),
            ("profile_photo_url", "VARCHAR"),
            ("personal_email", "VARCHAR"),
            ("personal_phone", "VARCHAR"),
            ("address_line1", "VARCHAR"),
            ("address_city", "VARCHAR"),
            ("address_state", "VARCHAR"),
            ("address_country", "VARCHAR"),
            ("address_zip", "VARCHAR"),
            ("employment_type_id", "INTEGER REFERENCES employmenttype(id)"),
            ("reporting_manager_id", "INTEGER REFERENCES employee(id)"),
            ("emergency_contact_name", "VARCHAR"),
            ("emergency_contact_phone", "VARCHAR"),
            ("emergency_contact_relation", "VARCHAR")
        ]

        for col_name, col_type in new_columns:
            try:
                session.exec(text(f"ALTER TABLE employee ADD COLUMN {col_name} {col_type}"))
                print(f"Added column: {col_name}")
            except Exception as e:
                # Ignore if column likely exists (OperationalError)
                print(f"Skipping {col_name} (likely exists or error: {e})")

        session.commit()
    print("Migration v2 completed successfully.")

if __name__ == "__main__":
    migrate()
