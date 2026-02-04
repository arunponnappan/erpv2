import sys
import os
import random
from datetime import date, timedelta

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from app.database import engine
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department, EmploymentType, Employee
from app.models.user import User

def create_sample_company():
    with Session(engine) as session:
        print("--- Starting Sample Company Seeding ---")

        # 1. Create Company
        company = Company(
            name="Global Tech Solutions",
            domain="globaltech.example.com",
            primary_color="#0ea5e9", # Sky Blue
            footer_text="© 2025 Global Tech Solutions Ltd.",
            logo_url="https://ui-avatars.com/api/?name=Global+Tech&background=0ea5e9&color=fff&size=128"
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        cid = company.id
        print(f"Created Company: {company.name} (ID: {cid})")

        # 2. Create Branches
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
        print(f"Created {len(branches)} Branches")

        # 3. Create Employment Types
        emp_types_data = ["Full-Time", "Part-Time", "Contractor", "Intern"]
        emp_types = []
        for name in emp_types_data:
            et = EmploymentType(name=name, company_id=cid)
            session.add(et)
            emp_types.append(et)
        session.commit()
        for et in emp_types: session.refresh(et)

        # 4. Create Designations (Levels)
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
        
        # Helper to get designation by approximate level
        def get_desig(level):
            # find closest level
            return min(designations, key=lambda x: abs(x.level - level))

        # 5. Create Departments & Job Roles
        depts_data = [
            ("Engineering", ["Software Engineer", "DevOps Engineer", "QA Engineer", "Engineering Manager", "CTO"]),
            ("Human Resources", ["HR Specialist", "Recruiter", "HR Manager", "VPHR"]),
            ("Sales", ["Sales Representative", "Account Executive", "Sales Manager", "Director of Sales"]),
            ("Marketing", ["Content Writer", "SEO Specialist", "Marketing Manager"]),
            ("Finance", ["Accountant", "Financial Analyst", "Finance Manager", "CFO"]),
        ]
        
        departments = []
        job_roles_map = {} # dept.name -> list of JobRole objects

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
            
        print(f"Created {len(departments)} Departments and Job Roles")

        # 6. Generate Employees
        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

        # Track managers to assign reporting lines
        managers = [] 
        
        employees_created = 0

        # Create Execs first (so they can be managers)
        for dept in departments:
            # Pick a high ranking role
            roles = job_roles_map[dept.name]
            manager_role = next((r for r in roles if "Manager" in r.name or "Director" in r.name or "VH" in r.name or "CFO" in r.name or "CTO" in r.name), roles[0])
            
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            
            emp = Employee(
                first_name=fname,
                last_name=lname,
                work_email=f"{fname.lower()}.{lname.lower()}@globaltech.example.com",
                company_id=cid,
                branch_id=random.choice(branches).id,
                department_id=dept.id,
                designation_id=get_desig(8).id, # Senior level
                job_role_id=manager_role.id,
                employment_type_id=emp_types[0].id, # Full Time
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

        # Create Staff
        for i in range(40): # 40 staff members
            dept = random.choice(departments)
            roles = job_roles_map[dept.name]
            role = random.choice(roles)
            branch = random.choice(branches)
            
            # Try to find manager in same dept
            manager = next((m for m in managers if m.department_id == dept.id), random.choice(managers))
            
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            
            # Randomize level based on role name
            level = 4
            if "Senior" in role.name: level = 6
            elif "Junior" in role.name: level = 3
            elif "Intern" in role.name: level = 1
            
            desig = get_desig(level)
            etype = emp_types[0] if level > 2 else emp_types[2] # Intern/Trainee might be contract
            
            emp = Employee(
                first_name=fname,
                last_name=lname,
                work_email=f"{fname.lower()}.{lname.lower()}{i}@globaltech.example.com", # simple unique email
                company_id=cid,
                branch_id=branch.id,
                department_id=dept.id,
                designation_id=desig.id,
                job_role_id=role.id,
                employment_type_id=etype.id,
                reporting_manager_id=manager.id,
                joining_date=date(2023, random.randint(1,12), random.randint(1,28)),
                address_city=branch.name.split()[0], # crude city guess
                address_country="USA" if "HQ" in branch.name else "UK" if "London" in branch.name else "Singapore"
            )
            session.add(emp)
            employees_created += 1
            
        session.commit()
        print(f"Created {employees_created} Employees")
        print("--- Seeding Complete ---")

if __name__ == "__main__":
    create_sample_company()
