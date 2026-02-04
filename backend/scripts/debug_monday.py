import asyncio
from app.services.monday_service import MondayService

async def debug_monday():
    print("Initializing MondayService...")
    try:
        # Use a dummy key to test safe failure
        service = MondayService(api_key="dummy_key")
        print("Service initialized.")
        
        print("Testing connection (expecting failure due to dummy key)...")
        success = await service.test_connection()
        print(f"Connection test result: {success}")
        
    except Exception as e:
        print(f"CRASHED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_monday())
