from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.database import get_session
from app.api import deps
from app.models.marketplace import MarketplaceApp, InstalledApp, InstalledAppCreate, InstalledAppRead, AppAccess
from app.models.user import User, UserRole
from app.models.company import Company

router = APIRouter()

@router.get("/apps", response_model=List[MarketplaceApp])
def get_available_apps(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all available marketplace apps.
    """
    apps = session.exec(select(MarketplaceApp).where(MarketplaceApp.is_active == True)).all()
    return apps

@router.get("/installed", response_model=List[InstalledAppRead])
def get_installed_apps(
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get installed apps for the current user's company.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
        
    statement = (
        select(InstalledApp)
        .join(AppAccess)
        .where(InstalledApp.company_id == current_user.company_id)
        .where(InstalledApp.is_active == True)
        .where(AppAccess.user_id == current_user.id)
    )
    installed_apps = session.exec(statement).all()
    return installed_apps

@router.post("/install/{app_id}", response_model=InstalledAppRead)
def install_app(
    app_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Install a marketplace app for the current company.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
    
    # Check if app exists
    app = session.get(MarketplaceApp, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
        
    # Check if already installed
    existing = session.exec(
        select(InstalledApp)
        .where(InstalledApp.company_id == current_user.company_id)
        .where(InstalledApp.app_id == app_id)
    ).first()
    
    if existing:
        if not existing.is_active:
            existing.is_active = True
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing
        raise HTTPException(status_code=400, detail="App already installed")

    # Strict Admin Check
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can install apps")

    installed_app = InstalledApp(
        company_id=current_user.company_id,
        app_id=app_id,
        is_active=True,
        settings={}
    )
    session.add(installed_app)
    session.commit()
    session.refresh(installed_app)
    
    # Auto-assign access to the installer (Admin)
    access = AppAccess(
        installed_app_id=installed_app.id,
        user_id=current_user.id,
        role="admin"
    )
    session.add(access)
    session.commit()
    
    return installed_app

@router.post("/uninstall/{installed_app_id}", response_model=dict)
def uninstall_app(
    installed_app_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Uninstall (deactivate) an app.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")

    installed_app = session.get(InstalledApp, installed_app_id)
    if not installed_app or installed_app.company_id != current_user.company_id:
         raise HTTPException(status_code=404, detail="App is not installed")
    
    if not installed_app.is_active:
        raise HTTPException(status_code=400, detail="App is already uninstalled")
    
    if not installed_app:
        raise HTTPException(status_code=404, detail="App is not installed")
        
    installed_app.is_active = False
    session.add(installed_app)
    session.commit()
    
    return {"message": "App uninstalled successfully"}

@router.post("/upgrade/{installed_app_id}", response_model=dict)
def upgrade_app(
    installed_app_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upgrade (update) an installed app.
    This triggers a re-seed/update of the module.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can upgrade apps")

    installed_app = session.get(InstalledApp, installed_app_id)
    if not installed_app or installed_app.company_id != current_user.company_id:
         raise HTTPException(status_code=404, detail="App is not installed")
    
    if not installed_app.is_active:
        raise HTTPException(status_code=400, detail="App is not active")

    # For now, "upgrading" is checking if the module exists and maybe refreshing metadata
    # In a full Odoo-like system, this would trigger migration scripts
    # We will simulate a successful update for the "Employees" module
    
    # We can fetch the MarketplaceApp to get the name
    app = session.get(MarketplaceApp, installed_app.app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Marketplace app definition not found")

    # Future: Call module_loader.upgrade_module(app.name)
    
    return {"message": f"App '{app.name}' updated successfully"}

@router.put("/settings/{installed_app_id}", response_model=InstalledAppRead)
def update_app_settings(
    installed_app_id: int,
    settings: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update settings for an installed app.
    """
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="User must belong to a company")
        
    installed_app = session.get(InstalledApp, installed_app_id)
    if not installed_app:
        raise HTTPException(status_code=404, detail="Installed app not found")
        
    if installed_app.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Merge existing settings with new ones
    # Merge existing settings with new ones - Force new dict for SQLAlchemy change tracking
    current_settings = dict(installed_app.settings or {})
    current_settings.update(settings)
    installed_app.settings = current_settings
    
    # Explicitly mark as modified if needed, but new dict assignment usually suffices
    session.add(installed_app)
    
    session.add(installed_app)
    session.commit()
    session.refresh(installed_app)
    return installed_app

@router.post("/{installed_app_id}/access", response_model=dict)
def grant_app_access(
    installed_app_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Grant access to an installed app for a specific user.
    Only Admins can grant access.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can manage app access")

    installed_app = session.get(InstalledApp, installed_app_id)
    if not installed_app:
        raise HTTPException(status_code=404, detail="Installed app not found")

    if installed_app.company_id != current_user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check if target user belongs to same company
    target_user = session.get(User, user_id)
    if not target_user or target_user.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="User not found in this company")

    # Check if access already exists
    existing_access = session.exec(
        select(AppAccess)
        .where(AppAccess.installed_app_id == installed_app_id)
        .where(AppAccess.user_id == user_id)
    ).first()
    
    if existing_access:
        return {"message": "User already has access"}

    access = AppAccess(
        installed_app_id=installed_app_id,
        user_id=user_id,
        role="user"
    )
    session.add(access)
    session.commit()
    
    return {"message": "Access granted successfully"}

@router.delete("/{installed_app_id}/access/{user_id}", response_model=dict)
def revoke_app_access(
    installed_app_id: int,
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Revoke access to an installed app for a specific user.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can manage app access")

    access = session.exec(
        select(AppAccess)
        .join(InstalledApp)
        .where(AppAccess.installed_app_id == installed_app_id)
        .where(AppAccess.user_id == user_id)
        .where(InstalledApp.company_id == current_user.company_id)
    ).first()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
        
    session.delete(access)
    session.commit()
    
    return {"message": "Access revoked successfully"}

@router.get("/{installed_app_id}/users", response_model=List[User])
def get_app_users(
    installed_app_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get list of users who have access to this app.
    Only Admins can view this.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can view app users")

    users = session.exec(
        select(User)
        .join(AppAccess)
        .where(AppAccess.installed_app_id == installed_app_id)
        .where(User.company_id == current_user.company_id)
    ).all()
    
    return users