from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from app.api.deps import SessionDep, CurrentUser
from app.models.company import Company, CompanyCreate, CompanyRead, CompanyUpdate
from app.models.user import UserRole
from app.models.org_structure import Branch

router = APIRouter()

@router.post("/", response_model=CompanyRead)
def create_company(
    *,
    session: SessionDep,
    company_in: CompanyCreate,
    current_user: CurrentUser,
) -> Any:
    """
    Create a new company.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Super Admin can create companies")
    
    company = Company.model_validate(company_in)
    session.add(company)
    session.commit()
    session.refresh(company)
    
    return company

@router.get("/", response_model=List[CompanyRead])
def read_companies(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve companies.
    """
    stmt = select(Company).offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.get("/{company_id}", response_model=CompanyRead)
def read_company(
    *,
    session: SessionDep,
    company_id: int,
    current_user: CurrentUser,
) -> Any:
    """
    Get company by ID.
    """
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/{company_id}", response_model=CompanyRead)
def update_company(
    *,
    session: SessionDep,
    company_id: int,
    company_in: CompanyUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update a company.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # Strict Access Control
    if current_user.role != UserRole.SUPER_ADMIN:
        if company.id != current_user.company_id:
             raise HTTPException(status_code=403, detail="You can only manage your own company")
        
    update_data = company_in.model_dump(exclude_unset=True)
    company.sqlmodel_update(update_data)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company

@router.delete("/{company_id}")
def delete_company(
    *,
    session: SessionDep,
    company_id: int,
    current_user: CurrentUser,
) -> Any:
    """
    Delete a company.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Only Super Admin can delete companies")

    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default company. You can edit it instead.")
        
    try:
        print(f"--- STARTING COMPANY DELETION FOR ID: {company_id} ---")
        
        # 0. Unlink Users (User -> Company)
        print("Step 0: Unlink Users")
        from app.models.user import User
        users = session.exec(select(User).where(User.company_id == company_id)).all()
        for user in users:
            user.company_id = None
            session.add(user)
        session.commit()

        # 1. Break Employee Self-Referential Links (reporting_manager_id)
        print("Step 1: Break Reporting Lines")
        from addons.employees.models import Employee
        from addons.employees.models import EmploymentType
        from addons.employees.models import Department
        from app.models.org_structure import JobRole
        
        # Delete Departments (and their Job Roles)
        depts = session.exec(select(Department).where(Department.company_id == company_id)).all()
        for dept in depts:
            # Explicit delete job roles
            job_roles = session.exec(select(JobRole).where(JobRole.department_id == dept.id)).all()
            for job in job_roles:
                session.delete(job)
            session.delete(dept)
        session.commit()

        # Delete Branches
        branches = session.exec(select(Branch).where(Branch.company_id == company_id)).all()
        for branch in branches:
            session.delete(branch)
        session.commit()

        # 5. Delete Company
        print("Step 5: Delete Company")
        company = session.get(Company, company_id)
        if company:
            session.delete(company)
            session.commit()
        
        print("--- DELETION SUCCESSFUL ---")
        return {"ok": True}
        
    except Exception as e:
        print(f"!!! DELETION FAILED !!! Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.get("/{company_id}/summary")
def get_company_summary(company_id: int, session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Get a summary of usage for a company to display before deletion.
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from app.models.user import User
    from addons.employees.models import Employee
    from app.models.org_structure import Branch
    from addons.employees.models import Department
    
    # Simple Counts
    user_count = session.exec(select(func.count(User.id)).where(User.company_id == company_id)).one()
    emp_count = session.exec(select(func.count(Employee.id)).where(Employee.company_id == company_id)).one()
    branch_count = session.exec(select(func.count(Branch.id)).where(Branch.company_id == company_id)).one()
    
    # approximate deep counts via Branch join
    dept_count = session.exec(select(func.count(Department.id)).where(Department.company_id == company_id)).one()

    return {
        "users": user_count,
        "employees": emp_count,
        "branches": branch_count,
        "departments": dept_count
    }
