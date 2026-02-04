from app.database import engine
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.hr import Employee, Department, EmploymentType
from app.models.org_structure import Branch, JobRole, Designation

def make_super_admin_global():
    with Session(engine) as session:
        statement = select(User).where(User.role == UserRole.SUPER_ADMIN)
        admins = session.exec(statement).all()
        print(f"Found {len(admins)} Super Admins.")
        for admin in admins:
            print(f"Updating {admin.username} to Global (company_id=None)...")
            admin.company_id = None
            session.add(admin)
        session.commit()
        print("Done.")

if __name__ == "__main__":
    make_super_admin_global()
