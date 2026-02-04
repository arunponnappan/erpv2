
import urllib.request
import sys

def check_url(url):
    try:
        with urllib.request.urlopen(url) as response:
            print(f"✅ {url} returned status: {response.status}")
            return True
    except Exception as e:
        print(f"❌ {url} failed: {e}")
        return False

print("Checking Backend Connectivity...")
root_ok = check_url("http://127.0.0.1:8000/")
docs_ok = check_url("http://127.0.0.1:8000/docs")

if root_ok or docs_ok:
    print("Backend is RUNNING.")
else:
    print("Backend is NOT RUNNING.")
