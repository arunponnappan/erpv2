import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def login():
    response = requests.post(
        f"{BASE_URL}/auth/login/access-token",
        data={"username": "admin@example.com", "password": "admin123"}
    )
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return None
    return response.json()["access_token"]

def debug_save():
    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get Installed Apps to find the ID
    print("Fetching installed apps...")
    resp = requests.get(f"{BASE_URL}/marketplace/installed", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to get apps: {resp.text}")
        return
        
    apps = resp.json()
    if not apps:
        print("No apps installed. Please install Monday.com connector first.")
        return
        
    target_app = None
    for app in apps:
        if app["app"]["name"] == "Monday.com Connector":
            target_app = app
            break
            
    if not target_app:
        print("Monday app not found in installed list.")
        return
        
    app_id = target_app["id"]
    print(f"Found Installed App ID: {app_id}")
    print(f"Current Settings: {target_app.get('settings', {})}")
    
    # 2. Try to update settings
    new_settings = {"api_key": "test_key_12345"}
    print(f"Attempting to save: {new_settings}")
    
    save_resp = requests.put(
        f"{BASE_URL}/marketplace/settings/{app_id}",
        headers=headers,
        json=new_settings
    )
    
    print(f"Save Response Code: {save_resp.status_code}")
    print(f"Save Response Body: {save_resp.text}")
    
    if save_resp.status_code == 200:
        print("✅ Save successful!")
        print(f"Updated Settings: {save_resp.json().get('settings')}")
    else:
        print("❌ Save FAILED.")

if __name__ == "__main__":
    debug_save()
