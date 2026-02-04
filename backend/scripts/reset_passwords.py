from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.core.security import get_password_hash

def reset_all_passwords():
    print("Starting password reset for ALL users...")
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        count = 0
        new_hash = get_password_hash("admin123")
        
        for user in users:
            user.hashed_password = new_hash
            session.add(user)
            count += 1
            print(f"Resetting password for: {user.email}")
            
        session.commit()
        print(f"Successfully reset passwords for {count} users to 'admin123'.")

if __name__ == "__main__":
    reset_all_passwords()
