"""
Test what the backend API actually returns
"""
import requests
import json

# Test with authentication (you'll need to get a valid token)
url = "http://localhost:8000/api/v1/integrations/monday/boards/5090745546/items?limit=300"

print(f"Testing: {url}")
print("="*60)

try:
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 401:
        print("\n[INFO] 401 Unauthorized - This endpoint requires authentication")
        print("This is expected when testing without a login token")
    elif response.status_code == 200:
        data = response.json()
        print("\n[SUCCESS] Response received!")
        print(f"Response type: {type(data)}")
        print(f"Response keys: {data.keys() if isinstance(data, dict) else 'N/A (array)'}")
        print(f"\nFirst 500 chars of response:")
        print(json.dumps(data, indent=2)[:500])
        
        # Check structure
        if isinstance(data, dict) and 'items' in data:
            print(f"\n✓ Found 'items' key with {len(data['items'])} items")
        elif isinstance(data, list):
            print(f"\n✓ Response is an array with {len(data)} items")
        else:
            print("\n⚠ Unexpected structure!")
    else:
        print(f"\nUnexpected status: {response.status_code}")
        print(response.text[:200])
        
except Exception as e:
    print(f"\n[ERROR] {e}")
