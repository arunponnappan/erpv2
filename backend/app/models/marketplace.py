from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, Column, JSON

class MarketplaceAppBase(SQLModel):
    name: str = Field(index=True)
    description: str
    icon_url: Optional[str] = None
    version: str = "1.0.0"
    developer: str = "System"
    category: str = "Connector" # e.g., CRM, Project Management, etc.
    is_active: bool = True

class MarketplaceApp(MarketplaceAppBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    installed_instances: List["InstalledApp"] = Relationship(back_populates="app")

class InstalledAppBase(SQLModel):
    is_active: bool = True
    settings: Dict = Field(default={}, sa_column=Column(JSON))
    installed_at: datetime = Field(default_factory=datetime.utcnow)

class InstalledApp(InstalledAppBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    company_id: int = Field(foreign_key="company.id")
    app_id: int = Field(foreign_key="marketplaceapp.id")
    
    # Relationships
    company: "Company" = Relationship(back_populates="installed_apps")
    app: "MarketplaceApp" = Relationship(back_populates="installed_instances")
    access_list: List["AppAccess"] = Relationship(back_populates="installed_app")

class InstalledAppCreate(InstalledAppBase):
    app_id: int

class InstalledAppRead(InstalledAppBase):
    id: int
    app_id: int
    app: MarketplaceApp

class AppAccess(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    installed_app_id: int = Field(foreign_key="installedapp.id")
    user_id: int = Field(foreign_key="user.id")
    role: str = Field(default="user") # 'admin' or 'user'
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    installed_app: "InstalledApp" = Relationship(back_populates="access_list")
