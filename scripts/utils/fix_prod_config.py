import requests
import json
import sys
import getpass

# CONFIG
BASE_URL = "https://backend.abuamarllc.com/api/v1"
USERNAME = "admin@example.com"
PASSWORD = "admin123"

def login():
    print(f"Logging in to {BASE_URL} as {USERNAME}...")
    try:
        data = {
            "username": USERNAME,
            "password": PASSWORD
        }
        res = requests.post(f"{BASE_URL}/auth/login/access-token", data=data)
        res.raise_for_status()
        token = res.json()["access_token"]
        print("Login Successful! 🔓")
        return token
    except Exception as e:
        print(f"Login Failed: {e}")
        try:
            print(res.text)
        except: pass
        return None

def main():
    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get Current Config
    print("\nFetching current Barcode Config...")
    config_res = requests.get(f"{BASE_URL}/integrations/monday/config/barcode", headers=headers)
    if config_res.status_code != 200:
        print("Failed to get config.")
        return
    
    configs = config_res.json()
    if not configs:
        print("No configuration found. Please run the setup first.")
        return

    config = configs[0]
    board_id = config["board_id"]
    current_col_id = config["barcode_column_id"]
    print(f"Current Config: Board {board_id}, Barcode Col: '{current_col_id}'")

    # 2. Get Board Columns
    print(f"\nFetching columns for Board {board_id}...")
    # We use the proxy endpoint or direct board fetch
    board_res = requests.get(f"{BASE_URL}/integrations/monday/boards?limit=100", headers=headers)
    
    if board_res.status_code != 200:
        print(f"Failed to fetch boards: {board_res.text}")
        return

    boards = board_res.json()
    target_board = next((b for b in boards if str(b["id"]) == str(board_id)), None)

    if not target_board:
        print(f"Board {board_id} not found in response.")
        return

    print(f"Found Board: {target_board['name']}")
    print("-" * 50)
    print(f"{'ID':<20} | {'Type':<15} | {'Title'}")
    print("-" * 50)

    columns = target_board["columns"]
    recommended_col = None
    
    for col in columns:
        c_id = col["id"]
        c_type = col["type"]
        c_title = col["title"]
        
        marker = ""
        if c_id == current_col_id:
            marker = " <--- CURRENT (ERROR)"
        
        if c_type == "text" and "barcode" in c_title.lower():
            recommended_col = c_id
            marker = " <--- RECOMMENDED"

        print(f"{c_id:<20} | {c_type:<15} | {c_title}{marker}")

    print("-" * 50)

    # 3. Prompt for Fix
    print("\nThe error you saw (FormulaColumn) means the current column is Read-Only.")
    print("You must select a 'text' column to store the barcode.")
    
    if recommended_col:
        print(f"Recommended Column: {recommended_col}")
    
    new_col_id = input(f"\nEnter the correct Column ID (or press Enter to use '{recommended_col}'): ").strip()
    if not new_col_id and recommended_col:
        new_col_id = recommended_col
    
    if not new_col_id:
        print("Operation cancelled.")
        return

    # 4. Update Config
    print(f"\nUpdating config to use column '{new_col_id}'...")
    payload = {
        "board_id": board_id,
        "barcode_column_id": new_col_id,
        "display_column_ids": config["display_column_ids"]
    }
    
    update_res = requests.post(f"{BASE_URL}/integrations/monday/config/barcode", json=payload, headers=headers)
    
    if update_res.status_code == 200:
        print("✅ SUCCESS! Configuration updated.")
        print("Please restart the mobile app and try scanning again.")
    else:
        print(f"❌ Failed to update: {update_res.text}")

if __name__ == "__main__":
    main()
