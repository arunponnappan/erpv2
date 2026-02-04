from sqlmodel import Session, select
from app.database import engine
from app.models.hr import Department

def seed_departments():
    depts = ["Administration", "Sales", "Operations", "IT", "HR"]
    
    with Session(engine) as session:
        print("Checking departments...")
        for d_name in depts:
            existing = session.exec(select(Department).where(Department.name == d_name)).first()
            if not existing:
                dept = Department(name=d_name, description=f"{d_name} Department")
                session.add(dept)
                print(f"Created Department: {d_name}")
            else:
                print(f"Department exists: {d_name}")
        
        session.commit()
        print("Department seeding complete.")

if __name__ == "__main__":
    seed_departments()
