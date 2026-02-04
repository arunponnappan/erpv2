import requests

URL = "http://127.0.0.1:8000/api/v1/login/access-token"
CREDENTIALS = {
    "username": "admin@example.com",
    "password": "password123",
    "grant_type": "password"
}

try:
    print(f"Attempting login to {URL}...")
    response = requests.post(URL, data=CREDENTIALS)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("SUCCESS: Login worked!")
    else:
        print("FAILURE: Login failed.")

except Exception as e:
    print(f"Error: {e}")
