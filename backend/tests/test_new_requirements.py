"""
In-process and end-to-end test suite for:
1. OTP expiry removal (no 30-second limit, invalidation of previous OTP, no reuse, attempt limiting)
2. Profile registration fields validation (future DOB blocking, joining year checks, Excel conflicts)
3. Profile page persistence & auto-population
4. Unrelated features preservation
"""
import sys
import os
import json
import time

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

import server
import excel_service

def main():
    print("=====================================================================")
    print("STARTING TEST SUITE FOR NEW REQUIREMENTS (IN-PROCESS TEST CLIENT)")
    print("=====================================================================")

    client = server.app.test_client()

    # -------------------------------------------------------------
    # TEST 1: OTP Expiry Removal & Invalidation Behavior
    # -------------------------------------------------------------
    print("\n--- TEST 1: OTP Expiry Removal & Invalidation Behavior ---")

    # Clear any rate limit history for testing
    server.OTP_RATE_LIMITS.clear()
    server.SIGNUP_OTPS.clear()

    # 1. Request OTP for authorised user: gregfurtado94@gmail.com
    res1 = client.post("/api/auth/signup/request-otp", json={"email": "gregfurtado94@gmail.com"})
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.get_json()}"
    data1 = res1.get_json()
    print("Request OTP 1 response:", data1)
    assert data1.get("success") is True
    assert "expires_in" not in data1, "expires_in should not be in response"
    assert "30 seconds" not in data1.get("message", ""), "Message should not mention 30 seconds"

    # Verify SIGNUP_OTPS structure: must NOT contain 'expires_at'
    otp_rec1 = server.SIGNUP_OTPS.get("gregfurtado94@gmail.com")
    assert otp_rec1 is not None, "OTP record must exist in SIGNUP_OTPS"
    assert "expires_at" not in otp_rec1, f"expires_at must be removed from OTP record! Found: {otp_rec1}"
    otp_code1 = otp_rec1["otp"]
    print(f"--> OTP 1 generated: {otp_code1} (no expires_at: verified)")

    # 2. Resend / request a second OTP
    # Clear rate limit so resend succeeds immediately
    server.OTP_RATE_LIMITS["gregfurtado94@gmail.com"] = []
    res2 = client.post("/api/auth/signup/request-otp", json={"email": "gregfurtado94@gmail.com"})
    assert res2.status_code == 200
    otp_rec2 = server.SIGNUP_OTPS.get("gregfurtado94@gmail.com")
    otp_code2 = otp_rec2["otp"]
    print(f"--> OTP 2 generated: {otp_code2}")

    # If new OTP is issued, previous OTP (if different) must be invalidated
    if otp_code1 != otp_code2:
        res_old = client.post("/api/auth/signup/verify-otp", json={"email": "gregfurtado94@gmail.com", "otp": otp_code1})
        print(f"Attempt verify with previous OTP: {res_old.status_code}, {res_old.get_json()}")
        assert res_old.status_code == 400
        print("--> [PASS] Previous outstanding OTP was invalidated upon new OTP issuance.")

    # 3. Limit repeated failed attempts (max 5)
    for i in range(5):
        res_fail = client.post("/api/auth/signup/verify-otp", json={"email": "gregfurtado94@gmail.com", "otp": "0000"})
    print("5 failed attempts submitted. Cache status:", "gregfurtado94@gmail.com" in server.SIGNUP_OTPS)
    assert "gregfurtado94@gmail.com" not in server.SIGNUP_OTPS, "Cache must invalidate after 5 failed attempts!"
    print("--> [PASS] Failed attempt rate limiting confirmed.")

    # 4. Issue fresh OTP and verify
    server.OTP_RATE_LIMITS["gregfurtado94@gmail.com"] = []
    res3 = client.post("/api/auth/signup/request-otp", json={"email": "gregfurtado94@gmail.com"})
    fresh_otp = server.SIGNUP_OTPS["gregfurtado94@gmail.com"]["otp"]
    res_verify = client.post("/api/auth/signup/verify-otp", json={"email": "gregfurtado94@gmail.com", "otp": fresh_otp})
    assert res_verify.status_code == 200
    verify_data = res_verify.get_json()
    signup_token = verify_data["signup_token"]
    print(f"--> [PASS] OTP verified successfully. Token: {signup_token[:8]}...")

    # 5. Prevent OTP reuse
    res_reuse = client.post("/api/auth/signup/verify-otp", json={"email": "gregfurtado94@gmail.com", "otp": fresh_otp})
    assert res_reuse.status_code == 400
    print("--> [PASS] OTP reuse after verification strictly blocked.")

    # 6. Test Forgot-Password OTP without 30s expiry
    server.OTP_RATE_LIMITS.clear()
    server.ACTIVE_RESET_OTPS.clear()
    res_fp = client.post("/api/auth/forgot-password/request-otp", json={"identifier": "GrFGov24"})
    assert res_fp.status_code == 200
    fp_data = res_fp.get_json()
    assert "expires_in" not in fp_data
    assert "30 seconds" not in fp_data.get("message", "")
    for em, rec in server.ACTIVE_RESET_OTPS.items():
        assert "expires_at" not in rec, f"Reset OTP record must not contain expires_at! Found: {rec}"
    print("--> [PASS] Forgot password OTP issued without 30-second expiry.")

    # -------------------------------------------------------------
    # TEST 2: Profile Registration Field Validation & Authorisation
    # -------------------------------------------------------------
    print("\n--- TEST 2: Profile Registration Field Validation & Authorisation ---")

    # A. Future DOB validation
    res_future_dob = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "full_name": "Greg Furtado",
        "dob": "2030-01-01",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Government Official"
    })
    print(f"Future DOB: {res_future_dob.status_code}, {res_future_dob.get_json()}")
    assert res_future_dob.status_code == 400
    assert "future date" in res_future_dob.get_json().get("message", "").lower()
    print("--> [PASS] Future DOB correctly rejected.")

    # B. Unreasonable Joining Year validation
    res_bad_yr = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "full_name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "1960", # Unreasonable
        "qualification": "Master of Technology",
        "role": "Government Official"
    })
    print(f"Unreasonable Year: {res_bad_yr.status_code}, {res_bad_yr.get_json()}")
    assert res_bad_yr.status_code == 400
    assert "joining year" in res_bad_yr.get_json().get("message", "").lower()
    print("--> [PASS] Unreasonable Joining Year correctly rejected.")

    # C. Conflicting Role validation (Not in Excel)
    res_bad_role = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "full_name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "External Auditor"
    })
    print(f"Conflicting Role: {res_bad_role.status_code}, {res_bad_role.get_json()}")
    assert res_bad_role.status_code == 403
    print("--> [PASS] Conflicting role correctly rejected.")

    # D. Conflicting Name validation
    res_bad_name = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "full_name": "Another Person",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Government Official"
    })
    print(f"Conflicting Name: {res_bad_name.status_code}, {res_bad_name.get_json()}")
    assert res_bad_name.status_code == 400
    assert "does not match" in res_bad_name.get_json().get("message", "").lower()
    print("--> [PASS] Conflicting name correctly rejected.")

    # E. Successful registration with optional photo omitted
    res_ok = client.post("/api/auth/signup/complete", json={
        "signup_token": signup_token,
        "full_name": "Greg Furtado",
        "dob": "1994-05-12",
        "year_joined": "2024",
        "qualification": "Master of Technology",
        "role": "Government Official",
        "photo_url": None
    })
    assert res_ok.status_code == 200, f"Registration failed: {res_ok.get_json()}"
    reg_data = res_ok.get_json()
    print("Registration response:", reg_data)
    new_user_id = reg_data["credentials"]["user_id"]
    new_password = reg_data["credentials"]["password"]
    assert reg_data["user"]["photo_pending"] == 1
    print(f"--> [PASS] Registration succeeded! Login ID: {new_user_id}, Initial Password: {new_password}")

    # -------------------------------------------------------------
    # TEST 3: Auto-Populate Profile Details on Login & Persistence
    # -------------------------------------------------------------
    print("\n--- TEST 3: Auto-Populate Profile Details on Login & Persistence ---")
    res_login = client.post("/api/auth/login", json={
        "user_id": new_user_id,
        "password": new_password,
        "role": "Government Official"
    })
    assert res_login.status_code == 200, f"Login failed: {res_login.get_json()}"
    user_prof = res_login.get_json()["user"]
    print("Logged-in user profile details:")
    print(f"  Name:          {user_prof.get('name')}")
    print(f"  DOB:           {user_prof.get('dob')}")
    print(f"  Joining Year:  {user_prof.get('year_joined')}")
    print(f"  Role:          {user_prof.get('role')}")
    print(f"  Email:         {user_prof.get('email')}")
    print(f"  Qualification: {user_prof.get('qualification')}")
    print(f"  Photo Pending: {user_prof.get('photo_pending')}")

    assert user_prof.get("name") == "Greg Furtado"
    assert user_prof.get("dob") == "1994-05-12"
    assert user_prof.get("year_joined") == "2024"
    assert user_prof.get("role") == "Government Official"
    assert user_prof.get("email") == "gregfurtado94@gmail.com"
    assert user_prof.get("qualification") == "Master of Technology"
    assert user_prof.get("photo_pending") == 1
    print("--> [PASS] User Profile populated from persistence layer successfully.")

    # -------------------------------------------------------------
    # TEST 4: Preservation of Unrelated Features
    # -------------------------------------------------------------
    print("\n--- TEST 4: Preservation of Unrelated Features ---")
    res_att = client.get("/api/attendance?centre_id=TC1&date=2026-10-08&session_name=Session%201")
    assert res_att.status_code == 200
    print(f"--> [PASS] Attendance API preserved (total students: {res_att.get_json().get('total_students')}).")

    res_eq = client.get("/api/equipment/issues?centre_id=TC1")
    assert res_eq.status_code == 200
    print(f"--> [PASS] Equipment Issues API preserved (total issues: {len(res_eq.get_json().get('issues', []))}).")

    print("\n=====================================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=====================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
