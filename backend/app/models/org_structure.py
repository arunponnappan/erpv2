from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

# --- Branch ---
class BranchBase(SQLModel):
    name: str = Field(index=True)
    code: str = Field(index=True, unique=True)
    branch_type: Optional[str] = Field(default="branch")
    company_id: int = Field(foreign_key="company.id")

class Branch(BranchBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    company: "Company" = Relationship(back_populates="branches")
    # Departments are no longer children of branches in the schema, but employees are assigned to branches.

class BranchCreate(BranchBase):
    pass

class BranchRead(BranchBase):
    id: int

# --- Designation ---
class DesignationBase(SQLModel):
    title: str = Field(index=True)
    level: Optional[int] = None # For hierarchy (e.g. 1=Junior, 5=Director)
    company_id: int = Field(foreign_key="company.id")

class Designation(DesignationBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    company: "Company" = Relationship(back_populates="designations")
    employees: List["Employee"] = Relationship(back_populates="designation")

class DesignationCreate(DesignationBase):
    pass

class DesignationRead(DesignationBase):
    id: int

# --- Job Role ---
class JobRoleBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    department_id: Optional[int] = Field(default=None, foreign_key="department.id")

class JobRole(JobRoleBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    department: Optional["Department"] = Relationship(back_populates="job_roles")
    employees: List["Employee"] = Relationship(back_populates="job_role")

class JobRoleCreate(JobRoleBase):
    pass

class JobRoleRead(JobRoleBase):
    id: int



