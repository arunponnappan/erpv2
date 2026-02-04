from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.company import Company
from app.models.hr import Employee, Department
from app.models.org_structure import Branch, JobRole, Designation

def list_demo_users():
    with Session(engine) as session:
        # Get Company 2
        print("--- TechFlow (ID 2) Users ---")
        users_2 = session.exec(select(User).where(User.company_id == 2)).all()
        for u in users_2:
            print(f"User: {u.username} | Email: {u.email} | Role: {u.role}")

        # Get Company 3
        print("\n--- GreenLeaf (ID 3) Users ---")
        users_3 = session.exec(select(User).where(User.company_id == 3)).all()
        for u in users_3:
            print(f"User: {u.username} | Email: {u.email} | Role: {u.role}")

if __name__ == "__main__":
    list_demo_users()
