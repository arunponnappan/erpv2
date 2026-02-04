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
from app.models.user import User, UserRole, UserStatus
from app.core import security

def create_company_data(session, config):
    print(f"\n--- Processing Company: {config['name']} ---")
    
    # 1. Company
    company = session.exec(select(Company).where(Company.name == config['name'])).first()
    if not company:
        company = Company(
            name=config['name'],
            domain=config['domain'],
            primary_color=config['color'],
            footer_text=f"© 2025 {config['name']}",
            logo_url=config.get('logo')
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        print(f"Created Company: {company.name} (ID: {company.id})")
    else:
        print(f"Using existing Company: {company.name} (ID: {company.id})")
    
    cid = company.id

    # 2. Branches
    branches = []
    for b_data in config['branches']:
        existing = session.exec(select(Branch).where(Branch.code == b_data['code'], Branch.company_id == cid)).first()
        if not existing:
            b = Branch(**b_data, company_id=cid)
            session.add(b)
            branches.append(b)
        else:
            branches.append(existing)
    session.commit()
    for b in branches: session.refresh(b)

    # 3. Employment Types
    emp_types = []
    for name in ["Full-Time", "Part-Time", "Contract"]:
        existing = session.exec(select(EmploymentType).where(EmploymentType.name == name, EmploymentType.company_id == cid)).first()
        if not existing:
            et = EmploymentType(name=name, company_id=cid)
            session.add(et)
            emp_types.append(et)
        else:
            emp_types.append(existing)
    session.commit()
    for et in emp_types: session.refresh(et)

    # 4. Designations
    designations = []
    titles = ["Intern", "Associate", "Senior Associate", "Lead", "Manager", "Director", "VP", "CXO"]
    for i, title in enumerate(titles, 1):
        existing = session.exec(select(Designation).where(Designation.title == title, Designation.company_id == cid)).first()
        if not existing:
            d = Designation(title=title, level=i, company_id=cid)
            session.add(d)
            designations.append(d)
        else:
            designations.append(existing)
    session.commit()
    for d in designations: session.refresh(d)

    # 5. Departments & Job Roles
    departments = []
    job_roles_map = {}
    for d_name, roles in config['depts']:
        dept = session.exec(select(Department).where(Department.name == d_name, Department.company_id == cid)).first()
        if not dept:
            dept = Department(name=d_name, company_id=cid)
            session.add(dept)
            session.commit()
            session.refresh(dept)
        
        departments.append(dept)
        
        dept_roles = []
        for r_name in roles:
            role = session.exec(select(JobRole).where(JobRole.name == r_name, JobRole.department_id == dept.id)).first()
            if not role:
                role = JobRole(name=r_name, department_id=dept.id)
                session.add(role)
                dept_roles.append(role)
            else:
                dept_roles.append(role)
        session.commit()
        for r in dept_roles: session.refresh(r)
        job_roles_map[d_name] = dept_roles

    # --- 6. Large Scale Employee Generation ---
    
    # Configuration
    TARGET_EMPLOYEES = 300
    TARGET_PORTAL_USERS = 30
    TARGET_ADMINS = 3
    
    # Check existing state
    current_employees = session.exec(select(Employee).where(Employee.company_id == cid)).all()
    current_emp_count = len(current_employees)
    
    # Count existing portal users
    current_portal_users = len([e for e in current_employees if e.user_id])
    
    # Count existing admins (approximate check by user role if loaded, else skip strict check for now)
    # valid_admins = session.exec(select(User).where(User.company_id == cid, User.role == UserRole.ADMIN)).all()
    # current_admins = len(valid_admins)
    
    needed_employees = max(0, TARGET_EMPLOYEES - current_emp_count)
    needed_portal = max(0, TARGET_PORTAL_USERS - current_portal_users)
    
    print(f"Status for {config['name']}: {current_emp_count} Emp, {current_portal_users} Users.")
    
    # --- PHASE 1: Backfill Portal Users (Promote Existing) ---
    if needed_portal > 0 and current_emp_count > 0:
        print(f"  - Need {needed_portal} more portal users. Promoting existing employees...")
        candidates = [e for e in current_employees if not e.user_id]
        random.shuffle(candidates)
        
        promoted_count = 0
        for emp in candidates:
            if promoted_count >= needed_portal:
                break
                
            # Determine Role (Simple distribution: First 3 are admins if we need them, rest Managers)
            # Since we don't track exact admin count perfectly here, we'll just add some admins if we are promoting a batch
            if promoted_count < 3: 
                u_role = UserRole.ADMIN
            else:
                u_role = UserRole.MANAGER
                
            # Create User
            username = f"{emp.first_name.lower()}.{emp.last_name.lower()}.{cid}.{random.randint(1000,9999)}"
            user = User(
                username=username,
                email=emp.work_email, # Reuse work email
                hashed_password=security.get_password_hash("password123"),
                full_name=f"{emp.first_name} {emp.last_name}",
                role=u_role,
                status=UserStatus.ACTIVE,
                company_id=cid
            )
            session.add(user)
            try:
                session.commit()
                session.refresh(user)
                
                # Link to Employee
                emp.user_id = user.id
                session.add(emp)
                session.commit()
                promoted_count += 1
            except Exception as e:
                session.rollback()
                print(f"Failed to promote {emp.first_name}: {e}")

        print(f"  - Promoted {promoted_count} employees to users.")
        # Recalculate needed employees (promotion doesn't add employees)
        # Recalculate needed portal (should be 0 or less now)
        needed_portal -= promoted_count

    # --- PHASE 2: Generate New Employees ---
    if needed_employees > 0:
        print(f"  - Generating {needed_employees} new employees...")
        
        # Access Distribution List for NEW employees
        # Any remaining portal needs?
        access_plan = []
        for _ in range(needed_portal): # If we still need some
             access_plan.append("MANAGER") 
        
        # Fill rest with NONE
        remaining_slots = needed_employees - len(access_plan)
        for _ in range(remaining_slots):
             access_plan.append("NONE")
            
        random.shuffle(access_plan)
        
        # Name pools (Extended)
        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", 
                       "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
                       "Daniel", "Lisa", "Matthew", "Nancy", "Anthony", "Betty", "Mark", "Helen", "Donald", "Sandra",
                       "Steven", "Donna", "Paul", "Carol", "Andrew", "Ruth", "Joshua", "Sharon", "Kenneth", "Michelle",
                       "Kevin", "Laura", "Brian", "Sarah", "George", "Kimberly", "Edward", "Deborah", "Ronald", "Jessica",
                       "Timothy", "Cynthia", "Jason", "Angela", "Jeffrey", "Melissa", "Ryan", "Brenda", "Jacob", "Amy"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                      "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
                      "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
                      "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
                      "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
                      "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Stewart", "Sanchez"]

        generated_count = 0
        
        for access_type in access_plan:
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            
            # Unique email generator
            base_email = f"{fname.lower()}.{lname.lower()}"
            email = f"{base_email}@{config['domain']}"
            username = f"{base_email}.{cid}"
            
            # Simple uniqueness check: add number if needed (up to 10 tries)
            retry = 0
            while retry < 10:
                 if retry > 0:
                     suffix = random.randint(100, 999)
                     email = f"{base_email}{suffix}@{config['domain']}"
                     username = f"{base_email}{suffix}.{cid}"
                     
                 exists = session.exec(select(Employee).where(Employee.work_email == email)).first()
                 if not exists:
                     break
                 retry += 1
            
            if retry == 10:
                continue

            # Random Dept & Role
            dept = random.choice(departments)
            roles = job_roles_map[dept.name]
            job_role = random.choice(roles)
            
            if "Manager" in job_role.name or "Director" in job_role.name or "Head" in job_role.name:
                 desig = next((d for d in designations if d.title in ["Manager", "Director"]), designations[4])
            else:
                 desig = random.choice(designations[:4])

            # Create User if needed
            user = None
            if access_type != "NONE":
                if access_type == "ADMIN":
                    u_role = UserRole.ADMIN
                    desig = designations[-1] # CXO/VP
                else:
                    u_role = random.choice([UserRole.MANAGER, UserRole.SUPERVISOR])
                
                user = User(
                    username=username,
                    email=email,
                    hashed_password=security.get_password_hash("password123"),
                    full_name=f"{fname} {lname}",
                    role=u_role,
                    status=UserStatus.ACTIVE,
                    company_id=cid
                )
                session.add(user)
                try:
                    session.commit()
                    session.refresh(user)
                except Exception:
                    session.rollback()
                    user = None
            
            # Create Employee
            emp = Employee(
                first_name=fname,
                last_name=lname,
                work_email=email,
                company_id=cid,
                branch_id=random.choice(branches).id,
                department_id=dept.id,
                job_role_id=job_role.id,
                designation_id=desig.id,
                employment_type_id=random.choice(emp_types).id,
                joining_date=date.today() - timedelta(days=random.randint(0, 1000)),
                employee_id=f"EMP-{cid}-{1000+current_emp_count+generated_count+1}",
                user_id=user.id if user else None
            )
            
            session.add(emp)
            try:
                 session.commit()
                 generated_count += 1
            except Exception as e:
                 session.rollback()
                 pass
                 
            if generated_count % 50 == 0:
                print(f"  ... {generated_count} / {needed_employees} generated")

        print(f"Finished. Generated {generated_count} new employees.")
    else:
        print(f"Company has sufficient employees.")


