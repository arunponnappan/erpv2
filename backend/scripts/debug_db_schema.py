from sqlmodel import Session, select
from app.db.engine import engine
from app.models.user import User

def check_schema():
    print("Checking User table schema...")
    try:
        with Session(engine) as session:
            # Attempt to select one user. If column is missing, this should fail.
            user = session.exec(select(User)).first()
            print(f"Successfully queried user: {user.username if user else 'No users found, but query worked'}")
            if user:
                print(f"User company_id: {user.company_id}")
    except Exception as e:
        print(f"Schema Error: {e}")

if __name__ == "__main__":
    check_schema()
