import sys
import os

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, func
from app.database import engine

# Import ALL models to ensure registry is populated
try:
    from app.models.user import User
    from app.models.company import Company
    from app.models.org_structure import Branch, Designation, JobRole
    from app.models.hr import Employee, Department, EmploymentType
except ImportError as e:
    print(f"Import Error: {e}")

def verify():
    print("Verifying data...")
    try:
        with Session(engine) as session:
            count = session.exec(select(func.count(User.id))).one()
            print(f"Total Users: {count}")
            
            users = session.exec(select(User)).all()
            by_company = {}
            for u in users:
                cid = u.company_id or "Global"
                by_company[cid] = by_company.get(cid, 0) + 1
                
            print("Users per Company:")
            for cid, cnt in by_company.items():
                print(f"  Company {cid}: {cnt}")
            
            # Simple consistency check
            # We expect ~30 users per company from our seed logic
            
            emp_count = session.exec(select(func.count(Employee.id))).one()
            print(f"Total Employees: {emp_count}")

    except Exception as e:
        print(f"Verification Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify()
