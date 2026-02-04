from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from datetime import date
# Import UserRead for schema definition. using TYPE_CHECKING for User model to avoid circular import if possible for Relationship
from app.models.user import UserRead 

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.org_structure import Branch, Designation, JobRole
    from app.models.user import User

# ----------------- Department -----------------
class DepartmentBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    company_id: int = Field(foreign_key="company.id")

class Department(DepartmentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    company: "Company" = Relationship(back_populates="departments")
    employees: List["Employee"] = Relationship(back_populates="department", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    job_roles: List["JobRole"] = Relationship(back_populates="department", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class DepartmentCreate(DepartmentBase):
    pass

class DepartmentRead(DepartmentBase):
    id: int
    company_id: int

# ----------------- Employment Type -----------------
# keeping this as it's useful for "Full Time", "Contract", etc.
class EmploymentTypeBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    company_id: int = Field(foreign_key="company.id")

class EmploymentType(EmploymentTypeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employees: List["Employee"] = Relationship(back_populates="employment_type")

class EmploymentTypeCreate(EmploymentTypeBase):
    pass

class EmploymentTypeRead(EmploymentTypeBase):
    id: int

# ----------------- Employee -----------------
class EmployeeBase(SQLModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Personal Details
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None # Male, Female, Other
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    national_id_number: Optional[str] = None
    profile_photo_url: Optional[str] = None

    # Contact Details
    work_email: Optional[str] = Field(default=None, index=True)
    personal_email: Optional[str] = None
    mobile_phone: Optional[str] = None
    personal_phone: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    address_zip: Optional[str] = None

    # Job & Employment (Multi-Company Structure)
    joining_date: Optional[date] = None
    
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")
    branch_id: Optional[int] = Field(default=None, foreign_key="branch.id")
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")
    
    designation_id: Optional[int] = Field(default=None, foreign_key="designation.id")
    job_role_id: Optional[int] = Field(default=None, foreign_key="jobrole.id")


    
    employment_type_id: Optional[int] = Field(default=None, foreign_key="employmenttype.id")
    reporting_manager_id: Optional[int] = Field(default=None, foreign_key="employee.id", nullable=True)

    # System Access
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", unique=True)
    employee_id: Optional[str] = Field(default=None, index=True, unique=True)

    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

class Employee(EmployeeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    company: Optional["Company"] = Relationship(back_populates="employees")
    department: Optional[Department] = Relationship(back_populates="employees")
    
    designation: Optional["Designation"] = Relationship(back_populates="employees")
    job_role: Optional["JobRole"] = Relationship(back_populates="employees")

    
    employment_type: Optional[EmploymentType] = Relationship(back_populates="employees")
    user: Optional["User"] = Relationship()

class EmployeeCreate(EmployeeBase):
    create_user: bool = False
    username: Optional[str] = None
    user_role: Optional[str] = None
    user_password: Optional[str] = None
    role_id: Optional[int] = None
    
    # IDs for the new structure
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    designation_id: Optional[int] = None
    job_role_id: Optional[int] = None

class EmployeeUpdate(SQLModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Personal Details
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    national_id_number: Optional[str] = None
    profile_photo_url: Optional[str] = None

    # Contact Details
    work_email: Optional[str] = None
    personal_email: Optional[str] = None
    mobile_phone: Optional[str] = None
    personal_phone: Optional[str] = None
    
    # Address
    address_line1: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    address_zip: Optional[str] = None

    # Job & Employment
    joining_date: Optional[date] = None
    
    company_id: Optional[int] = None
    branch_id: Optional[int] = None
    department_id: Optional[int] = None
    
    designation_id: Optional[int] = None
    job_role_id: Optional[int] = None
    
    employment_type_id: Optional[int] = None
    reporting_manager_id: Optional[int] = None

    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None

    # Linked User Updates
    user_role: Optional[str] = None
    user_password: Optional[str] = None
    role_id: Optional[int] = None

class EmployeeRead(EmployeeBase):
    id: int
    department: Optional[DepartmentRead] = None
    user: Optional[UserRead] = None
    # We can add other read models here as needed (DesignationRead, etc.)
