import requests
import time
import sys
import json

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
USERNAME = "admin@example.com"
PASSWORD = "admin123" # Default, will try to load from args or env

def login():
    print(f"[*] Authenticating as {USERNAME}...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login/access-token", data={
            "username": USERNAME,
            "password": PASSWORD
        })
        if resp.status_code != 200:
            print(f"[!] Login Failed: {resp.status_code} {resp.text}")
            sys.exit(1)
        token = resp.json()["access_token"]
        print("[+] Authentication Successful")
        return token
    except Exception as e:
        print(f"[!] Connection Refused. Is the backend running at {BASE_URL}?")
        print(f"Error: {e}")
        sys.exit(1)

def get_boards(headers):
    print("[*] Fetching configured boards...")
    resp = requests.get(f"{BASE_URL}/integrations/monday/config/barcode", headers=headers)
    if resp.status_code == 200:
        configs = resp.json()
        if configs:
            print(f"[+] Found {len(configs)} configured boards.")
            return configs
    
    # Fallback to listing boards directly if no config
    print("[*] No barcode config found. Listing all available Monday boards...")
    resp = requests.get(f"{BASE_URL}/integrations/monday/boards?limit=5", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        boards = data.get("boards", []) if isinstance(data, dict) else data
        print(f"[+] Found {len(boards)} raw boards from Monday.")
        return [{"board_id": b["id"], "name": b["name"]} for b in boards]
    
    print(f"[!] Failed to list boards: {resp.status_code} {resp.text}")
    return []

def trigger_sync(headers, board_id):
    print(f"[*] Triggering Data-Only Sync for Board {board_id}...")
    # NOTE: download_images=False tests the "Data Only" logic
    params = {
        "download_images": False,
        "optimize_images": False
    }
    resp = requests.post(f"{BASE_URL}/integrations/monday/boards/{board_id}/sync", headers=headers, params=params)
    if resp.status_code in [200, 202]: # Accepted
        job_data = resp.json()
        job_id = job_data["job_id"]
        print(f"[+] Sync Job Queued! Job ID: {job_id}")
        return job_id
    else:
        print(f"[!] Failed to trigger sync: {resp.status_code} {resp.text}")
        return None

def monitor_job(headers, job_id):
    print(f"[*] Monitoring Job {job_id}...")
    while True:
        resp = requests.get(f"{BASE_URL}/integrations/monday/jobs/{job_id}", headers=headers)
        if resp.status_code != 200:
             print(f"[!] Failed to get job status: {resp.status_code}")
             break
        
        job = resp.json()
        status = job["status"]
        progress = job.get("progress_message", "")
        
        sys.stdout.write(f"\rStatus: {status} | {progress[:50].ljust(50)}")
        sys.stdout.flush()
        
        if status in ["complete", "failed"]:
            print("\n")
            print("-" * 50)
            print(f"Final Status: {status}")
            print(f"Stats: {json.dumps(job.get('stats', {}), indent=2)}")
            if status == "failed":
                 print(f"Logs: {job.get('logs', [])}")
            break
        
        time.sleep(2)

def main():
    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    
    boards = get_boards(headers)
    if not boards:
        print("[!] No boards available to sync. Please configure the app first.")
        return

    # Pick first board
    target_board = boards[0]
    board_id = target_board.get("board_id") or target_board.get("id")
    print(f"[*] Target Board: {board_id}")
    
    job_id = trigger_sync(headers, board_id)
    if job_id:
        monitor_job(headers, job_id)

if __name__ == "__main__":
    main()
