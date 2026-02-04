from sqlmodel import Session, select, text
from app.database import engine
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash
from app.models.company import Company
from app.models.hr import Employee
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department

def reset_users():
    with Session(engine) as session:
        print("--- Starting System Reset ---")
        
        # 1. Clear Dependent Data (HR/Structure) to avoid FK constraints
        print("Clearing organizational data...")
        # (Simplified wipe for speed, assuming cascade might fail or be incomplete)
        # Note: In a real prod env, we'd be more careful, but user asked for "remove all existing users"
        # and we need to ensure no lingering links.
        
        session.exec(text("DELETE FROM loginhistory"))
        session.exec(text("DELETE FROM employee"))
        session.exec(text("DELETE FROM user"))
        
        # Use raw SQL for speed/certainty on the user table reset
        session.commit()
        print("All users and employees deleted.")

        # 2. Create Fresh Super Admin
        print("Creating Super Admin (admin/admin)...")
        
        # Ensure a default company exists if not already (for the super admin to land on)
        company = session.exec(select(Company).where(Company.name == "Leisure World")).first()
        if not company:
            company = Company(name="Leisure World", domain="leisureworld.com", status="active")
            session.add(company)
            session.commit()
            session.refresh(company)
        
        super_admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin"),
            full_name="Super Administrator",
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            company_id=company.id # Link to default company
        )
        
        session.add(super_admin)
        session.commit()
        
        print(f"SUCCESS: Super Admin created. ID: {super_admin.id}")
        print("Username: admin")
        print("Password: admin")

if __name__ == "__main__":
    reset_users()
