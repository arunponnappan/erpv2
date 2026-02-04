from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from app.api.deps import SessionDep, CurrentUser
from app.models.org_structure import (
    Branch, BranchCreate, BranchRead,
    JobRole, JobRoleCreate, JobRoleRead,
    Designation, DesignationCreate, DesignationRead,
)
# Re-importing Department from hr for now as that's where it was defined, but conceptually it's org structure
from addons.employees.models import Department, DepartmentCreate, DepartmentRead
from app.models.user import UserRole

router = APIRouter()

# --- Branches ---
@router.post("/branches/", response_model=BranchRead)
def create_branch(
    *,
    session: SessionDep,
    branch_in: BranchCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    branch = Branch.model_validate(branch_in)
    session.add(branch)
    session.commit()
    session.refresh(branch)
    return branch

@router.get("/branches/", response_model=List[BranchRead])
def read_branches(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    company_id: int | None = None,
) -> Any:
    # 1. Base Query
    stmt = select(Branch)

    # 2. Authorization & Filtering Logic
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super Admin: Can view all, OR filter by specific company if provided
        if company_id:
            stmt = stmt.where(Branch.company_id == company_id)
    else:
        # Standard User: MUST be limited to their own company
        stmt = stmt.where(Branch.company_id == current_user.company_id)
    
    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.delete("/branches/{branch_id}")
def delete_branch(
    *,
    session: SessionDep,
    branch_id: int,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    branch = session.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    if current_user.role != UserRole.SUPER_ADMIN:
        if branch.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this branch")
        
    session.delete(branch)
    session.commit()
    return {"ok": True}

# --- Departments (New Hierarchical Logic) ---
# Replacing the logic from hr.py
@router.post("/departments/", response_model=DepartmentRead)
def create_department_v2(
    *,
    session: SessionDep,
    dept_in: DepartmentCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    # Ensure company_id is set to current user's company (unless super admin overrides, but simpler to enforce context)
    if current_user.role != UserRole.SUPER_ADMIN:
        dept_in.company_id = current_user.company_id
    
    dept = Department.model_validate(dept_in)
    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept

@router.get("/departments/", response_model=List[DepartmentRead])
def read_departments_v2(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    company_id: int | None = None,
) -> Any:
    # Departments are now directly linked to Company
    stmt = select(Department)

    if current_user.role == UserRole.SUPER_ADMIN:
        if company_id:
            stmt = stmt.where(Department.company_id == company_id)
    else:
        stmt = stmt.where(Department.company_id == current_user.company_id)

    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.delete("/departments/{department_id}")
def delete_department(
    *,
    session: SessionDep,
    department_id: int,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    dept = session.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    # Check ownership directly
    if current_user.role != UserRole.SUPER_ADMIN:
        if dept.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
    session.delete(dept)
    session.commit()
    return {"ok": True}

# --- Designations ---
@router.post("/designations/", response_model=DesignationRead)
def create_designation(
    *,
    session: SessionDep,
    desig_in: DesignationCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    if current_user.role != UserRole.SUPER_ADMIN:
        desig_in.company_id = current_user.company_id

    desig = Designation.model_validate(desig_in)
    session.add(desig)
    session.commit()
    session.refresh(desig)
    return desig

@router.get("/designations/", response_model=List[DesignationRead])
def read_designations(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    company_id: int | None = None,
) -> Any:
    # Designations are now directly linked to Company
    stmt = select(Designation)

    if current_user.role == UserRole.SUPER_ADMIN:
        if company_id:
            stmt = stmt.where(Designation.company_id == company_id)
    else:
        stmt = stmt.where(Designation.company_id == current_user.company_id)

    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.delete("/designations/{designation_id}")
def delete_designation(
    *,
    session: SessionDep,
    designation_id: int,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    desig = session.get(Designation, designation_id)
    if not desig:
        raise HTTPException(status_code=404, detail="Designation not found")
    
    # Check ownership directly
    if current_user.role != UserRole.SUPER_ADMIN:
        if desig.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
    session.delete(desig)
    session.commit()
    return {"ok": True}

# --- Job Roles ---
@router.post("/job-roles/", response_model=JobRoleRead)
def create_job_role(
    *,
    session: SessionDep,
    job_in: JobRoleCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    # Validate Department ownership
    if job_in.department_id:
        dept = session.get(Department, job_in.department_id)
        if not dept:
             raise HTTPException(status_code=404, detail="Department not found")
        if current_user.role != UserRole.SUPER_ADMIN and dept.company_id != current_user.company_id:
             raise HTTPException(status_code=403, detail="Cannot create role in another company's department")

    job = JobRole.model_validate(job_in)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job

@router.get("/job-roles/", response_model=List[JobRoleRead])
def read_job_roles(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    company_id: int | None = None,
) -> Any:
    # Join Path: JobRole -> Department -> Company
    stmt = select(JobRole).join(Department)

    if current_user.role == UserRole.SUPER_ADMIN:
        if company_id:
            stmt = stmt.where(Department.company_id == company_id)
    else:
        stmt = stmt.where(Department.company_id == current_user.company_id)

    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.delete("/job-roles/{job_role_id}")
def delete_job_role(
    *,
    session: SessionDep,
    job_role_id: int,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
         raise HTTPException(status_code=403, detail="Not enough privileges")
    
    job = session.get(JobRole, job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job Role not found")
        
    # Check ownership via Department
    if job.department_id:
        dept = session.get(Department, job.department_id)
        if dept:
            if current_user.role != UserRole.SUPER_ADMIN and dept.company_id != current_user.company_id:
                raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role != UserRole.SUPER_ADMIN:
         # Orphaned job role? Should not happen if cascade works, but safer to block or allow if it belongs to no one?
         # Assume if it has no department, it shouldn't exist or is super admin domain.
         pass # Logic to refine if strictly needed.

    session.delete(job)
    session.commit()
    return {"ok": True}
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    job = session.get(JobRole, job_role_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job Role not found")
        
    # Check ownership via Department -> Branch
    dept = session.get(Department, job.department_id)
    if dept:
        branch = session.get(Branch, dept.branch_id)
        if branch:
            if current_user.role != UserRole.SUPER_ADMIN and branch.company_id != current_user.company_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            
    session.delete(job)
    session.commit()
    return {"ok": True}
