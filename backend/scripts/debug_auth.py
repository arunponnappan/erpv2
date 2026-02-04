from sqlmodel import Session, select
from app.database import engine
# Import all models to ensure relationships are registered
from app.models.user import User
from app.models.company import Company
from app.models.hr import Employee, Department
from app.models.org_structure import Branch, Designation, JobRole
from app.models.marketplace import MarketplaceApp, InstalledApp
from app.models.rbac import Role, Permission, RolePermission
from app.core.security import get_password_hash, verify_password

def debug_auth():
    with Session(engine) as session:
        print("Checking for user 'admin'...")
        user = session.exec(select(User).where(User.username == "admin")).first()
        
        if user:
            print(f"User found: ID={user.id}, Email={user.email}, Status={user.status}")
            
            # Verify current password
            is_valid = verify_password("admin123", user.hashed_password)
            print(f"Is password 'admin123' valid? {is_valid}")
            
            if not is_valid:
                print("Resetting password to 'admin123'...")
                user.hashed_password = get_password_hash("admin123")
                session.add(user)
                session.commit()
                print("Password reset successful.")
        else:
            print("User 'admin' NOT found!")
            
if __name__ == "__main__":
    debug_auth()
