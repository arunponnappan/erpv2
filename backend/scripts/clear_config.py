from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department, Employee

def clear_config():
    with Session(engine) as session:
        print("Starting configuration wipe...")

        # 1. Unlink Users from Companies (to prevent FK errors since cascade is off for Users)
        print("Unlinking users from companies...")
        users = session.exec(select(User)).all()
        for u in users:
            u.company_id = None
            session.add(u)
        session.commit()

        # 2. Delete Organizational Data (Child tables first, though cascade should handle it from Company)
        # However, manual deletion is safer/clearer.
        
        print("Deleting Employees...")
        session.exec(select(Employee)).all() # Check
        # Using specific delete statements or just deleting companies if cascade works.
        # Since we set cascade="all, delete-orphan" on Company->BusinessUnits/Employees, 
        # deleting Company *should* allow everything to wipe.
        
        # But let's be explicit to be sure everything is gone.

        

        
        print("Deleting JobRoles...")
        for x in session.exec(select(JobRole)).all(): session.delete(x)

        print("Deleting Designations...")
        for x in session.exec(select(Designation)).all(): session.delete(x)

        print("Deleting Employees...")
        for x in session.exec(select(Employee)).all(): session.delete(x)

        print("Deleting Departments...")
        for x in session.exec(select(Department)).all(): session.delete(x)

        print("Deleting Branches...")
        for x in session.exec(select(Branch)).all(): session.delete(x)

        print("Deleting Companies...")
        for x in session.exec(select(Company)).all(): session.delete(x)

        session.commit()
        print("SUCCESS: Configuration data cleared. Admin user preserved.")

if __name__ == "__main__":
    clear_config()
