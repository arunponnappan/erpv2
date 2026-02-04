from typing import Generator, Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session
from app.core import security
from app.core.config import settings
from app.database import get_session
from app.models.user import User, UserRole

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login/access-token")

TokenDep = Annotated[str, Depends(reusable_oauth2)]
SessionDep = Annotated[Session, Depends(get_session)]

def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        token_data = payload.get("sub")
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, int(token_data))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from app.models.user import UserStatus
    if user.status != UserStatus.ACTIVE:
        detail_msg = "Inactive user"
        if user.status == UserStatus.PENDING:
            detail_msg = "Account pending approval"
        elif user.status == UserStatus.SUSPENDED:
            detail_msg = "Account suspended"
        
        raise HTTPException(status_code=400, detail=detail_msg)
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def get_current_active_superuser(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user

def check_hr_module_installed(current_user: CurrentUser, session: SessionDep) -> bool:
    from app.models.marketplace import InstalledApp, MarketplaceApp
    from sqlmodel import select
    
    # Find the App ID for "Employees"
    app = session.exec(select(MarketplaceApp).where(MarketplaceApp.name == "Employees")).first()
    if not app:
        # Should not happen if seeded, but fail safe
        raise HTTPException(status_code=500, detail="Employees module not found in system")

    if not current_user.company_id:
         raise HTTPException(status_code=400, detail="User not associated with a company")

    installed = session.exec(
        select(InstalledApp)
        .where(InstalledApp.company_id == current_user.company_id)
        .where(InstalledApp.app_id == app.id)
        .where(InstalledApp.is_active == True)
    ).first()

    if not installed:
        raise HTTPException(status_code=403, detail="Employees module is not installed for this company")
    
    return True
