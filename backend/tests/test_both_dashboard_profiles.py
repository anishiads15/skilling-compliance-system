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

print("=== VERIFYING USER PROFILES FOR BOTH DASHBOARD TYPES ===")

test_users = [
    # Government Officials
    {
        "type": "Government Official Dashboard",
        "login_name": "Greg Furtado",
        "login_pw": "Gov@1234",
        "expected_user_id": "GrFGov24",
        "expected_name": "Greg Furtado",
        "expected_role": "Government Official",
        "expected_dob": "1994-05-12",
        "expected_joining": "2024",
        "expected_email": "gregfurtado94@gmail.com",
        "expected_qual": "Master of Technology",
        "expected_centre": "All centres",
        "expected_photo_pending": 1,
    },
    {
        "type": "Government Official Dashboard",
        "login_name": "Government Official 1",
        "login_pw": "Gov@1234",
        "expected_user_id": "GOV001",
        "expected_name": "Government Official 1",
        "expected_role": "Government Official",
        "expected_dob": "10/05/1978",
        "expected_joining": "2024",
        "expected_email": "gov.official@skilling.gov.in",
        "expected_qual": "M.Sc, Ph.D (Public Administration)",
        "expected_centre": "All centres",
        "expected_photo_pending": 0,
    },
    # Trainee Officials / Training Centre Officials
    {
        "type": "Trainee Official Dashboard",
        "login_name": "Paul",
        "login_pw": "Centre@5678",
        "expected_user_id": "PaOTrn24",
        "expected_name": "Paul",
        "expected_role": "Training Centre Official",
        "expected_dob": "1991-06-11",
        "expected_joining": "2024",
        "expected_email": "anishiads.15@gmail.com",
        "expected_qual": "BSc in Computer science",
        "expected_centre": "Training Centre 2",
        "expected_photo_pending": 1,
    },

    {
        "type": "Trainee Official Dashboard",
        "login_name": "Training Centre Official 1",
        "login_pw": "Centre@1234",
        "expected_user_id": "TC001",
        "expected_name": "Training Centre Official 1",
        "expected_role": "Training Centre Official",
        "expected_dob": "15/08/1985",
        "expected_joining": "2024",
        "expected_email": "tc001@skilling.gov.in",
        "expected_qual": "B.Tech (Electrical Engineering)",
        "expected_centre": "Training Centre 1",
        "expected_photo_pending": 0,
    },
    {
        "type": "Trainee Official Dashboard",
        "login_name": "Training Centre Official 2",
        "login_pw": "Centre@5678",
        "expected_user_id": "TC002",
        "expected_name": "Training Centre Official 2",
        "expected_role": "Training Centre Official",
        "expected_dob": "22/11/1988",
        "expected_joining": "2024",
        "expected_email": "tc002@skilling.gov.in",
        "expected_qual": "M.Tech (Mechanical Engineering)",
        "expected_centre": "Training Centre 2",
        "expected_photo_pending": 0,
    }
]

for idx, tc in enumerate(test_users, 1):
    print(f"\n[{idx}] Testing {tc['type']} for {tc['login_name']} ({tc['expected_user_id']})...")
    # 1. Login
    st, login_resp = post_json("/api/auth/login", {"name": tc["login_name"], "password": tc["login_pw"]})
    assert st == 200, f"Login failed for {tc['login_name']}: {login_resp}"
    user_login = login_resp["user"]

    # 2. Profile API fetch (as client does on profile page load)
    st, profile_resp = get_json(f"/api/profile?user_id={tc['expected_user_id']}")
    assert st == 200, f"Profile fetch failed for {tc['expected_user_id']}: {profile_resp}"
    user_prof = profile_resp["user"]

    # Verify each registered field
    assert user_prof["name"] == tc["expected_name"], f"Name mismatch: {user_prof['name']} != {tc['expected_name']}"
    assert user_prof["role"] == tc["expected_role"], f"Role mismatch: {user_prof['role']} != {tc['expected_role']}"
    assert user_prof["email"] == tc["expected_email"], f"Email mismatch: {user_prof['email']} != {tc['expected_email']}"
    assert user_prof["dob"] == tc["expected_dob"], f"DOB mismatch: {user_prof['dob']} != {tc['expected_dob']}"
    assert (user_prof.get("date_of_joining") or user_prof.get("year_joined")) == tc["expected_joining"], "Joining mismatch"
    assert user_prof["qualification"] == tc["expected_qual"], f"Qualification mismatch: {user_prof['qualification']} != {tc['expected_qual']}"
    assert (user_prof.get("training_centre_allotted") or user_prof.get("centre_name")) == tc["expected_centre"], f"Centre mismatch: {user_prof.get('centre_name')} != {tc['expected_centre']}"
    assert user_prof.get("photo_pending", 0) == tc["expected_photo_pending"], "Photo pending mismatch"

    print(f"  [OK] Full Name: {user_prof['name']}")
    print(f"  [OK] Date of Birth (DOB): {user_prof['dob']}")
    print(f"  [OK] Date of Joining: {user_prof.get('date_of_joining') or user_prof.get('year_joined')}")
    print(f"  [OK] Email ID: {user_prof['email']}")
    print(f"  [OK] Qualification: {user_prof['qualification']}")
    print(f"  [OK] Training Centre Allotted: {user_prof.get('training_centre_allotted') or user_prof.get('centre_name')}")
    print(f"  [OK] Photo Status: {'Pending (Badge displayed)' if user_prof.get('photo_pending') == 1 else 'Uploaded (' + user_prof.get('photo_url') + ')'}")
    print(f"  [OK] Role: {user_prof['role']}")
    print(f"  [OK] User ID: {user_prof['user_id']}")

print("\n=======================================================")
print("ALL PROFILE TESTS FOR BOTH DASHBOARD TYPES PASSED 100%!")
print("=======================================================")
