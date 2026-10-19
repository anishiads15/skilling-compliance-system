import requests
import json
import base64

BASE_URL = "http://127.0.0.1:5000"

def test_profile_endpoints():
    print("=== Testing Profile Endpoints and Consistency ===")

    # 1. Test Government Official Profile
    print("\n--- Testing Government Official Profile (GrFGov24) ---")
    res = requests.get(f"{BASE_URL}/api/profile?user_id=GrFGov24")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    gov_user = data["user"]
    print("Gov User details returned:", json.dumps(gov_user, indent=2))
    assert gov_user["name"] == "Greg Furtado"
    assert gov_user["role"] == "Government Official"
    assert gov_user["centre_name"] == "All centres", f"Expected All centres, got {gov_user.get('centre_name')}"
    assert gov_user["photo_pending"] == 1
    assert "password" not in gov_user
    print("[OK] Government Official profile fetched successfully with All centres!")

    # 2. Test Trainee Official / TC Official Profile (PaOTrn24 - Paul)
    print("\n--- Testing Trainee Official Profile (PaOTrn24) ---")
    res = requests.get(f"{BASE_URL}/api/profile?user_id=PaOTrn24")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    tc_user = data["user"]
    print("TC User details returned:", json.dumps(tc_user, indent=2))
    assert tc_user["name"] == "Paul"
    assert tc_user["role"] == "Training Centre Official"
    assert tc_user["centre_name"] == "Training Centre 2"
    assert tc_user["photo_pending"] == 1
    assert "password" not in tc_user
    print("[OK] Trainee Official profile fetched successfully with Training Centre 2!")

    # 3. Test Profile Lookup by Email
    print("\n--- Testing Profile Lookup by Email ---")
    res = requests.get(f"{BASE_URL}/api/profile?email=anishiads.15@gmail.com")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json()["user"]["name"] == "Paul"
    print("[OK] Profile lookup by email works!")

    # 4. Test Profile Lookup by Name
    print("\n--- Testing Profile Lookup by Name ---")
    res = requests.get(f"{BASE_URL}/api/profile?name=Paul")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    assert res.json()["user"]["user_id"] == "PaOTrn24"
    print("[OK] Profile lookup by name works!")

    # 5. Test Permitted Updates - Photo Upload and Pending removal
    print("\n--- Testing Permitted Update: Photo Upload ---")
    # Tiny 1x1 transparent PNG in base64
    tiny_png_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    photo_res = requests.post(f"{BASE_URL}/api/profile/upload-photo", json={
        "user_id": "PaOTrn24",
        "photo_url": tiny_png_b64
    })
    assert photo_res.status_code == 200, f"Upload failed: {photo_res.text}"
    photo_data = photo_res.json()
    assert photo_data["success"] is True
    assert photo_data["user"]["photo_pending"] == 0
    assert "photo_url" in photo_data
    print("[OK] Photo upload succeeded, photo_pending set to 0, photo_url returned!")

    # Re-fetch profile to verify persistence in SQLite
    recheck = requests.get(f"{BASE_URL}/api/profile?user_id=PaOTrn24").json()
    assert recheck["user"]["photo_pending"] == 0
    assert recheck["user"]["photo_url"].startswith("/static/demo_assets/profile_")
    print("[OK] SQLite database confirms photo persisted and pending status cleared!")

    # Reset photo to empty to keep initial state clean
    import sqlite3
    conn = sqlite3.connect("compliance.db")
    c = conn.cursor()
    c.execute("UPDATE users SET photo_url = '', photo_pending = 1 WHERE user_id = 'PaOTrn24'")
    conn.commit()
    conn.close()
    print("[OK] Restored Paul to initial photo_pending=1 state for test repeatability.")

    # 6. Test Password Change
    print("\n--- Testing Permitted Update: Password Change ---")
    pw_res = requests.post(f"{BASE_URL}/api/profile/change-password", json={
        "user_id": "PaOTrn24",
        "new_password": "NewSecurePassword123",
        "confirm_password": "NewSecurePassword123"
    })
    assert pw_res.status_code == 200
    assert pw_res.json()["success"] is True
    print("[OK] Profile password update succeeded!")

    print("\n========================================================")
    print("ALL PROFILE TESTS PASSED PERFECTLY!")
    print("========================================================")

if __name__ == "__main__":
    test_profile_endpoints()
