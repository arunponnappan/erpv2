import asyncio
from sqlmodel import Session, select
from app.database import engine
from app.models.marketplace import InstalledApp
from app.models.company import Company # Added to resolve relationship
from app.services.monday_service import MondayService
import json

async def inspect_columns():
    with Session(engine) as session:
        # Find Monday app (assuming app_id=1 based on previous context, or just check name)
        # Actually let's just find any app with an api_key in settings
        apps = session.exec(select(InstalledApp)).all()
        target_app = None
        for app in apps:
            if app.settings and app.settings.get("api_key"):
                target_app = app
                break
        
        if not target_app:
            print("No installed app with API key found.")
            return

        api_key = target_app.settings.get("api_key")
        print(f"Found API Key: {api_key[:5]}...")

        service = MondayService(api_key=api_key)
        
        # 1. Get Boards
        print("Fetching boards...")
        boards = await service.get_boards(limit=5)
        if not boards:
            print("No boards found.")
            return
            
        board_id = boards[0]['id']
        print(f"Inspecting Board: {boards[0]['name']} (ID: {board_id})")
        
        # 2. Get Items
        print("Fetching items...")
        items = await service.get_board_items(board_id=board_id, limit=5)
        
        for item in items:
            print(f"\nItem: {item['name']} (ID: {item['id']})")
            for col in item['column_values']:
                # Print interesting columns (likely to be files)
                # We interpret 'value' which is a JSON string
                val_str = col.get('value')
                text = col.get('text')
                print(f"  Column [{col['id']}]: Text='{text}'")
                if val_str:
                    try:
                        val_json = json.loads(val_str)
                        print(f"    Raw Value JSON: {json.dumps(val_json, indent=2)}")
                    except:
                        print(f"    Raw Value: {val_str}")
            
            # Check subitems if any
            if item.get('subitems'):
                print("  Subitems found, inspecting first one...")
                sub = item['subitems'][0]
                for col in sub['column_values']:
                    val_str = col.get('value')
                    print(f"     [Sub] Column [{col['id']}]: Text='{col.get('text')}' Value='{val_str}'")

if __name__ == "__main__":
    asyncio.run(inspect_columns())
