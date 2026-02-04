from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import SessionDep
from app.core import security
from app.core.config import settings
from app.models.user import User, UserRead, LoginHistory

router = APIRouter()

@router.post("/login/access-token")
def login_access_token(
    session: SessionDep, request: Request, form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    from sqlmodel import select, or_
    
    statement = select(User).where(or_(User.username == form_data.username, User.email == form_data.username))
    user = session.exec(statement).first()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    from app.models.user import UserStatus
    if user.status != UserStatus.ACTIVE:
        detail_msg = "Inactive user"
        if user.status == UserStatus.PENDING:
            detail_msg = "Account pending approval"
        elif user.status == UserStatus.SUSPENDED:
            detail_msg = "Account suspended"
        raise HTTPException(status_code=400, detail=detail_msg)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Record Login History
    login_history = LoginHistory(
        user_id=user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent", "Unknown"),
    )
    session.add(login_history)
    session.commit()

    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
