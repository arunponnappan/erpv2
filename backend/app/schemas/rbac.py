from typing import List, Optional
from sqlmodel import SQLModel 

class PermissionRead(SQLModel):
    id: int
    module: str
    code: str
    name: str
    description: Optional[str] = None

class RoleBase(SQLModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleRead(RoleBase):
    id: int
    company_id: Optional[int] = None
    is_system_role: bool
    permissions: List[PermissionRead] = []

class RoleUpdate(RoleBase):
    permission_ids: Optional[List[int]] = None

