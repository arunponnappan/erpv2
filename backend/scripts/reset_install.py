from sqlmodel import Session, select, text
from app.database import engine
from app.models.user import User
from app.models.marketplace import MarketplaceApp, InstalledApp, AppAccess

def clean_install_data():
    with Session(engine) as session:
        print("Cleaning up installation data...")
        
        # Get App
        app = session.exec(select(MarketplaceApp).where(MarketplaceApp.name == "Monday.com Connector")).first()
        if not app:
            print("App not found.")
            return

        # Delete Access
        print("Deleting access records...")
        session.exec(text(f"DELETE FROM appaccess WHERE installed_app_id IN (SELECT id FROM installedapp WHERE app_id = {app.id})"))
        
        # Delete Installation
        print("Deleting installation records...")
        session.exec(text(f"DELETE FROM installedapp WHERE app_id = {app.id}"))
        
        session.commit()
        print("✅ Cleaned up successfully. You can now try installing from the UI.")

if __name__ == "__main__":
    clean_install_data()
