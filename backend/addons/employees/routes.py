from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlmodel import select
from sqlalchemy.orm import selectinload
from app.api.deps import SessionDep, CurrentUser, check_hr_module_installed
from .models import (
    Department, DepartmentCreate, DepartmentRead,
    Employee, EmployeeCreate, EmployeeRead,
    EmploymentType, EmploymentTypeCreate, EmploymentTypeRead,
)
from app.models.user import UserRole, User, UserStatus
from app.core import security
import shutil
import os
import time

router = APIRouter(dependencies=[Depends(check_hr_module_installed)])

# ----------------- Settings (Temporarily Disabled for Multi-Company Refactor) -----------------
# @router.get("/settings/", response_model=HRSettings)
# def get_hr_settings(session: SessionDep) -> Any:
#     ...

# @router.put("/settings/", response_model=HRSettings)
# def update_hr_settings(...):
#     ...

# @router.post("/settings/upload-logo", response_model=HRSettings)
# def upload_logo(...):
#     ...

# ----------------- Job Positions (Temporarily Disabled - Use Job Role) -----------------
# @router.post("/job-positions/", response_model=JobPositionRead)
# def create_job_position(...):
#     ...

# @router.get("/job-positions/", response_model=List[JobPositionRead])
# def read_job_positions(...):
#     ...

