from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from app.models.company import Company

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    INTERNAL_USER = "internal_user"

class UserBase(SQLModel):
    username: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None, unique=True, index=True)
    full_name: Optional[str] = None
    role: UserRole = Field(default=UserRole.INTERNAL_USER)
    role_id: Optional[int] = Field(default=None, foreign_key="role.id") # Link to Dynamic Role
    status: UserStatus = Field(default=UserStatus.ACTIVE)
    company_id: Optional[int] = Field(default=None, foreign_key="company.id")

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    company: Optional["Company"] = Relationship(back_populates="user_links")

class LoginHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ip_address: str
    user_agent: str
    location: Optional[str] = None

class UserCreate(UserBase):
    password: str
    pass

class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    status: Optional[UserStatus] = None

class UserRead(UserBase):
    id: int
    created_at: datetime
