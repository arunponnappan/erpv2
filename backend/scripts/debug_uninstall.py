from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.company import Company
from app.models.marketplace import MarketplaceApp, InstalledApp
from app.models.rbac import Role, Permission, RolePermission
from app.models.hr import Employee, Department
from app.models.org_structure import Branch, Designation, JobRole

def debug_uninstall():
    with Session(engine) as session:
        print("--- Debugging Uninstall Logic ---")
        
        # 1. Fetch User & Company
        user = session.exec(select(User).where(User.username == "admin")).first()
        if not user:
            print("Admin user not found!")
            return
        print(f"User: {user.username}, Company ID: {user.company_id}")

        # 2. Fetch App
        app = session.exec(select(MarketplaceApp).where(MarketplaceApp.name == "Monday.com Connector")).first()
        if not app:
            print("App not found!")
            return
        print(f"App ID: {app.id}")

        # 3. Check Installation Status
        install = session.exec(
            select(InstalledApp)
            .where(InstalledApp.company_id == user.company_id)
            .where(InstalledApp.app_id == app.id)
            .where(InstalledApp.is_active == True)
        ).first()

        if install:
            print(f"Found ACTIVE installation (ID: {install.id}). Attempting soft delete...")
            
            # Simulate endpoint logic
            install.is_active = False
            session.add(install)
            session.commit()
            session.refresh(install)
            
            print(f"Soft delete committed. New is_active status: {install.is_active}")
            
            # Verify it's gone from active list
            check = session.exec(
                select(InstalledApp)
                .where(InstalledApp.company_id == user.company_id)
                .where(InstalledApp.app_id == app.id)
                .where(InstalledApp.is_active == True)
            ).first()
            if not check:
                print("SUCCESS: App is no longer found in active list.")
            else:
                print("FAILURE: App still found in active list!")
        else:
            print("App is NOT currently installed (or is inactive). attempting to install first...")
            # Install it
            new_install = InstalledApp(
                company_id=user.company_id,
                app_id=app.id,
                is_active=True,
                settings={}
            )
            session.add(new_install)
            session.commit()
            session.refresh(new_install)
            print(f"Installed App ID: {new_install.id}. Run script again to test uninstall.")

if __name__ == "__main__":
    debug_uninstall()
