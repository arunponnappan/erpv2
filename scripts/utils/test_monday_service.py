"""
Direct test: Can the backend fetch items from Monday.com?
"""
import sys
sys.path.insert(0, 'backend')

import asyncio
from custom_addons.monday_connector.services import MondayService

# The NEW API key from database
API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYxMjg0NjE1NiwiYWFpIjoxMSwidWlkIjo4MDQ4NDI3NywiaWFkIjoiMjAyNi0wMS0yN1QxNToxMzo1NC4xODNaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTk4NTI4MzAsInJnbiI6ImV1YzEifQ.0V91rL-NT4MZDIvx6XlXZGY0bwgOr-M1h8Sgmy-57lg"

async def test():
    print("Testing MondayService.get_board_items()...")
    print("="*60)
    
    service = MondayService(api_key=API_KEY)
    
    try:
        result = await service.get_board_items(board_id=5090745546, limit=10)
        
        print(f"Success! Result type: {type(result)}")
        print(f"Result keys: {result.keys() if isinstance(result, dict) else 'N/A'}")
        
        if 'items' in result:
            items = result['items']
            print(f"\nItems count: {len(items)}")
            if len(items) > 0:
                print(f"First item: {items[0]}")
            else:
                print("WARNING: Items array is EMPTY!")
                print(f"Full result: {result}")
        else:
            print(f"ERROR: No 'items' key in result!")
            print(f"Result: {result}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
