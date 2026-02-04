from sqlmodel import Session, select
from app.database import engine
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Employee, Department, EmploymentType
from app.models.user import User
from app.core.security import verify_password

def check_admin():
    with Session(engine) as session:
        print("--- Checking Admin User ---")
        user = session.exec(select(User).where(User.username == "admin")).first()
        
        if user:
            print(f"User Found: {user.username} (ID: {user.id})")
            print(f"Status: {user.status}")
            print(f"Role: {user.role}")
            print(f"Company ID: {user.company_id}")
            print(f"Hashed Password: {user.hashed_password[:20]}...")
            
            is_valid = verify_password("admin", user.hashed_password)
            print(f"Password 'admin' Valid: {is_valid}")
        else:
            print("User 'admin' NOT FOUND")

if __name__ == "__main__":
    check_admin()
