from typing import List, Optional
from sqlmodel import Field, SQLModel, Relationship

# Link Table
class RolePermission(SQLModel, table=True):
    role_id: int = Field(foreign_key="role.id", primary_key=True)
    permission_id: int = Field(foreign_key="permission.id", primary_key=True)

class Permission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    module: str = Field(index=True) # e.g. "users", "hr"
    code: str = Field(unique=True, index=True) # e.g. "user:create"
    name: str # e.g. "Create Users"
    description: Optional[str] = None
    
    roles: List["Role"] = Relationship(back_populates="permissions", link_model=RolePermission)

class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    company_id: Optional[int] = Field(default=None, foreign_key="company.id") # Null for System Roles? Or strict check?
    is_system_role: bool = Field(default=False) # If true, cannot be deleted (e.g. basic Admin)
    
    company: Optional["Company"] = Relationship()
    permissions: List[Permission] = Relationship(back_populates="roles", link_model=RolePermission)
