
from sqlmodel import Session, create_engine, select
from app.database import engine
from custom_addons.monday_connector.models import MondayItem
import json

def check_items():
    with Session(engine) as session:
        # Get one item from a board (any board)
        item = session.exec(select(MondayItem).where(MondayItem.assets != {})).first()
        if not item:
            print("No items with assets found in DB.")
            return
        
        print(f"Item Name: {item.name}")
        print(f"Assets Map Keys: {list(item.assets.keys())}")
        for aid, data in item.assets.items():
            print(f"Asset {aid}:")
            print(f"  Local Path: {data.get('local_path')}")
            print(f"  Optimized Path: {data.get('optimized_path')}")
            print(f"  Public URL: {data.get('public_url') or data.get('url')[:50] + '...' if data.get('url') else 'None'}")

if __name__ == "__main__":
    check_items()
