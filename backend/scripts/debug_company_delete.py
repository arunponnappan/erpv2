import logging
from sqlmodel import Session, select
from app.db.engine import engine
from app.models.company import Company
from app.models.user import User
from app.models.hr import Employee
from sqlalchemy.exc import IntegrityError

# Configure logging to see SQL statements if needed
# logging.basicConfig()
# logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

def debug_delete():
    with Session(engine) as session:
        print("--- Debugging Company Deletion ---")
        
        # 1. Choose a company to delete (or create a dummy one)
        company = session.exec(select(Company).limit(1)).first()
        if not company:
            print("No companies found to test deletion.")
            return

        print(f"Attempting to delete Company: {company.name} (ID: {company.id})")

        try:
            # 2. Replicate the manual cleanup logic I added to the API
            print("Unlinking Users...")
            users = session.exec(select(User).where(User.company_id == company.id)).all()
            for user in users:
                user.company_id = None
                session.add(user)
            
            print("Deleting Employees...")
            employees = session.exec(select(Employee).where(Employee.company_id == company.id)).all()
            for emp in employees:
                session.delete(emp)
                
            session.commit()
            print("Prerequisites cleared. Deleting Company...")
            
            # 3. Attempt Delete
            session.delete(company)
            session.commit()
            print("SUCCESS: Company deleted!")
            
        except IntegrityError as e:
            print("\n!!! INTEGRITY ERROR !!!")
            print(f"Original Exception: {e.orig}")
            print(f"Details: {e}")
            session.rollback()
        except Exception as e:
            print(f"\n!!! UNEXPECTED ERROR: {e}")
            session.rollback()

if __name__ == "__main__":
    debug_delete()
