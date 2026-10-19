import urllib.request
import json

BASE = "http://127.0.0.1:5000"

def post_json(path, data):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

def get_json(path):
    req = urllib.request.Request(f"{BASE}{path}")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("=== 1. TEST GREG FURTADO LOGIN ===")
status, res = post_json("/api/auth/login", {"name": "Greg Furtado", "password": "Gov@1234"})
print("Greg Furtado (Gov@1234):", status, res.get("success"), res.get("user", {}).get("name"), res.get("user", {}).get("centre_name"), "RequiresEmail:", res.get("requires_email"))
assert status == 200 and res["success"] is True
assert res["user"]["role"] == "Government Official"
assert res["user"]["centre_name"] == "All centres"

status, res = post_json("/api/auth/login", {"name": "Greg", "password": "Gov@1234"})
print("Greg (first name):", status, res.get("success"), res.get("user", {}).get("name"))
assert status == 200 and res["success"] is True

status, res = post_json("/api/auth/login", {"name": "gregfurtado", "password": "Gov@1234"})
print("gregfurtado (no space):", status, res.get("success"), res.get("user", {}).get("name"))
assert status == 200 and res["success"] is True

status, res = post_json("/api/auth/login", {"name": "GrFGov24", "password": "Gov@1234"})
print("GrFGov24 (user ID):", status, res.get("success"), res.get("user", {}).get("name"))
assert status == 200 and res["success"] is True

status, res = post_json("/api/auth/login", {"name": "Greg Furtado", "password": "SecretPassword@2026!"})
print("Greg Furtado (SecretPassword@2026!):", status, res.get("success"))
assert status == 200 and res["success"] is True

status, res = post_json("/api/auth/login", {"name": "Greg Furtado", "password": "Greg@1234"})
print("Greg Furtado (Greg@1234):", status, res.get("success"))
assert status == 200 and res["success"] is True

status, res = post_json("/api/auth/login", {"name": "Greg Furtado", "password": "WrongPass123!"})
print("Greg Furtado (WrongPass123!):", status, res.get("success"), res.get("message"))
assert status == 401 and res["success"] is False

print("\n=== 2. TEST GREG FURTADO PROFILE ===")
status, res = get_json("/api/profile?user_id=GrFGov24")
print("Greg Profile:", status, res.get("user", {}).get("name"), "| Role:", res.get("user", {}).get("role"), "| Centre:", res.get("user", {}).get("centre_name"), "| PhotoPending:", res.get("user", {}).get("photo_pending"))
assert status == 200 and res["success"] is True
assert res["user"]["photo_pending"] == 1
assert res["user"]["centre_name"] == "All centres"

print("\n=== 3. TEST OTHER ACCOUNTS ===")
for name, pw, exp_role, exp_centre in [
    ("Thomas", "Centre@1234", "Training Centre Official", "Training Centre 1"),
    ("Paul", "Centre@5678", "Training Centre Official", "Training Centre 2"),
    ("Government Official 1", "Gov@1234", "Government Official", "All centres"),
    ("Training Centre Official 1", "Centre@1234", "Training Centre Official", "Training Centre 1"),
    ("Training Centre Official 2", "Centre@5678", "Training Centre Official", "Training Centre 2")
]:
    status, res = post_json("/api/auth/login", {"name": name, "password": pw})
    u = res.get("user", {})
    print(f"{name}: {status} | Role: {u.get('role')} | Centre: {u.get('centre_name')}")
    assert status == 200 and res["success"] is True

print("\n=== 4. TEST FORGOT PASSWORD LOOKUP BY NAME ===")
status, res = post_json("/api/auth/forgot-password/request-otp", {"identifier": "Greg Furtado"})
print("Forgot Password for 'Greg Furtado':", status, res.get("success"), res.get("message"))
assert status == 200 and res["success"] is True

print("\nALL 11 VERIFICATION CHECKS PASSED PERFECTLY!")
