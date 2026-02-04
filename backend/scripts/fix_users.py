import sys, os, random
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from sqlmodel import Session, select
from app.database import engine
# Correctly import models based on definitions
try:
    from app.models.rbac import Role
    from app.models.user import User, UserRole, UserStatus
    from app.models.company import Company
    from app.models.org_structure import Branch, Designation, JobRole
    from app.models.hr import Employee, Department, EmploymentType
    from app.core import security
except ImportError as e:
    print(f"Import Error: {e}")

def fix():
    print("Starting fix_users.py...", flush=True)
    with Session(engine) as session:
        companies = session.exec(select(Company)).all()
        for company in companies:
            print(f"Checking {company.name} (ID: {company.id})...", flush=True)
            emps = session.exec(select(Employee).where(Employee.company_id == company.id)).all()
            portal_users = [e for e in emps if e.user_id]
            print(f"  - Employees: {len(emps)}", flush=True)
            print(f"  - Portal Users: {len(portal_users)}", flush=True)
            
            needed = 30 - len(portal_users)
            if needed > 0:
                print(f"  - Creating {needed} users...", flush=True)
                candidates = [e for e in emps if not e.user_id]
                random.shuffle(candidates)
                params = candidates[:needed]
                
                count = 0
                for i, emp in enumerate(params):
                    role = UserRole.MANAGER
                    if len(portal_users) + i < 3: 
                        role = UserRole.ADMIN
                    
                    try:
                        uname = f"{emp.first_name.lower()}.{emp.last_name.lower()}.{company.id}.{random.randint(100,999)}"
                        user = User(
                             username=uname,
                             email=emp.work_email,
                             hashed_password=security.get_password_hash("password123"),
                             full_name=f"{emp.first_name} {emp.last_name}",
                             role=role,
                             status=UserStatus.ACTIVE,
                             company_id=company.id
                        )
                        session.add(user)
                        session.commit()
                        session.refresh(user)
                        
                        emp.user_id = user.id
                        session.add(emp)
                        session.commit()
                        count += 1
                    except Exception as e:
                        print(f"    ! Failed {emp.first_name}: {e}", flush=True)
                        session.rollback()
                print(f"  - Successfully created {count} users.", flush=True)
            else:
                 print("  - Count OK.", flush=True)

if __name__ == "__main__":
    fix()
