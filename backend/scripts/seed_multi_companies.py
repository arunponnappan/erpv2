import sys
import os
import random
from datetime import date

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, select
from app.database import engine
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department, EmploymentType, Employee
from app.models.user import User, UserRole, UserStatus
from app.core import security

def create_company_data(session, config):
    print(f"\n--- Checking Company: {config['name']} ---")
    
    # 1. Check if Company Exists
    company = session.exec(select(Company).where(Company.name == config['name'])).first()
    if company:
        print(f"Company {config['name']} already exists (ID: {company.id}). using existing.")
        cid = company.id
    else:
        company = Company(
            name=config['name'],
            domain=config['domain'],
            primary_color=config['color'],
            footer_text=f"© 2025 {config['name']}",
            logo_url=config['logo']
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        cid = company.id
        print(f"Created Company: {company.name} (ID: {cid})")
    
    # 2. Branches (Idempotent check by code)
    branches = []
    for b_data in config['branches']:
        existing_branch = session.exec(select(Branch).where(Branch.code == b_data['code'], Branch.company_id == cid)).first()
        if existing_branch:
            branches.append(existing_branch)
        else:
            b = Branch(**b_data, company_id=cid)
            session.add(b)
            branches.append(b)
    session.commit()
    for b in branches: session.refresh(b)
    
    # 3. Employment Types
    emp_types = []
    for name in ["Full-Time", "Contract", "Intern"]:
        existing = session.exec(select(EmploymentType).where(EmploymentType.name == name, EmploymentType.company_id == cid)).first()
        if existing:
            emp_types.append(existing)
        else:
            et = EmploymentType(name=name, company_id=cid)
            session.add(et)
            emp_types.append(et)
    session.commit()
    for et in emp_types: session.refresh(et)
    
    # 4. Designations
    designations = []
    for i, title in enumerate(["Junior", "Associate", "Senior", "Lead", "Manager", "Director", "VP", "CXO"], 1):
        existing = session.exec(select(Designation).where(Designation.title == title, Designation.company_id == cid)).first()
        if existing:
            designations.append(existing)
        else:
            d = Designation(title=title, level=i, company_id=cid)
            session.add(d)
            designations.append(d)
    session.commit()
    for d in designations: session.refresh(d)
    
    # 5. Departments & Job Roles
    departments = []
    job_roles_map = {}
    for d_name, roles in config['depts']:
        existing_dept = session.exec(select(Department).where(Department.name == d_name, Department.company_id == cid)).first()
        
        if existing_dept:
             dept = existing_dept
        else:
            dept = Department(name=d_name, company_id=cid)
            session.add(dept)
            session.commit()
            session.refresh(dept)
        
        departments.append(dept)
        
        dept_roles = []
        for r_name in roles:
            existing_role = session.exec(select(JobRole).where(JobRole.name == r_name, JobRole.department_id == dept.id)).first()
            if existing_role:
                dept_roles.append(existing_role)
            else:
                jr = JobRole(name=r_name, department_id=dept.id)
                session.add(jr)
                dept_roles.append(jr)
        session.commit()
        for jr in dept_roles: session.refresh(jr)
        job_roles_map[d_name] = dept_roles

    # 6. Employees & Users
    employees_created = 0
    
    names = [
        ("Alice", "Smith"), ("Bob", "Jones"), ("Charlie", "Brown"), ("Diana", "Prince"),
        ("Evan", "Wright"), ("Fiona", "Green"), ("George", "Black"), ("Hannah", "White")
    ]
    
    # Create an admin/manager for each department
    for dept in departments:
        fname, lname = random.choice(names)
        username = f"{fname.lower()}.{lname.lower()}.{cid}" # Unique username per company
        email = f"{fname.lower()}.{lname.lower()}@demo{cid}.com"
        
        # Check User
        existing_user = session.exec(select(User).where(User.username == username)).first()
        if existing_user:
            user = existing_user
        else:
            user = User(
                username=username,
                email=email,
                hashed_password=security.get_password_hash("password123"),
                full_name=f"{fname} {lname}",
                role=UserRole.MANAGER,
                status=UserStatus.ACTIVE,
                company_id=cid
            )
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # Check Employee
        existing_emp = session.exec(select(Employee).where(Employee.work_email == email)).first()
        if not existing_emp:
            # Pick a safe role ID
            dept_roles = job_roles_map[dept.name]
            role = dept_roles[-1] if dept_roles else None
            
            if role:
                emp = Employee(
                    first_name=fname, last_name=lname, work_email=email,
                    company_id=cid, branch_id=branches[0].id, department_id=dept.id,
                    designation_id=designations[-1].id, job_role_id=role.id,
                    employment_type_id=emp_types[0].id,
                    joining_date=date(2022, 1, 1),
                    user_id=user.id
                )
                session.add(emp)
                session.commit()
                employees_created += 1

    print(f"Ensured/Created {employees_created} new Employees with Users for {config['name']}")

def seed_multi():
    with Session(engine) as session:
        # Import select if not already
        from sqlmodel import select
        
        # Company A
        config_a = {
            "name": "TechFlow Systems",
            "domain": "techflow.io",
            "color": "#6366f1", # Indigo
            "logo": "",
            "branches": [
                {"name": "Tech HQ", "code": "TF-HQ", "branch_type": "hq"},
                {"name": "West Coast Hub", "code": "TF-WC", "branch_type": "regional"}
            ],
            "depts": [
                ("Engineering", ["Dev", "Lead Dev", "CTO"]),
                ("Sales", ["Rep", "Manager"])
            ]
        }
        create_company_data(session, config_a)
        
        # Company B
        config_b = {
            "name": "GreenLeaf Logistics",
            "domain": "greenleaf.net",
            "color": "#10b981", # Emerald
            "logo": "",
            "branches": [
                {"name": "Main Warehouse", "code": "GL-WH", "branch_type": "hq"},
                {"name": "Distribution Ctr", "code": "GL-DC", "branch_type": "warehouse"}
            ],
            "depts": [
                ("Operations", ["Handler", "Supervisor", "Ops Manager"]),
                ("Fleet", ["Driver", "Mechanic", "Fleet Mgr"])
            ]
        }
        create_company_data(session, config_b)

if __name__ == "__main__":
    seed_multi()
