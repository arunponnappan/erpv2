import requests

def test_api():
    url = "http://localhost:8000/api/v1/login/access-token"
    payload = {
        "username": "admin@example.com",
        "password": "admin123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    # requests.post automatically form-encodes `data` dictionary
    try:
        response = requests.post(url, data=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == "__main__":
    test_api()
