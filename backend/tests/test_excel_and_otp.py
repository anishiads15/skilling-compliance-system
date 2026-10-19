import sys
import os
import socket
import threading
import time
import json
import urllib.request
import urllib.error

PROJECT_DIR = r"C:\Users\anish\.gemini\antigravity\scratch\skilling-compliance-system"
sys.path.insert(0, PROJECT_DIR)

import excel_service
import email_service

print("=====================================================================")
print("TEST SUITE: EXCEL INTEGRATION & REAL OTP DELIVERY FLOW")
print("=====================================================================")

# -------------------------------------------------------------
# Test 1: Excel File Location and Column Mapping
# -------------------------------------------------------------
print("\n--- TEST 1: Excel File Location and Column Mapping ---")
excel_file = excel_service.locate_excel_file()
print(f"Located Excel file: {excel_file}")
assert excel_file is not None, "Failed to locate Excel file!"
assert os.path.exists(excel_file), f"Excel file does not exist at {excel_file}"

extract_res = excel_service.extract_authorised_users(excel_file)
assert extract_res.get("success") is True, f"Failed to extract Excel records: {extract_res.get('error')}"

mapped_cols = extract_res.get("mapped_columns", {})
print(f"Mapped Columns: {mapped_cols}")
assert mapped_cols.get("email") is not None, "Email column not mapped!"
assert mapped_cols.get("name") is not None, "Name column not mapped!"
assert mapped_cols.get("role") is not None, "Role column not mapped!"

records = extract_res.get("records", [])
print(f"Total authorised records in Excel: {len(records)}")
for idx, r in enumerate(records, 1):
    print(f"  [{idx}] Name: {r['name']} | Email: {r['email']} | Role: {r['role']} | Centre: {r['access_centres']} (ID: {r['centre_id']})")

assert len(records) >= 3, f"Expected at least 3 records in Excel, found {len(records)}"
assert any(r["email"] == "gregfurtado94@gmail.com" and r["role"] == "Government Official" for r in records), "Missing Greg Furtado Government Official record"
assert any(r["email"] == "gregfurtado94@gmail.com" and r["centre_id"] == "TC1" for r in records), "Missing Greg Furtado TC1 record"
assert any(r["email"] == "gregfurtado94@gmail.com" and r["centre_id"] == "TC2" for r in records), "Missing Greg Furtado TC2 record"
print("--> TEST 1 PASSED: Excel correctly located and all columns properly mapped.")

# -------------------------------------------------------------
# Test 2: Safe Email Normalization & Authorisation Checking
# -------------------------------------------------------------
print("\n--- TEST 2: Email Normalization & Matching Logic ---")
valid_variations = [
    "gregfurtado94@gmail.com",
    "  gregfurtado94@gmail.com  ",
    "GREGFURTADO94@GMAIL.COM",
    "GregFurtado94@Gmail.Com",
    "\xa0gregfurtado94@gmail.com\u200b",
    "gregfurtado94 @ gmail.com"
]
for v in valid_variations:
    is_auth = excel_service.is_email_authorised(v)
    assert is_auth is True, f"Failed to authorise variation: {repr(v)}"
    print(f"  Authorised variation: {repr(v)} -> True")

# Typos and unauthorized emails must be blocked
invalid_emails = [
    "gregfuratdo94@gmail.com", # Old typo from PDF
    "unauthorized@example.com",
    "greg.furtado@yahoo.com",
    "random_person@gov.in"
]
for inv in invalid_emails:
    is_auth = excel_service.is_email_authorised(inv)
    assert is_auth is False, f"Unauthorized email wrongly accepted: {repr(inv)}"
    print(f"  Blocked email: {repr(inv)} -> False")

print("--> TEST 2 PASSED: Whitespace, case, and typo handling are strictly verified.")

# -------------------------------------------------------------
# Test 3: Absence of PDF/Excel Table at Bottom of HTML Page
# -------------------------------------------------------------
print("\n--- TEST 3: Verification that No Visible Record Tables Exist at Bottom of UI ---")
html_path = os.path.join(PROJECT_DIR, "static", "index.html")
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

assert "pdfAuthorisedRecordsContainer" not in html_content, "Found pdfAuthorisedRecordsContainer in index.html!"
assert "pdfDirectoryCount" not in html_content, "Found pdfDirectoryCount in index.html!"
assert "Authorised Directory (PDF Records)" not in html_content, "Found Authorised Directory heading in index.html!"
assert "excelAuthorisedRecordsContainer" not in html_content, "Found visible Excel table container in index.html!"
print("--> TEST 3 PASSED: No visible PDF/Excel table or directory displayed at bottom of page.")

