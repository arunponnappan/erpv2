import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from sqlmodel import Session, select
from app.database import engine
from app.models.user import User
from app.main import app

# 1. Test App Startup / Model Loading
print("--- Initializing App ---")
try:
    with Session(engine) as session:
        print("Session created. Attempting to fetch a User...")
        user = session.exec(select(User).limit(1)).first()
        print(f"User Check: {user}")
except Exception as e:
    print(f"CRITICAL MODEL ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 2. Test specific endpoint logic (Mocking the request)
print("\n--- Testing Config Save Endpoint Logic ---")
client = TestClient(app)

# We need a token or mock auth, but first let's see if the app even boots without crashing on models.
# If the above passed, then models are likely okayish.

# Try to hit a public endpoint or health check
try:
    response = client.get("/health") # Assuming there is one, or just root
    print(f"Health Check: {response.status_code}")
except Exception as e:
    print(f"Health Check Failed: {e}")
