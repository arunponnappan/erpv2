"""
Test if backend is returning items correctly
This simulates what the mobile app does
"""
import requests
import json

# First, we need to login to get a token
login_url = "http://localhost:8000/api/v1/auth/login"
login_data = {
    "username": "admin",  # Replace with your username
    "password": "admin"   # Replace with your password
}

print("Step 1: Logging in...")
try:
    login_response = requests.post(login_url, data=login_data, timeout=10)
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        access_token = token_data.get("access_token")
        print(f"✓ Login successful! Token: {access_token[:30]}...")
        
        # Now test the items endpoint
        print("\nStep 2: Fetching items from board 5090745546...")
        items_url = "http://localhost:8000/api/v1/integrations/monday/boards/5090745546/items?limit=300"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        items_response = requests.get(items_url, headers=headers, timeout=10)
        print(f"Status: {items_response.status_code}")
        
        if items_response.status_code == 200:
            data = items_response.json()
            print(f"\nResponse structure:")
            print(f"  Type: {type(data)}")
            if isinstance(data, dict):
                print(f"  Keys: {list(data.keys())}")
                if 'items' in data:
                    print(f"  Items count: {len(data['items'])}")
                    if len(data['items']) > 0:
                        print(f"\n✓ SUCCESS! Found {len(data['items'])} items")
                        print(f"  First item: {data['items'][0]}")
                    else:
                        print(f"\n✗ PROBLEM: Items array is empty")
                        print(f"  Full response: {json.dumps(data, indent=2)}")
        else:
            print(f"✗ Error: {items_response.status_code}")
            print(f"  Response: {items_response.text[:200]}")
    else:
        print(f"✗ Login failed: {login_response.status_code}")
        print(f"  Response: {login_response.text}")
        
except Exception as e:
    print(f"✗ Error: {e}")
