import logging
from sqlmodel import Session, select
from app.database import engine
from app.models.company import Company
from app.models.user import User
from app.models.hr import Employee
from app.models.org_structure import BusinessUnit

def debug_delete():
    with Session(engine) as session:
        print("--- Debugging Company Deletion V2 ---")
        
        company = session.exec(select(Company).limit(1)).first()
        if not company:
            print("No companies found.")
            return

        print(f"Target: {company.name} ({company.id})")

        try:
            # 1. Unlink Users
            print("Unlinking Users...")
            users = session.exec(select(User).where(User.company_id == company.id)).all()
            for user in users:
                user.company_id = None
                session.add(user)
            session.commit()

            # 2. Break Self-Reference
            print("Nullifying Reporting Managers...")
            employees = session.exec(select(Employee).where(Employee.company_id == company.id)).all()
            for emp in employees:
                emp.reporting_manager_id = None
                session.add(emp)
            session.commit()

            # 3. Delete Employees
            print("Deleting Employees...")
            employees = session.exec(select(Employee).where(Employee.company_id == company.id)).all()
            for emp in employees:
                session.delete(emp)
            session.commit()
            
            # 4. Delete BUs
            print("Deleting Business Units...")
            bus = session.exec(select(BusinessUnit).where(BusinessUnit.company_id == company.id)).all()
            for bu in bus:
                session.delete(bu)
            session.commit()

            # 5. Delete Company
            print("Deleting Company...")
            session.delete(company)
            session.commit()
            print("SUCCESS: Company deleted!")
            
        except Exception as e:
            print(f"ERROR: {e}")
            session.rollback()

if __name__ == "__main__":
    debug_delete()
