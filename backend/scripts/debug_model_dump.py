from app.models.marketplace import InstalledAppRead, InstalledApp, MarketplaceApp

def debug_dump():
    print("--- Debugging Model Dump ---")
    
    app = MarketplaceApp(id=1, name="Test App", description="Desc")
    install = InstalledApp(id=10, company_id=1, app_id=1, is_active=True, app=app)
    
    try:
        read_model = InstalledAppRead.model_validate(install)
        print("Model Validated Successfully.")
        print(f"Dumped Data: {read_model.model_dump()}")
        
        if "app_id" in read_model.model_dump():
            print("SUCCESS: app_id is present.")
        else:
            print("FAILURE: app_id is MISSING.")
            
    except Exception as e:
        print(f"Validation Error: {e}")

if __name__ == "__main__":
    debug_dump()
