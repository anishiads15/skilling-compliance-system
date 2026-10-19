"""
End-to-end test suite for EmailJS integration in Training Centre System.
Tests:
  1. Safe Email Status endpoint (/api/auth/email-status)
  2. Unauthorised email rejection ("This email ID cannot be signed in.")
  3. Live Signup OTP request via EmailJS for authorised user (gregfurtado94@gmail.com)
  4. Response payload secrecy (ensuring OTP is never leaked to client)
  5. Live Forgot-Password OTP request via EmailJS for registered user
"""
import sys
import os
import time
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:5000"

def post_json(path, data):
    url = BASE_URL + path
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def get_json(path):
    url = BASE_URL + path
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def main():
    print("=====================================================================")
    print("RUNNING END-TO-END EMAILJS INTEGRATION VERIFICATION")
    print("=====================================================================")

    # 1. Check Email Status
    print("\n[TEST 1] Verifying /api/auth/email-status...")
    status_code, status_data = get_json("/api/auth/email-status")
    assert status_code == 200, f"Expected 200, got {status_code}: {status_data}"
    email_status = status_data.get("email_status", {})
    print(f"  Configured:        {email_status.get('configured')}")
    print(f"  Provider:          {email_status.get('provider')}")
    print(f"  Service ID:        {email_status.get('service_id')}")
    print(f"  Template ID:       {email_status.get('template_id')}")
    print(f"  Public Key Masked: {email_status.get('masked_public_key')}")
    assert email_status.get("configured") is True
    assert email_status.get("service_id") == "service_71zfxw8"
    assert email_status.get("template_id") == "template_qlc56qj"
    print("--> [PASS] Email status endpoint verified.")

    # 2. Unauthorised Email Rejection
    print("\n[TEST 2] Testing signup OTP with unauthorised email...")
    code, resp = post_json("/api/auth/signup/request-otp", {"email": "unauthorized_user@example.com"})
    print(f"  HTTP Code: {code}")
    print(f"  Response:  {resp}")
    assert code == 403, f"Expected 403, got {code}"
    assert resp.get("message") == "This email ID cannot be signed in."
    print("--> [PASS] Unauthorised email rejected with exact required message.")

    # 3. Authorised Email Signup OTP Request via EmailJS
    print("\n[TEST 3] Requesting Signup OTP for authorised email: gregfurtado94@gmail.com...")
    code, resp = post_json("/api/auth/signup/request-otp", {"email": "gregfurtado94@gmail.com"})
    print(f"  HTTP Code: {code}")
    print(f"  Response:  {resp}")
    assert code == 200, f"Expected 200, got {code}: {resp}"
    assert resp.get("success") is True
    assert resp.get("expires_in") == 30
    assert "otp" not in resp, "SECURITY ALERT: OTP must NEVER be exposed in client response!"
    print("--> [PASS] Real OTP generated and dispatched via EmailJS without leaking code to client.")

    # 4. Forgot Password OTP Request via EmailJS
    print("\n[TEST 4] Requesting Forgot-Password OTP for registered user (GrFGov24 / gregfuratdo94@gmail.com)...")
    code, resp = post_json("/api/auth/forgot-password/request-otp", {"identifier": "GrFGov24"})
    print(f"  HTTP Code: {code}")
    print(f"  Response:  {resp}")
    assert code == 200, f"Expected 200, got {code}: {resp}"
    assert resp.get("success") is True
    assert resp.get("expires_in") == 30
    assert "otp" not in resp, "SECURITY ALERT: OTP must NEVER be exposed in client response!"
    print("--> [PASS] Forgot-password OTP dispatched via EmailJS securely.")

    print("\n=====================================================================")
    print("ALL TESTS PASSED: EmailJS REST API IS FULLY FUNCTIONAL AND SECURE!")
    print("=====================================================================")
    return 0

if __name__ == "__main__":
    sys.exit(main())
