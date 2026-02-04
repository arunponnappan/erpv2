from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user import User
from app.models.rbac import Role, Permission, RolePermission
from app.schemas.rbac import RoleRead, RoleCreate, RoleUpdate, PermissionRead

router = APIRouter()

# --- Permissions ---
@router.get("/permissions", response_model=List[PermissionRead])
def read_permissions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all available system permissions."""
    permissions = session.exec(select(Permission).order_by(Permission.module)).all()
    return permissions

# --- Roles ---
@router.get("/roles", response_model=List[RoleRead])
def read_roles(
    company_id: int = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Retrieve roles. Filter by company or show global system roles."""
    query = select(Role)
    if company_id:
        # Show Company Roles + Global System Roles (where company_id is None)
        query = query.where((Role.company_id == company_id) | (Role.company_id == None))
    else:
        # If no company filter, and user has one, restrict to their company
        if current_user.company_id:
             query = query.where((Role.company_id == current_user.company_id) | (Role.company_id == None))
    
    roles = session.exec(query).all()
    return roles

@router.post("/roles", response_model=RoleRead)
def create_role(
    role_in: RoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Create a new role for the current user's company."""
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company to create a role.")
    
    role = Role(
        name=role_in.name, 
        description=role_in.description,
        company_id=current_user.company_id
    )
    session.add(role)
    session.commit()
    session.refresh(role)
    
    # Assign Permissions
    for perm_id in role_in.permission_ids:
        link = RolePermission(role_id=role.id, permission_id=perm_id)
        session.add(link)
    
    session.commit()
    session.refresh(role)
    return role

@router.put("/roles/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    role_in: RoleUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Permission Check: Can only edit roles in own company (unless Super Admin)
    if role.company_id != current_user.company_id and current_user.role != 'super_admin':
         raise HTTPException(status_code=403, detail="Not authorized to edit this role")

    if role_in.name:
        role.name = role_in.name
    if role_in.description:
        role.description = role_in.description
        
    session.add(role)
    
    if role_in.permission_ids is not None:
        # Clear existing
        # The existing_links logic in previous step was robust enough, repeating it here.
        existing_links = session.exec(select(RolePermission).where(RolePermission.role_id == role_id)).all()
        for link in existing_links:
            session.delete(link)
            
        # Add new
        for perm_id in role_in.permission_ids:
            link = RolePermission(role_id=role.id, permission_id=perm_id)
            session.add(link)
            
    session.commit()
    session.refresh(role)
    return role

@router.delete("/roles/{role_id}")
def delete_role(
    role_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if role.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    if role.company_id != current_user.company_id and current_user.role != 'super_admin':
         raise HTTPException(status_code=403, detail="Not authorized to delete this role")

    session.delete(role)
    session.commit()
    return {"message": "Role deleted successfully"}
