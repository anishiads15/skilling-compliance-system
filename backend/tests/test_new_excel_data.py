"""
Verification script to test that the updated Excel data is being used
as the single source of truth across the application.
"""
import sys
import os
import json
import urllib.request
import urllib.error

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

import excel_service
import server

def main():
    print("=====================================================================")
    print("TESTING UPDATED EXCEL DATA SOURCE OF TRUTH")
    print("=====================================================================")

    # 1. Verify Excel Service Extraction
    data = excel_service.get_all_authorised_records()
    assert data["success"] is True, f"Failed to load Excel records: {data}"
    records = data["records"]
    assert len(records) == 3, f"Expected 3 records, got {len(records)}"

    print("\n--- 1. Extracted Authorised Records ---")
    for r in records:
        print(f"  Name: {r['name']}, Email: {r['email']}, Role: {r['role']}, Centre: {r['access_centres']}")

    emails = {r["email"]: r for r in records}
    assert "gregfurtado94@gmail.com" in emails
    assert "dsilvaanishia@gmail.com" in emails
    assert "anishiads.15@gmail.com" in emails

    assert emails["gregfurtado94@gmail.com"]["name"] == "Greg Furtado"
    assert emails["gregfurtado94@gmail.com"]["role"] == "Government Official"
    assert emails["gregfurtado94@gmail.com"]["centre_id"] is None

    assert emails["dsilvaanishia@gmail.com"]["name"] == "Thomas"
    assert emails["dsilvaanishia@gmail.com"]["role"] == "Training Centre Official"
    assert emails["dsilvaanishia@gmail.com"]["centre_id"] == "TC1"

    assert emails["anishiads.15@gmail.com"]["name"] == "Paul"
    assert emails["anishiads.15@gmail.com"]["role"] == "Training Centre Official"
    assert emails["anishiads.15@gmail.com"]["centre_id"] == "TC2"

    print("--> [PASS] Excel service accurately parsed the 3 updated records.")

    # 2. Test In-Process API Endpoint /api/auth/authorised-records
    client = server.app.test_client()
    res = client.get("/api/auth/authorised-records")
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data["success"] is True
    assert res_data["count"] == 3
    print("--> [PASS] /api/auth/authorised-records returned the 3 updated records.")

    # 3. Test Email Authorisation Checks
    assert excel_service.is_email_authorised("dsilvaanishia@gmail.com") is True
    assert excel_service.is_email_authorised("anishiads.15@gmail.com") is True
    assert excel_service.is_email_authorised("gregfurtado94@gmail.com") is True
    assert excel_service.is_email_authorised("unauthorized@example.com") is False
    print("--> [PASS] is_email_authorised correctly verifies updated emails.")

    # 4. Test Unauthorised Email Rejection on Signup
    res_unauth = client.post("/api/auth/signup/request-otp", json={"email": "unauthorized@example.com"})
    assert res_unauth.status_code == 403
    assert res_unauth.get_json()["message"] == "This email ID cannot be signed in."
    print("--> [PASS] Unauthorised email rejected with 'This email ID cannot be signed in.'")

    # 5. Test Live HTTP endpoint on running server
    url = "http://127.0.0.1:5000/api/auth/authorised-records"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=5) as response:
        http_data = json.loads(response.read().decode())
        assert http_data["success"] is True
        assert http_data["count"] == 3
        print(f"--> [PASS] Live running server at {url} confirms 3 updated records.")

    print("\n=====================================================================")
    print("ALL TESTS PASSED! NEW EXCEL DATA IS FULLY OPERATIONAL.")
    print("=====================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
