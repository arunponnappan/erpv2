
from urllib.parse import quote, urlparse, parse_qs

original_url = "https://prod-euc1-files-monday-com.s3.eu-central-1.amazonaws.com/19852830/resources/184097410/Screenshot%202025-11-17%20103201.png?response-content-disposition=attachment&X-Amz-Algorithm=AWS4-HMAC-SHA256"
encoded_url = quote(original_url) # Logic in JS: encodeURIComponent
proxy_endpoint = f"/api/v1/integrations/monday/proxy?url={encoded_url}&optimize=true&width=400"

print(f"Constructed Proxy URL: {proxy_endpoint}")

# Backend Decoding Logic (FastAPI)
# FastAPI automatically splits query params.
# url = encoded_url (decoded automatically by Starlette? Yes)
decoded_param = original_url 

print(f"Backend receives url param: {decoded_param}")

# Proxy Logic
# domain = urlparse(decoded_param).netloc
domain = urlparse(decoded_param).netloc
print(f"Domain: {domain}")

# should_send_auth
should_send_auth = "monday.com" in domain
print(f"Should Send Auth: {should_send_auth}")
