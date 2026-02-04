import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from app.database import engine
# Import all models to ensure registry is populated
from app.models.company import Company
from app.models.user import User
from app.models.hr import Employee

def check():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        print(f"Total Users: {len(users)}")
        
        # Check breakdown
        for company in session.exec(select(Company)).all():
            u_count = len([u for u in users if u.company_id == company.id])
            print(f"  - {company.name}: {u_count} Users")

if __name__ == "__main__":
    check()
