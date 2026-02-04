from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class CompanyBase(SQLModel):
    name: str = Field(index=True)
    registration_number: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str = "#4f46e5" # Default indigo-600
    footer_text: Optional[str] = "© 2024 All Rights Reserved"
    is_default: bool = Field(default=False)
    address: Optional[str] = None
    website: Optional[str] = None

class Company(CompanyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Relationships
    user_links: List["User"] = Relationship(back_populates="company")
    employees: List["Employee"] = Relationship(back_populates="company", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    branches: List["Branch"] = Relationship(back_populates="company", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    departments: List["Department"] = Relationship(back_populates="company", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    designations: List["Designation"] = Relationship(back_populates="company", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    installed_apps: List["InstalledApp"] = Relationship(back_populates="company", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class CompanyCreate(CompanyBase):
    pass

class CompanyRead(CompanyBase):
    id: int

class CompanyUpdate(SQLModel):
    name: Optional[str] = None
    registration_number: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    footer_text: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