# ----------------- Employment Types -----------------
@router.post("/employment-types/", response_model=EmploymentTypeRead)
def create_employment_type(
    *,
    session: SessionDep,
    type_in: EmploymentTypeCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    emp_type = EmploymentType.model_validate(type_in)
    session.add(emp_type)
    try:
        session.commit()
    except Exception:
        raise HTTPException(status_code=400, detail="Employment Type already exists")
    session.refresh(emp_type)
    return emp_type

@router.get("/employment-types/", response_model=List[EmploymentTypeRead])
def read_employment_types(
    session: SessionDep,
    company_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    stmt = select(EmploymentType)
    if company_id:
        stmt = stmt.where(EmploymentType.company_id == company_id)
    stmt = stmt.offset(skip).limit(limit)
    return session.exec(stmt).all()

@router.delete("/employment-types/{type_id}")
def delete_employment_type(
    type_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    emp_type = session.get(EmploymentType, type_id)
    if not emp_type:
        raise HTTPException(status_code=404, detail="Employment Type not found")
    session.delete(emp_type)
    session.commit()
    return {"ok": True}

# ----------------- Departments -----------------
@router.post("/departments/", response_model=DepartmentRead)
def create_department(
    *,
    session: SessionDep,
    dept_in: DepartmentCreate,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    dept = Department.model_validate(dept_in)
    session.add(dept)
    session.commit()
    session.refresh(dept)
    return dept

@router.get("/departments/", response_model=List[DepartmentRead])
def read_departments(
    session: SessionDep,
    company_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    stmt = select(Department)
    if company_id:
        stmt = stmt.where(Department.company_id == company_id)
    stmt = stmt.offset(skip).limit(limit)
    depts = session.exec(stmt).all()
    return depts

@router.delete("/departments/{dept_id}")
def delete_department(
    dept_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    dept = session.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    session.delete(dept)
    session.commit()
    return {"ok": True}

# ----------------- Employees -----------------
@router.post("/employees/", response_model=EmployeeRead)
def create_employee(
    *,
    session: SessionDep,
    emp_in: EmployeeCreate,
    current_user: CurrentUser,
) -> Any:
    """
    Create a new employee profile with auto-generated ID.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    # Auto-generate Employee ID (STUBBED for Multi-Company Refactor)
    import random
    generated_id = f"EMP{random.randint(1000, 9999)}"
    # settings = session.exec(select(HRSettings)).first()
    # if not settings:
    #     settings = HRSettings(employee_id_prefix="EMP", next_employee_number=1)
    #     session.add(settings)
    
    # Generate ID: PRE001
    # generated_id = f"{settings.employee_id_prefix}{settings.next_employee_number:03d}"
    
    # Check if user_id is valid and not already taken
    if emp_in.user_id:
        user = session.get(User, emp_in.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Linked User not found")
        
        # Check uniqueness
        existing_emp = session.exec(select(Employee).where(Employee.user_id == emp_in.user_id)).first()
        if existing_emp:
            raise HTTPException(status_code=400, detail="This User is already linked to another Employee record")

    # Handle automatic user creation
    if emp_in.create_user:
        if emp_in.user_id:
             raise HTTPException(status_code=400, detail="Cannot create new user when 'user_id' is already provided")
        
        # Check if email exists (only if provided)
        if emp_in.work_email:
            existing_user = session.exec(select(User).where(User.email == emp_in.work_email)).first()
            if existing_user:
                 raise HTTPException(status_code=400, detail=f"User with email {emp_in.work_email} already exists. Please link it explicitly instead.")
        
        if not emp_in.user_password:
             raise HTTPException(status_code=400, detail="Password is required when creating a user")
        
        if not emp_in.username:
             # Auto-generate username from email if not provided (fallback)
             emp_in.username = emp_in.work_email

        # Check if username exists
        existing_user_username = session.exec(select(User).where(User.username == emp_in.username)).first()
        if existing_user_username:
             raise HTTPException(status_code=400, detail=f"User with username {emp_in.username} already exists.")
            
        new_user = User(
            username=emp_in.username,
            email=emp_in.work_email if emp_in.work_email else None,
            hashed_password=security.get_password_hash(emp_in.user_password),
            full_name=f"{emp_in.first_name} {emp_in.last_name or ''}".strip(),
            role=emp_in.user_role or UserRole.INTERNAL_USER,
            role_id=emp_in.role_id,
            status=UserStatus.PENDING,
            company_id=emp_in.company_id
        )
        session.add(new_user)
        session.flush() # Use flush so we get the ID but can rollback if employee creation fails
        session.refresh(new_user)
        
        # assign the new user id to the employee payload
        emp_in.user_id = new_user.id

    # Create Employee
    emp_data = emp_in.model_dump(exclude={"create_user", "user_role", "user_password", "username"})
    emp = Employee.model_validate(emp_data)
    emp.employee_id = generated_id
    
    try:
        session.add(emp)
        # Increment sequence
        # settings.next_employee_number += 1
        # session.add(settings)
        
        session.commit()
        session.refresh(emp)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return emp

@router.get("/employees/", response_model=List[EmployeeRead])
def read_employees(
    session: SessionDep,
    current_user: CurrentUser,
    company_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve employees.
    """
    stmt = select(Employee).options(selectinload(Employee.user), selectinload(Employee.department))
    if company_id:
        stmt = stmt.where(Employee.company_id == company_id)
    
    # Enforce isolation for non-super admins if no company_id provided (optional safety)
    if not company_id and current_user.role != UserRole.SUPER_ADMIN:
        stmt = stmt.where(Employee.company_id == current_user.company_id)

    stmt = stmt.offset(skip).limit(limit)
    employees = session.exec(stmt).all()
    return employees

@router.get("/employees/{employee_id}", response_model=EmployeeRead)
def get_employee(
    employee_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get employee by ID.
    """
    # Use select/exec to support options (eager loading)
    employee = session.exec(
        select(Employee)
        .where(Employee.id == employee_id)
        .options(selectinload(Employee.user), selectinload(Employee.department))
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.delete("/employees/{employee_id}")
def delete_employee(
    employee_id: int,
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Delete an employee.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Optional: Prevent deleting if it's the current user's employee record (safety check)
    # user_emp = session.exec(select(Employee).where(Employee.user_id == current_user.id)).first()
    # if user_emp and user_emp.id == employee_id:
    #      raise HTTPException(status_code=400, detail="You cannot delete your own employee record")

    session.delete(employee)
    session.commit()
    return {"ok": True}

from .models import EmployeeUpdate

@router.put("/employees/{employee_id}", response_model=EmployeeRead)
def update_employee(
    *,
    session: SessionDep,
    employee_id: int,
    emp_in: EmployeeUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update an employee.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    emp = session.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check for company isolation
    if current_user.role != UserRole.SUPER_ADMIN and emp.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not enough privileges to access this employee")

    # Update Employee Data
    emp_data = emp_in.model_dump(exclude_unset=True, exclude={"user_role", "user_password", "role_id"})
    for key, value in emp_data.items():
        setattr(emp, key, value)
    
    # 2. Handle User Linkage Updates (Password, User Role, Dynamic Role)
    if emp.user_id:
        user = session.get(User, emp.user_id)
        if user:
            # Update Password
            if emp_in.user_password:
                user.hashed_password = security.get_password_hash(emp_in.user_password)
            
            # Update System Role
            if emp_in.user_role:
                 # Check if trying to escalate privileges
                 if emp_in.user_role in [UserRole.SUPER_ADMIN, UserRole.ADMIN] and current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
                      raise HTTPException(status_code=403, detail="Cannot assign Admin privileges")
                 user.role = emp_in.user_role
            
            # Update Dynamic Role (RBAC)
            if emp_in.role_id is not None:
                 user.role_id = emp_in.role_id # Update the foreign key to the Role table

            session.add(user)

    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp
