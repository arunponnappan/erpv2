from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.models.marketplace import MarketplaceApp, InstalledApp, AppAccess
from app.models.company import Company
from app.models.org_structure import Branch
from app.models.hr import Employee
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_installation():
    with Session(engine) as session:
        # Get Admin User
        admin_email = "admin@example.com"
        user = session.exec(select(User).where(User.email == admin_email)).first()
        if not user:
            logger.error(f"User {admin_email} not found")
            return

        logger.info(f"User found: {user.email} (Role: {user.role})")

        # Get App
        app_name = "Monday.com Connector"
        app = session.exec(select(MarketplaceApp).where(MarketplaceApp.name == app_name)).first()
        if not app:
             # Create if missing for test
             app = MarketplaceApp(name=app_name, description="Test app", is_active=True)
             session.add(app)
             session.commit()
             session.refresh(app)
             logger.info(f"Created app: {app.name}")
        else:
            logger.info(f"App found: {app.name} (ID: {app.id})")

        # Simulate Install Logic
        logger.info("--- Starting Installation Simulation ---")
        
        # Check existing
        existing = session.exec(
            select(InstalledApp)
            .where(InstalledApp.company_id == user.company_id)
            .where(InstalledApp.app_id == app.id)
        ).first()

        if existing:
            if not existing.is_active:
                logger.info("Re-activating existing installation...")
                existing.is_active = True
                session.add(existing)
                session.commit()
                logger.info("✅ Re-activation successful.")
                return
            else:
                logger.info("⚠️ App already installed and active.")
                
                # Verify Access
                access_check = session.exec(
                    select(AppAccess)
                    .where(AppAccess.installed_app_id == existing.id)
                    .where(AppAccess.user_id == user.id)
                ).first()
                if access_check:
                     logger.info("✅ Admin access verified.")
                else:
                     logger.warning("❌ Admin access MISSING. Attempting to fix...")
                     access = AppAccess(installed_app_id=existing.id, user_id=user.id, role="admin")
                     session.add(access)
                     session.commit()
                     logger.info("✅ Access fixed.")
                return

        # New Installation
        try:
            logger.info("Creating new installation...")
            installed_app = InstalledApp(
                company_id=user.company_id,
                app_id=app.id,
                is_active=True,
                settings={}
            )
            session.add(installed_app)
            session.commit()
            session.refresh(installed_app)
            logger.info(f"✅ InstalledApp created. ID: {installed_app.id}")

            logger.info("Creating admin access...")
            access = AppAccess(
                installed_app_id=installed_app.id,
                user_id=user.id,
                role="admin"
            )
            session.add(access)
            session.commit()
            session.refresh(access)
            logger.info(f"✅ AppAccess created. ID: {access.id}")

        except Exception as e:
            logger.error(f"❌ Installation FAILED: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_installation()
