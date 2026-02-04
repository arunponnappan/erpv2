
import sys
import os
import random
from datetime import date

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select, text
from app.database import engine
from app.core.security import get_password_hash
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department, EmploymentType, Employee
from app.models.user import User, UserRole, UserStatus
from app.models.user import LoginHistory

def reseed_system():
    with Session(engine) as session:
        print("--- STARTING FULL SYSTEM RESET & RESEED ---")
        
        # 1. WIPE ALL DATA
        print("Step 1: Wiping all data...")
        # Order matters for Foreign Keys
        session.exec(text("DELETE FROM loginhistory"))
        session.exec(text("DELETE FROM employee"))
        session.exec(text("DELETE FROM user"))
        session.exec(text("DELETE FROM jobrole"))
        session.exec(text("DELETE FROM designation"))
        session.exec(text("DELETE FROM department"))
        session.exec(text("DELETE FROM branch"))
        session.exec(text("DELETE FROM employmenttype"))
        session.exec(text("DELETE FROM company"))
        session.commit()
        print("Database cleared.")

        # 2. CREATE SUPER ADMIN COMPANY & USER
        print("Step 2: Creating Admin Environment...")
        admin_company = Company(
            name="My Company", 
            domain="example.com", 
            primary_color="#4f46e5",
            footer_text="© 2025 My Company",
            is_default=True
        )
        session.add(admin_company)
        session.commit()
        session.refresh(admin_company)
        
        super_admin = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin"),
            full_name="Super Administrator",
            role=UserRole.SUPER_ADMIN,
            status=UserStatus.ACTIVE,
            company_id=admin_company.id
        )
        session.add(super_admin)
        session.commit()
        print(f"Super Admin created (admin/admin) in company '{admin_company.name}'")

        # 3. SEED SAMPLE COMPANY (Global Tech)
        print("Step 3: Seeding Sample Company (Global Tech)...")
        
        # Company
        gt_company = Company(
            name="Global Tech Solutions",
            domain="globaltech.example.com",
            primary_color="#0ea5e9", # Sky Blue
            footer_text="© 2025 Global Tech Solutions Ltd.",
            logo_url="https://ui-avatars.com/api/?name=Global+Tech&background=0ea5e9&color=fff&size=128"
        )
        session.add(gt_company)
        session.commit()
        session.refresh(gt_company)
        cid = gt_company.id

        # Branches
        branches_data = [
            {"name": "Global HQ", "code": "HQ-NY", "branch_type": "hq"},
            {"name": "London Office", "code": "LDN-01", "branch_type": "regional"},
            {"name": "Singapore Hub", "code": "SGP-01", "branch_type": "regional"},
        ]
        branches = []
        for b_data in branches_data:
            branch = Branch(**b_data, company_id=cid)
            session.add(branch)
            branches.append(branch)
        session.commit()
        for b in branches: session.refresh(b)

        # Employment Types
        emp_types_names = ["Full-Time", "Part-Time", "Contractor", "Intern"]
        emp_types = []
        for name in emp_types_names:
            et = EmploymentType(name=name, company_id=cid)
            session.add(et)
            emp_types.append(et)
        session.commit()
        for et in emp_types: session.refresh(et)

        # Designations
        designations_data = [
            {"title": "C-Level Exec", "level": 10},
            {"title": "Director", "level": 9},
            {"title": "Senior Manager", "level": 8},
            {"title": "Manager", "level": 7},
            {"title": "Team Lead", "level": 6},
            {"title": "Senior Associate", "level": 5},
            {"title": "Associate", "level": 4},
            {"title": "Junior Associate", "level": 3},
            {"title": "Trainee", "level": 2},
            {"title": "Intern", "level": 1},
        ]
        designations = []
        for d_data in designations_data:
            d = Designation(**d_data, company_id=cid)
            session.add(d)
            designations.append(d)
        session.commit()
        for d in designations: session.refresh(d)
        
        def get_desig(level):
            return min(designations, key=lambda x: abs(x.level - level))

        # Departments & Job Roles
        depts_data = [
            ("Engineering", ["Software Engineer", "DevOps Engineer", "QA Engineer", "Engineering Manager", "CTO"]),
            ("Human Resources", ["HR Specialist", "Recruiter", "HR Manager", "VPHR"]),
            ("Sales", ["Sales Representative", "Account Executive", "Sales Manager", "Director of Sales"]),
            ("Marketing", ["Content Writer", "SEO Specialist", "Marketing Manager"]),
            ("Finance", ["Accountant", "Financial Analyst", "Finance Manager", "CFO"]),
        ]
        
        departments = []
        job_roles_map = {} 

        for dept_name, roles in depts_data:
            dept = Department(name=dept_name, company_id=cid)
            session.add(dept)
            session.commit()
            session.refresh(dept)
            departments.append(dept)
            
            dept_roles = []
            for role_name in roles:
                job = JobRole(name=role_name, department_id=dept.id)
                session.add(job)
                dept_roles.append(job)
            session.commit()
            for j in dept_roles: session.refresh(j)
            job_roles_map[dept_name] = dept_roles

        # Employees
        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

        managers = [] 
        employees_created = 0

        # Create Execs/Managers
        for dept in departments:
            roles = job_roles_map[dept.name]
            manager_role = next((r for r in roles if "Manager" in r.name or "Director" in r.name or "CFO" in r.name or "CTO" in r.name), roles[0])
            
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            
            emp = Employee(
                first_name=fname,
                last_name=lname,
                work_email=f"{fname.lower()}.{lname.lower()}@globaltech.example.com",
                company_id=cid,
                branch_id=random.choice(branches).id,
                department_id=dept.id,
                designation_id=get_desig(8).id,
                job_role_id=manager_role.id,
                employment_type_id=emp_types[0].id,
                joining_date=date(2020, 1, 1),
                address_line1="123 Corporate Blvd",
                address_city="New York",
                address_country="USA",
                mobile_phone=f"555-01{random.randint(10,99)}"
            )
            session.add(emp)
            session.commit()
            session.refresh(emp)
            managers.append(emp)
            employees_created += 1

        # Create Staff (50 more)
        for i in range(50): 
            dept = random.choice(departments)
            roles = job_roles_map[dept.name]
            role = random.choice(roles)
            branch = random.choice(branches)
            
            manager = next((m for m in managers if m.department_id == dept.id), random.choice(managers))
            
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            
            level = 4
            if "Senior" in role.name: level = 6
            elif "Junior" in role.name: level = 3
            elif "Intern" in role.name: level = 1
            
            desig = get_desig(level)
            etype = emp_types[0] if level > 2 else emp_types[2] 
            
            emp = Employee(
                first_name=fname,
                last_name=lname,
                work_email=f"{fname.lower()}.{lname.lower()}{i}@globaltech.example.com",
                company_id=cid,
                branch_id=branch.id,
                department_id=dept.id,
                designation_id=desig.id,
                job_role_id=role.id,
                employment_type_id=etype.id,
                reporting_manager_id=manager.id,
                joining_date=date(2023, random.randint(1,12), random.randint(1,28)),
                address_city=branch.name.split()[0],
                address_country="USA" if "HQ" in branch.name else "UK" if "London" in branch.name else "Singapore"
            )
            session.add(emp)
            employees_created += 1
            
        session.commit()
        print(f"Created {employees_created} Employees in 'Global Tech Solutions'")
        print("--- RESEED COMPLETE ---")

if __name__ == "__main__":
    reseed_system()
