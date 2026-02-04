from sqlmodel import Session, select
from app.database import engine
from app.models.user import User, UserRole, UserStatus
# Import other models to ensure registry is populated
from app.models.company import Company
from app.models.hr import Employee
from app.models.org_structure import BusinessUnit
from app.core.security import get_password_hash

def reset_admin():
    with Session(engine) as session:
        # Find existing admin user by email or username
        statement = select(User).where((User.email == "admin@example.com") | (User.username == "admin"))
        user = session.exec(statement).first()
        
        if user:
            print(f"Found user: {user.email} (ID: {user.id})")
            print("Resetting credentials to admin/admin...")
            
            user.username = "admin"
            user.hashed_password = get_password_hash("admin")
            user.role = UserRole.SUPER_ADMIN
            user.status = UserStatus.ACTIVE
            
            session.add(user)
            session.commit()
            print("SUCCESS: Credentials reset.")
            print(" Login with -> Username: admin  |  Password: admin")
        else:
            print("Admin user not found! Creating new one...")
            # Create if missing
            new_user = User(
                email="admin@example.com",
                username="admin",
                full_name="Super Admin",
                hashed_password=get_password_hash("admin"),
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE
            )
            session.add(new_user)
            session.commit()
            print("SUCCESS: Created new admin user.")
            print(" Login with -> Username: admin  |  Password: admin")

if __name__ == "__main__":
    reset_admin()
