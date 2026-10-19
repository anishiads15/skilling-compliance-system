"""
Comprehensive In-Process Verification Suite:
1. Signup password creation (Create Password & Re-enter New Password, matching, hashing, no initial password)
2. Login portal with Registered Name & Password (duplicate name resolution with email, invalid credential protection, role & permissions)
3. Forgot Password preservation and reset password login
4. Profile page auto-population and persistence
5. Preservation of unrelated features
"""
import sys
import os
import json
import sqlite3
from werkzeug.security import check_password_hash

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

import server

def main():
    print("=====================================================================")
    print("STARTING TEST SUITE FOR USER-CREATED PASSWORDS & NAME-BASED LOGIN")
    print("=====================================================================")

    client = server.app.test_client()

    test_email = "gregfurtado94@gmail.com"
    custom_password = "SecretPassword@2026!"

    # -----------------------------------------------------------------
    # TEST 1: Password creation during signup
    # -----------------------------------------------------------------
    print("\n--- TEST 1: Signup With User-Created Password ---")
    
    server.OTP_RATE_LIMITS.clear()
    server.SIGNUP_OTPS.clear()

    # 1.1 Request OTP for authorized user
    res_req = client.post("/api/auth/signup/request-otp", json={"email": test_email})
    assert res_req.status_code == 200, f"Request OTP failed: {res_req.get_json()}"
    print(f"--> OTP dispatched to {test_email}")

    current_otp = server.SIGNUP_OTPS[test_email]["otp"]
    print(f"--> In-memory generated OTP: {current_otp}")

    # 1.2 Verify OTP
    res_ver = client.post("/api/auth/signup/verify-otp", json={"email": test_email, "otp": current_otp})
    assert res_ver.status_code == 200, f"Verify OTP failed: {res_ver.get_json()}"
    signup_token = res_ver.get_json()["signup_token"]
    print(f"--> OTP verified. Obtained signup_token: {signup_token[:10]}...")

    # 1.3 Attempt registration without password
    res_np = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Training Centre Official",
        "centre_id": "TC1"
    })
    assert res_np.status_code == 400, f"Expected 400 for missing password: {res_np.get_json()}"
    assert "password" in res_np.get_json().get("message", "").lower()
    print("--> [PASS] Missing password rejected correctly.")

    # 1.4 Attempt registration with mismatching passwords
    res_mm = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Training Centre Official",
        "centre_id": "TC1",
        "password": custom_password,
        "confirm_password": "DifferentPassword!"
    })
    assert res_mm.status_code == 400, f"Expected 400 for mismatching password: {res_mm.get_json()}"
    assert "not match" in res_mm.get_json().get("message", "").lower()
    print("--> [PASS] Mismatching passwords rejected correctly.")

    # 1.5 Attempt registration with short password (<6 chars)
    res_sh = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Training Centre Official",
        "centre_id": "TC1",
        "password": "123",
        "confirm_password": "123"
    })
    assert res_sh.status_code == 400, f"Expected 400 for short password: {res_sh.get_json()}"
    print("--> [PASS] Short password rejected correctly.")

    # 1.6 Successful registration with valid user-created password
    res_reg = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Training Centre Official",
        "centre_id": "TC1",
        "password": custom_password,
        "confirm_password": custom_password
    })
    assert res_reg.status_code == 200, f"Registration failed: {res_reg.get_json()}"
    reg_data = res_reg.get_json()
    new_user_id = reg_data["login_id"]
    registered_user = reg_data["user"]
    assert "initial_password" not in reg_data, "initial_password must NOT be generated or returned!"
    print(f"--> [PASS] Account registered successfully with custom password! Login ID: {new_user_id}")

    # 1.7 Verify SQLite persistence: password MUST be hashed with Werkzeug and not plaintext
    conn = sqlite3.connect("compliance.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE user_id = ?", (new_user_id,))
    stored_hash = c.fetchone()["password"]
    conn.close()

    assert stored_hash != custom_password, "Password MUST NOT be stored in plaintext!"
    assert check_password_hash(stored_hash, custom_password), "Stored hash must match custom password!"
    print(f"--> [PASS] Password securely stored with Werkzeug hashing: {stored_hash[:25]}...")

    # -----------------------------------------------------------------
    # TEST 2: Login portal using Registered Name & Password
    # -----------------------------------------------------------------
    print("\n--- TEST 2: Login Portal (Registered Name & Password) ---")

    # 2.1 Login with wrong password
    res_wp = client.post("/api/auth/login", json={
        "name": "Greg Furtado",
        "password": "IncorrectPassword123"
    })
    # If duplicate names exist, duplicate detection or wrong password error is triggered safely
    assert res_wp.status_code in [400, 401], f"Expected 400 or 401, got {res_wp.status_code}: {res_wp.get_json()}"
    print("--> [PASS] Wrong password rejected safely.")

    # 2.2 Login with non-existent name
    res_nn = client.post("/api/auth/login", json={
        "name": "Nonexistent Person",
        "password": "AnyPassword123"
    })
    assert res_nn.status_code == 401, f"Expected 401, got {res_nn.status_code}: {res_nn.get_json()}"
    assert res_nn.get_json().get("message") == "Invalid Registered Name or Password."
    print("--> [PASS] Non-existent name rejected with generic safe message.")

    # 2.3 Duplicate name handling: "Greg Furtado" exists multiple times in test DB
    res_dup = client.post("/api/auth/login", json={
        "name": "Greg Furtado",
        "password": custom_password
    })
    # Because multiple accounts have name "Greg Furtado", server requires email identifier!
    assert res_dup.get_json().get("requires_email") is True, f"Expected requires_email True for duplicate name, got {res_dup.get_json()}"
    print("--> [PASS] Duplicate name detected safely; requires_email prompt triggered.")

    # 2.4 Login with Registered Name + Registered Email + User-Created Password
    res_ok = client.post("/api/auth/login", json={
        "name": "Greg Furtado",
        "email": test_email,
        "password": custom_password
    })
    assert res_ok.status_code == 200, f"Login with email disambiguation failed: {res_ok.get_json()}"
    logged_in_user = res_ok.get_json()["user"]
    assert logged_in_user["name"] == "Greg Furtado"
    assert logged_in_user["role"] in ["Training Centre Official", "Government Official"]
    assert "password" not in logged_in_user
    print(f"--> [PASS] Logged in successfully! Role: {logged_in_user['role']}, Centre: {logged_in_user.get('centre_id')}")

    # 2.5 Single unique name login: "Government Official 1" (unique name)
    res_gov = client.post("/api/auth/login", json={
        "name": "Government Official 1",
        "password": "Gov@1234"
    })
    assert res_gov.status_code == 200, f"Login for Government Official 1 failed: {res_gov.get_json()}"
    assert res_gov.get_json()["user"]["role"] == "Government Official"
    print("--> [PASS] Unique name login succeeded without requiring email prompt.")

    # -----------------------------------------------------------------
    # TEST 3: Forgot Password preservation & newly reset password login
    # -----------------------------------------------------------------
    print("\n--- TEST 3: Forgot Password Flow & Reset Password Login ---")
    server.OTP_RATE_LIMITS.clear()
    server.ACTIVE_RESET_OTPS.clear()

    res_fpr = client.post("/api/auth/forgot-password/request-otp", json={"email": test_email})
    assert res_fpr.status_code == 200, f"Forgot password OTP request failed: {res_fpr.get_json()}"
    fp_otp = server.ACTIVE_RESET_OTPS[test_email]["otp"]
    print(f"--> Forgot password OTP obtained: {fp_otp}")

    # Verify forgot password OTP
    res_fpv = client.post("/api/auth/forgot-password/verify-otp", json={
        "email": test_email,
        "otp": fp_otp
    })
    assert res_fpv.status_code == 200, f"Forgot password OTP verification failed: {res_fpv.get_json()}"
    reset_token = res_fpv.get_json()["reset_token"]

    # Set new password
    brand_new_pass = "ResetPassword@2026#!"
    res_res = client.post("/api/auth/forgot-password/reset-password", json={
        "reset_token": reset_token,
        "new_password": brand_new_pass,
        "confirm_password": brand_new_pass
    })
    assert res_res.status_code == 200, f"Password reset failed: {res_res.get_json()}"
    print("--> [PASS] Password reset successfully.")

    # Test login with Registered Name and newly reset password
    res_relogin = client.post("/api/auth/login", json={
        "name": "Greg Furtado",
        "email": test_email,
        "password": brand_new_pass
    })
    assert res_relogin.status_code == 200, f"Login with reset password failed: {res_relogin.get_json()}"
    print("--> [PASS] Successfully logged in with newly reset password!")

    # -----------------------------------------------------------------
    # TEST 4: Profile Page Auto-Population & Persistence
    # -----------------------------------------------------------------
    print("\n--- TEST 4: Profile Page Details & Persistence ---")
    res_prof = client.get(f"/api/profile?user_id={new_user_id}")
    assert res_prof.status_code == 200, f"Fetch profile failed: {res_prof.get_json()}"
    prof_user = res_prof.get_json()["user"]
    print(f"  Name:          {prof_user.get('name')}")
    print(f"  Role:          {prof_user.get('role')}")
    print(f"  DOB:           {prof_user.get('dob')}")
    print(f"  Joining Year:  {prof_user.get('year_joined')}")
    print(f"  Email:         {prof_user.get('email')}")
    print(f"  Qualification: {prof_user.get('qualification')}")
    print(f"  Photo Pending: {prof_user.get('photo_pending')}")
    print(f"  Centre:        {prof_user.get('centre_name')}")

    assert prof_user.get("name") == "Greg Furtado"
    assert prof_user.get("dob") == "1994-05-12"
    assert prof_user.get("year_joined") == "2024"
    assert prof_user.get("email") == test_email
    assert prof_user.get("qualification") == "Master of Technology"
    assert prof_user.get("photo_pending") == 1
    assert prof_user.get("centre_name") == "Training Centre 1"
    assert "password" not in prof_user
    print("--> [PASS] Profile details auto-populated from SQLite persistence layer.")

    # -----------------------------------------------------------------
    # TEST 5: Preservation of Unrelated Features
    # -----------------------------------------------------------------
    print("\n--- TEST 5: Preservation of Unrelated Features ---")
    res_att = client.get("/api/attendance?centre_id=TC1")
    assert res_att.status_code == 200, f"Attendance API failed: {res_att.get_json()}"
    print(f"--> [PASS] Attendance API preserved (total students: {res_att.get_json().get('total_students')}).")

    res_eq = client.get("/api/equipment/issues?centre_id=TC1")
    assert res_eq.status_code == 200, f"Equipment Issues API failed: {res_eq.get_json()}"
    print(f"--> [PASS] Equipment Issues API preserved (total issues: {len(res_eq.get_json().get('issues', []))}).")

    print("\n=====================================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=====================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
