from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models.company import Company
from app.models.org_structure import Branch, Designation, JobRole
from app.models.hr import Department, Employee, EmploymentType
from app.models.user import User

def seed_bettomax():
    create_db_and_tables()
    with Session(engine) as session:
        print("Seeding Bettomax Liberia data...")

        # 1. Create Company
        company = session.exec(select(Company).where(Company.name == "Bettomax Liberia")).first()
        if company:
            print(f"Company {company.name} already exists. Deleting to re-seed...")
            session.delete(company)
            session.commit()
            
        company = Company(name="Bettomax Liberia", domain="bettomax.lr")
        session.add(company)
        session.commit()
        session.refresh(company)
        print(f"Created Company: {company.name}")

        # 2. Branches
        branch_hq = Branch(name="Headquarters", code="BET-HQ", branch_type="HQ", company_id=company.id)
        session.add(branch_hq)
        session.commit()
        session.refresh(branch_hq)
        print("Created Branch: HQ")

        # 4. Departments
        # OrgStructure update: Department is now Company-wide
        dept_admin = Department(name="Administration", manager_id=None, company_id=company.id)
        dept_hr = Department(name="Human Resources", manager_id=None, company_id=company.id)
        dept_finance = Department(name="Finance", manager_id=None, company_id=company.id)
        dept_it = Department(name="IT Support", manager_id=None, company_id=company.id)
        
        dept_sales = Department(name="Sales & Betting", manager_id=None, company_id=company.id)
        
        session.add_all([dept_admin, dept_hr, dept_finance, dept_it, dept_sales])
        session.commit()
        session.refresh(dept_admin)
        session.refresh(dept_hr)
        session.refresh(dept_finance)
        session.refresh(dept_it)
        session.refresh(dept_sales)
        print("Created Departments")

        # 5. Designations
        # OrgStructure update: Designation is now Company-wide
        des_ceo = Designation(title="CEO", level=1, company_id=company.id)
        des_hr_mgr = Designation(title="HR Manager", level=2, company_id=company.id)
        des_fin_mgr = Designation(title="Finance Manager", level=2, company_id=company.id)
        des_sysadmin = Designation(title="System Administrator", level=3, company_id=company.id)
        des_cashier = Designation(title="Cashier", level=5, company_id=company.id)
        des_shop_mgr = Designation(title="Shop Manager", level=4, company_id=company.id)

        session.add_all([des_ceo, des_hr_mgr, des_fin_mgr, des_sysadmin, des_cashier, des_shop_mgr])
        session.commit()
        print("Created Designations")

        # 6. Job Roles
        role_backend = JobRole(name="Senior Backend Dev", department_id=dept_it.id)
        role_accountant = JobRole(name="Senior Accountant", department_id=dept_finance.id)
        session.add_all([role_backend, role_accountant])
        session.commit()
        print("Created Job Roles")

        # 7. Employment Types
        et_ft = EmploymentType(name="Full Time", company_id=company.id)
        et_pt = EmploymentType(name="Part Time", company_id=company.id)
        session.add_all([et_ft, et_pt])
        session.commit()
        print("Created Employment Types")
        
        print("SUCCESS: Bettomax Liberia data seeded.")

if __name__ == "__main__":
    seed_bettomax()
