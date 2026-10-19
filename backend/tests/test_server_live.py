import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:5000"

def post(url, data):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def get(url):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("=== 1. Testing GET /api/auth/authorised-records ===")
status, data = get(f"{BASE_URL}/api/auth/authorised-records")
print(f"Status: {status}, Response: {data}")
assert status == 200
assert data["success"] is True
records = data["records"]
assert len(records) == 3
emails = [r["email"] for r in records]
print(f"Authorised emails in records: {emails}")
assert "gregfurtado94@gmail.com" in emails
assert "gregfuratdo94@gmail.com" not in emails
print("--> Confirmed: Excel sheet loaded as single source of truth!")

print("\n=== 2. Testing Unauthorized Email Request ===")
status, data = post(f"{BASE_URL}/api/auth/signup/request-otp", {"email": "stranger@gmail.com"})
print(f"Status: {status}, Response: {data}")
assert status == 403
assert data["message"] == "This email ID cannot be signed in."
print("--> Confirmed: Unauthorized email blocked with exact required error message.")

print("\n=== 3. Testing Old Typo Email Request ===")
status, data = post(f"{BASE_URL}/api/auth/signup/request-otp", {"email": "gregfuratdo94@gmail.com"})
print(f"Status: {status}, Response: {data}")
assert status == 403
assert data["message"] == "This email ID cannot be signed in."
print("--> Confirmed: Old PDF typo is strictly rejected; only Excel is used.")

print("\n=== 4. Testing Real OTP Request without SMTP Credentials Configured ===")
status, data = post(f"{BASE_URL}/api/auth/signup/request-otp", {"email": "gregfurtado94@gmail.com"})
print(f"Status: {status}, Response: {data}")
assert status == 503
assert data["success"] is False
assert "debug_otp" not in data
assert not data.get("smtp_configured", True)
assert "Missing required SMTP settings" in data["message"] or "not configured" in data["message"]
print("--> Confirmed: Real email delivery requirement enforced; server refuses to simulate delivery when SMTP is unconfigured.")

print("\n=== 5. Testing Existing Seed Logins ===")
for user_id, pwd in [("GOV001", "Gov@1234"), ("TC001", "Centre@1234"), ("TC002", "Centre@5678")]:
    status, data = post(f"{BASE_URL}/api/auth/login", {"user_id": user_id, "password": pwd})
    assert status == 200, f"Login failed for {user_id}"
    assert data["success"] is True
    print(f"  Login verified for {user_id}: Role={data['user']['role']}, Centre={data['user'].get('centre_id')}")

print("\n=======================================================")
print("ALL SERVER LIVE API CHECKS PASSED PERFECTLY!")
print("=======================================================")
