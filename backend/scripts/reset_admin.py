from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.company import Company
try:
    from addons.employees.models import Employee
except ImportError:
    pass
from app.models.org_structure import Branch, Designation, JobRole
from app.models.marketplace import MarketplaceApp, InstalledApp
from app.models.rbac import Role
from app.core.security import get_password_hash, verify_password

def reset_password():
    with Session(engine) as session:
        email = "admin@example.com"
        password = "admin123"
        print(f"Resetting password for {email} to '{password}'...")
        
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user.hashed_password = get_password_hash(password)
            session.add(user)
            session.commit()
            print("Password updated successfully.")
            
            # Verify
            session.refresh(user)
            if verify_password(password, user.hashed_password):
                 print("Verification: Password matches.")
            else:
                 print("Verification: FAILED.")
        else:
            print(f"User {email} not found! Creating...")
            # Create if missing (simplified, might fail if company missing)
            try:
                from app.models.user import UserRole, UserStatus
                user = User(
                    email=email,
                    hashed_password=get_password_hash(password),
                    username="admin",
                    role=UserRole.SUPER_ADMIN,
                    full_name="Rescue Admin",
                    status=UserStatus.ACTIVE,
                    company_id=1 # Assumption
                )
                session.add(user)
                session.commit()
                print("User created.")
            except Exception as e:
                print(f"Failed to create user: {e}")

if __name__ == "__main__":
    reset_password()
