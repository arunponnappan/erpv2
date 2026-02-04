from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import select, func
from app.api.deps import SessionDep, CurrentUser
from app.core import security
from app.models.user import (
    User,
    UserCreate,
    UserRead,
    UserUpdate,
    UserRole,
    LoginHistory,
)

router = APIRouter()

@router.get("/check_username")
def check_username(
    session: SessionDep,
    current_user: CurrentUser,
    username: str = Query(..., min_length=1),
) -> Any:
    """
    Check if a username is available.
    """
    user = session.exec(select(User).where(User.username == username)).first()
    return {"available": not user}

@router.get("/check_email")
def check_email(
    session: SessionDep,
    current_user: CurrentUser,
    email: str = Query(..., min_length=1),
) -> Any:
    """
    Check if an email is available.
    """
    user = session.exec(select(User).where(User.email == email)).first()
    return {"available": not user}

def check_can_create_role(creator_role: UserRole, target_role: UserRole):
    if creator_role == UserRole.SUPER_ADMIN:
        return True
    if creator_role == UserRole.ADMIN:
        # Admin can create Admin, Manager, Supervisor, Staff
        # (Assuming Admin cannot create Super Admin)
        if target_role == UserRole.SUPER_ADMIN:
            return False
        return True
        return True

@router.post("/", response_model=UserRead)
def create_user(
    *,
    session: SessionDep,
    user_in: UserCreate,
    current_user: CurrentUser,
) -> Any:
    """
    Create new user.
    """
    if not check_can_create_role(current_user.role, user_in.role):
        raise HTTPException(
            status_code=400,
            detail=f"{current_user.role} cannot create a user with role {user_in.role}",
        )

    user = session.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    
    user_obj = User.model_validate(
        user_in, update={"hashed_password": security.get_password_hash(user_in.password)}
    )
    # Sanitize email: Convert empty string to None to allow multiple users without email (SQLite unique constraint)
    if user_obj.email == "":
        user_obj.email = None

    session.add(user_obj)
    session.commit()
    session.refresh(user_obj)
    return user_obj

@router.get("/", response_model=List[UserRead])
def read_users(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    role: UserRole = None,
    company_id: int | None = Query(default=None),
) -> Any:
    """
    Retrieve users.
    """
    # Simply allowing read for authenticated users for now, 
    # but likely should restrict Staff to only see themselves or similar.
    # Spec says "Staff only have access to login", implies they might not see user list.
    if current_user.role == UserRole.INTERNAL_USER:
         # Restrict staff to own profile only or forbidden? 
         # Assuming forbidden for list view based on standard internal app patterns
         raise HTTPException(status_code=403, detail="Not enough permissions")

    statement = select(User)
    if role:
        statement = statement.where(User.role == role)
    
    # Company Filter
    # Company Filter
    from sqlmodel import or_
    
    if current_user.role == UserRole.SUPER_ADMIN:
        if company_id:
            # Show users in this company OR global users (like Super Admins)
            statement = statement.where(or_(User.company_id == company_id, User.company_id == None))
    else:
        # Strict isolation for non-super-admins
        statement = statement.where(User.company_id == current_user.company_id)
        # 1. Hide Super Admins from non-Super Admins
        if current_user.role != UserRole.SUPER_ADMIN:
             statement = statement.where(User.role != UserRole.SUPER_ADMIN)

    statement = statement.offset(skip).limit(limit)
    users = session.exec(statement).all()
    return users

@router.get("/me", response_model=UserRead)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user

@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    *,
    session: SessionDep,
    user_id: int,
    user_in: UserUpdate,
    current_user: CurrentUser,
) -> Any:
    """
    Update a user.
    """
    user_db = session.get(User, user_id)
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Permission checks for update
    # Permission checks for update
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
         raise HTTPException(status_code=403, detail="Not enough permissions")

    if current_user.role == UserRole.ADMIN:
        # Admin can delete/modify all other roles (except Super Admin?)
        if user_db.role == UserRole.SUPER_ADMIN:
             raise HTTPException(status_code=403, detail="Cannot modify Super Admin")

    user_data = user_in.model_dump(exclude_unset=True)
    
    # Sanitize email: Convert empty string to None
    if "email" in user_data and user_data["email"] == "":
        user_data["email"] = None

    # Check username uniqueness if changing
    if "username" in user_data and user_data["username"] != user_db.username:
        existing_user = session.exec(select(User).where(User.username == user_data["username"])).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Check email uniqueness if changing
    if "email" in user_data and user_data["email"] != user_db.email:
        existing_email = session.exec(select(User).where(User.email == user_data["email"])).first()
        if existing_email:
             raise HTTPException(status_code=400, detail="Email already registered")

    if user_in.password:
        password = user_data.pop("password")
        user_db.hashed_password = security.get_password_hash(password)
        
    user_db.sqlmodel_update(user_data)
    session.add(user_db)
    session.commit()
    session.refresh(user_db)
    return user_db

@router.delete("/{user_id}")
def delete_user(
    *,
    session: SessionDep,
    user_id: int,
    current_user: CurrentUser,
) -> Any:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super Admin cannot be deleted")

    # Permission logic
    if current_user.role == UserRole.ADMIN:
        if user.role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Cannot delete Super Admin")
    elif current_user.role == UserRole.SUPER_ADMIN:
        pass
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    session.delete(user)
    session.commit()
    return {"ok": True}

@router.get("/{user_id}/history", response_model=list[LoginHistory])
def read_login_history(
    user_id: int,
    session: SessionDep,
    current_user: CurrentUser,
):
    """
    Get login history of a user.
    Only Super Admin and Admin can view history.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    history = session.exec(
        select(LoginHistory).where(LoginHistory.user_id == user_id).order_by(LoginHistory.timestamp.desc()).limit(50)
    ).all()
    return history
