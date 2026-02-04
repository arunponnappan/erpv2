
import httpx
import asyncio

async def test_endpoint():
    url = "https://subtentacular-signe-poikilitic.ngrok-free.dev/api/v1/integrations/monday/boards/5090745546/items"
    headers = {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json"
    }
    print(f"Testing URL: {url}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=20.0)
            print(f"Status Code: {response.status_code}")
            if "application/json" in response.headers.get("Content-Type", ""):
                 print("Response is JSON!")
                 print(response.json())
            else:
                 print("Response is NOT JSON:")
                 print(response.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