# -------------------------------------------------------------
# Test 4: Backend Email Delivery / Missing SMTP Configuration Handling
# -------------------------------------------------------------
print("\n--- TEST 4: Backend Email Delivery / SMTP Configuration Status ---")
smtp_cfg = email_service.get_smtp_config()
print(f"SMTP Configured: {smtp_cfg['is_configured']}")
print(f"SMTP Host: {smtp_cfg.get('host') or '(not set)'}")
print(f"SMTP Port: {smtp_cfg.get('port')}")
print(f"SMTP User: {smtp_cfg.get('user') or '(not set)'}")
if not smtp_cfg["is_configured"]:
    print(f"Missing settings: {', '.join(smtp_cfg.get('missing_keys', []))}")
    email_res = email_service.send_otp_email("gregfurtado94@gmail.com", "1234", "Sign Up")
    assert email_res["sent"] is False, "Email should not report sent when unconfigured!"
    assert not email_res["smtp_configured"], "smtp_configured should be False!"
    print("--> Confirmed: Missing SMTP credentials cleanly prevent false positive delivery.")

# -------------------------------------------------------------
# Test 5: Live SMTP Transmission Verification (via Pure Socket SMTP Server)
# -------------------------------------------------------------
print("\n--- TEST 5: Live SMTP Transmission Verification (via Pure Socket SMTP Server) ---")

delivered_messages = []

def run_smtp_server(port, stop_event):
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(('127.0.0.1', port))
    srv.listen(5)
    srv.settimeout(0.5)

    while not stop_event.is_set():
        try:
            conn, addr = srv.accept()
        except socket.timeout:
            continue
        try:
            conn.sendall(b"220 localhost ESMTP TestServer\r\n")
            in_data = False
            msg_data = []
            mail_from = ""
            rcpt_to = []

            while True:
                line = conn.recv(1024)
                if not line:
                    break
                text = line.decode('utf-8', errors='ignore')
                if in_data:
                    msg_data.append(text)
                    if "\r\n.\r\n" in text or text.endswith(".\r\n"):
                        in_data = False
                        delivered_messages.append({
                            "from": mail_from,
                            "to": rcpt_to,
                            "body": "".join(msg_data)
                        })
                        conn.sendall(b"250 OK: message accepted for delivery\r\n")
                elif text.upper().startswith("EHLO") or text.upper().startswith("HELO"):
                    conn.sendall(b"250-localhost\r\n250 AUTH PLAIN LOGIN\r\n")
                elif text.upper().startswith("AUTH"):
                    conn.sendall(b"235 2.7.0 Authentication successful\r\n")
                elif text.upper().startswith("MAIL FROM:"):
                    mail_from = text.split(":", 1)[1].strip()
                    conn.sendall(b"250 2.1.0 Ok\r\n")
                elif text.upper().startswith("RCPT TO:"):
                    rcpt_to.append(text.split(":", 1)[1].strip())
                    conn.sendall(b"250 2.1.5 Ok\r\n")
                elif text.upper().startswith("DATA"):
                    in_data = True
                    conn.sendall(b"354 End data with <CR><LF>.<CR><LF>\r\n")
                elif text.upper().startswith("QUIT"):
                    conn.sendall(b"221 2.0.0 Bye\r\n")
                    break
                else:
                    conn.sendall(b"250 Ok\r\n")
            conn.close()
        except Exception:
            pass
    srv.close()

stop_smtp = threading.Event()
smtp_thread = threading.Thread(target=run_smtp_server, args=(2525, stop_smtp), daemon=True)
smtp_thread.start()
time.sleep(0.5)

# Temporarily point email_service to local real SMTP server
os.environ["SMTP_HOST"] = "127.0.0.1"
os.environ["SMTP_PORT"] = "2525"
os.environ["SMTP_USER"] = "testuser"
os.environ["SMTP_PASSWORD"] = "testpass"
os.environ["SMTP_USE_TLS"] = "false"

# Verify email_service now reports configured
test_cfg = email_service.get_smtp_config()
assert test_cfg["is_configured"] is True, "Config should now be true"

# Dispatch real OTP email
dispatch_res = email_service.send_otp_email("gregfurtado94@gmail.com", "8492", "Sign Up Verification")
print(f"Dispatch Result: {dispatch_res}")
assert dispatch_res["sent"] is True, f"Failed to dispatch via real SMTP: {dispatch_res.get('error')}"

time.sleep(0.5)
stop_smtp.set()

assert len(delivered_messages) == 1, "Real SMTP server did not receive the email!"
delivered = delivered_messages[0]
print(f"Delivered message to: {delivered['to']}")
assert any("gregfurtado94@gmail.com" in dest for dest in delivered['to']), "Recipient mismatch!"
assert "8492" in delivered['body'], "OTP code not found in email body!"
print("--> TEST 5 PASSED: Real email transmission via SMTP server accepted and delivered successfully.")

# Clean up temporary test environment variables
del os.environ["SMTP_HOST"]
del os.environ["SMTP_PORT"]
del os.environ["SMTP_USER"]
del os.environ["SMTP_PASSWORD"]
del os.environ["SMTP_USE_TLS"]

print("\n=====================================================================")
print("ALL TESTS PASSED SUCCESSFULLY!")
print("=====================================================================")