def seed_demo():
    with Session(engine) as session:
        # Config 1: Tech
        conf1 = {
            "name": "Nexus Innovations",
            "domain": "nexus.tech",
            "color": "#3b82f6", # Blue
            "branches": [{"name": "Silicon Valley HQ", "code": "NX-SV", "branch_type": "hq"}, {"name": "Austin Hub", "code": "NX-ATX", "branch_type": "regional"}],
            "depts": [
                ("Engineering", ["Software Engineer", "DevOps Engineer", "QA Lead", "VP Engineering"]),
                ("Product", ["Product Manager", "UX Designer"]),
                ("Sales", ["Sales Rep", "Account Executive"])
            ]
        }
        create_company_data(session, conf1)

        # Config 2: Finance
        conf2 = {
            "name": "Summit Financial",
            "domain": "summit.fin",
            "color": "#64748b", # Slate
            "branches": [{"name": "Wall St HQ", "code": "SM-NY", "branch_type": "hq"}, {"name": "London Office", "code": "SM-LDN", "branch_type": "intl"}],
            "depts": [
                ("Investment Banking", ["Analyst", "Associate", "VP"]),
                ("Compliance", ["Compliance Officer", "Risk Manager"]),
                ("HR", ["HR Generalist", "Recruiter", "HR Manager"])
            ]
        }
        create_company_data(session, conf2)

        # Config 3: Health
        conf3 = {
            "name": "Apex Healthcare",
            "domain": "apex.health",
            "color": "#14b8a6", # Teal
            "branches": [{"name": "Central Hospital", "code": "AH-CEN", "branch_type": "hq"}, {"name": "North Clinic", "code": "AH-NOR", "branch_type": "clinic"}],
            "depts": [
                ("Medical Staff", ["Nurse", "Resident Doctor", "Attending Physician"]),
                ("Administration", ["Practice Manager", "Billing Specialist", "Receptionist"]),
                ("IT", ["Systems Admin", "Helpdesk"])
            ]
        }
        create_company_data(session, conf3)

if __name__ == "__main__":
    seed_demo()
