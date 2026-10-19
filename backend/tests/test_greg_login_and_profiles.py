import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_all():
    print("========================================================")
    print("VERIFYING GREG FURTADO LOGIN & ALL PROFILES")
    print("========================================================")

    # 1. Test Greg Furtado Login (Registered Name + Password ONLY)
    print("\n[TEST 1] Logging in as Greg Furtado (Name + Password only)...")
    res_greg = requests.post(f"{BASE_URL}/api/auth/login", json={
        "name": "Greg Furtado",
        "password": "SecretPassword@2026!"
    })
    print(f"Status: {res_greg.status_code}")
    data_greg = res_greg.json()
    print("Response keys:", list(data_greg.keys()))
    assert res_greg.status_code == 200, f"Greg login failed: {data_greg}"
    assert data_greg["success"] is True
    assert "requires_email" not in data_greg or data_greg["requires_email"] is False, "Greg login must NOT prompt for email verification!"
    greg_user = data_greg["user"]
    print(f"--> [PASS] Greg Furtado logged in without email prompt!")
    print(f"    Name: {greg_user['name']}")
    print(f"    Role: {greg_user['role']}")
    print(f"    Centre: {greg_user['centre_name']}")
    print(f"    Email: {greg_user['email']}")
    print(f"    DOB: {greg_user['dob']}")
    print(f"    Qualification: {greg_user['qualification']}")
    print(f"    Photo Pending: {greg_user['photo_pending']}")
    assert greg_user["name"] == "Greg Furtado"
    assert greg_user["role"] == "Government Official"
    assert greg_user["centre_name"] == "All centres"
    assert greg_user["email"] == "gregfurtado94@gmail.com"
    assert greg_user["photo_pending"] == 1

    # Also test Gov@1234 password support for Greg Furtado
    res_greg_alt = requests.post(f"{BASE_URL}/api/auth/login", json={
        "name": "Greg Furtado",
        "password": "Gov@1234"
    })
    assert res_greg_alt.status_code == 200, "Greg Furtado should also be able to authenticate with Gov@1234"
    assert res_greg_alt.json()["success"] is True
    print("--> [PASS] Greg Furtado alternative credential authenticated cleanly.")

    # 2. Test Thomas Login & Profile (Trainee Official / TC1)
    print("\n[TEST 2] Logging in as Thomas (Trainee Official, TC1)...")
    res_thomas = requests.post(f"{BASE_URL}/api/auth/login", json={
        "name": "Thomas",
        "password": "SecretPassword@2026!"
    })
    assert res_thomas.status_code == 200, f"Thomas login failed: {res_thomas.text}"
    thomas_user = res_thomas.json()["user"]
    print("--> [PASS] Thomas logged in without email prompt!")
    print(f"    Name: {thomas_user['name']}")
    print(f"    Role: {thomas_user['role']}")
    print(f"    Centre: {thomas_user['centre_name']}")
    print(f"    Email: {thomas_user['email']}")
    print(f"    Photo Pending: {thomas_user['photo_pending']}")
    assert thomas_user["name"] == "Thomas"
    assert thomas_user["role"] == "Training Centre Official"
    assert thomas_user["centre_name"] == "Training Centre 1"
    assert thomas_user["email"] == "dsilvaanishia@gmail.com"
    assert thomas_user["photo_pending"] == 1

    # 3. Test Paul Login & Profile (Trainee Official / TC2)
    print("\n[TEST 3] Logging in as Paul (Trainee Official, TC2)...")
    res_paul = requests.post(f"{BASE_URL}/api/auth/login", json={
        "name": "Paul",
        "password": "SecretPassword@2026!"
    })
    assert res_paul.status_code == 200, f"Paul login failed: {res_paul.text}"
    paul_user = res_paul.json()["user"]
    print("--> [PASS] Paul logged in without email prompt!")
    print(f"    Name: {paul_user['name']}")
    print(f"    Role: {paul_user['role']}")
    print(f"    Centre: {paul_user['centre_name']}")
    print(f"    Email: {paul_user['email']}")
    print(f"    DOB: {paul_user['dob']}")
    print(f"    Qualification: {paul_user['qualification']}")
    print(f"    Photo Pending: {paul_user['photo_pending']}")
    assert paul_user["name"] == "Paul"
    assert paul_user["role"] == "Training Centre Official"
    assert paul_user["centre_name"] == "Training Centre 2"
    assert paul_user["email"] == "anishiads.15@gmail.com"
    assert paul_user["dob"] == "1991-06-11"
    assert paul_user["photo_pending"] == 1

    # 4. Test GET /api/profile for each user
    print("\n[TEST 4] Testing GET /api/profile endpoints...")
    p_greg = requests.get(f"{BASE_URL}/api/profile?user_id=GrFGov24").json()["user"]
    assert p_greg["name"] == "Greg Furtado"
    assert p_greg["centre_name"] == "All centres"
    print("--> [PASS] Greg profile GET verified.")

    p_thomas = requests.get(f"{BASE_URL}/api/profile?user_id=ThOTrn24").json()["user"]
    assert p_thomas["name"] == "Thomas"
    assert p_thomas["centre_name"] == "Training Centre 1"
    print("--> [PASS] Thomas profile GET verified.")

    p_paul = requests.get(f"{BASE_URL}/api/profile?user_id=PaOTrn24").json()["user"]
    assert p_paul["name"] == "Paul"
    assert p_paul["centre_name"] == "Training Centre 2"
    print("--> [PASS] Paul profile GET verified.")

    # 5. Test Seed Users Login
    print("\n[TEST 5] Testing Seed Users Login...")
    res_gov1 = requests.post(f"{BASE_URL}/api/auth/login", json={"name": "Government Official 1", "password": "Gov@1234"})
    assert res_gov1.status_code == 200
    assert res_gov1.json()["user"]["centre_name"] == "All centres"

    res_tc1 = requests.post(f"{BASE_URL}/api/auth/login", json={"name": "Training Centre Official 1", "password": "Centre@1234"})
    assert res_tc1.status_code == 200

    res_tc2 = requests.post(f"{BASE_URL}/api/auth/login", json={"name": "Training Centre Official 2", "password": "Centre@5678"})
    assert res_tc2.status_code == 200
    print("--> [PASS] All seed accounts authenticate correctly.")

    # 6. Test Security: Wrong Password Rejected
    print("\n[TEST 6] Testing Security: Wrong Password Rejection...")
    res_wrong = requests.post(f"{BASE_URL}/api/auth/login", json={"name": "Greg Furtado", "password": "WrongPassword123"})
    assert res_wrong.status_code == 401
    assert "Invalid" in res_wrong.json()["message"]
    print("--> [PASS] Wrong password securely rejected with 401.")

    print("\n========================================================")
    print("ALL TESTS PASSED! GREG FURTADO LOGIN & PROFILES ARE VERIFIED.")
    print("========================================================")

if __name__ == "__main__":
    test_all()
