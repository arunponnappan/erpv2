
import sys
import requests

def check_managed_api():
    url = "https://subtentacular-signe-poikilitic.ngrok-free.dev/api/v1/integrations/monday/config/barcode"
    headers = {"ngrok-skip-browser-warning": "true"}
    print(f"Checking {url}...")
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 401:
            print("Response: 401 Unauthorized (Expected if no token sent)")
        elif resp.status_code == 200:
             print("Response: 200 OK (Auth is disabled or token magically worked?)")
        else:
             print(f"Response: {resp.text[:200]}")
    except Exception as e:
        print(f"Connect Error: {e}")

if __name__ == "__main__":
    check_managed_api()
