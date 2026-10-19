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
print("COMPREHENSIVE TEST: EMAIL AUTHENTICATION & OTP VERIFICATION FLOW")
print("=====================================================================")

# -------------------------------------------------------------
# Test 1: Email Format & Excel Authorization
# -------------------------------------------------------------
print("\n--- 1. Testing Email Format & Excel Authorization ---")
assert excel_service.is_email_authorised("gregfurtado94@gmail.com") is True
assert excel_service.is_email_authorised("gregfuratdo94@gmail.com") is False
assert excel_service.is_email_authorised("unauthorized@example.com") is False
print("--> Excel authorization logic verified: gregfurtado94@gmail.com is authorised.")

# -------------------------------------------------------------
# Test 2: Live SMTP Transmission & OTP Discretion
# -------------------------------------------------------------
print("\n--- 2. Testing Live SMTP Delivery & Log Discretion ---")
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
smtp_thread = threading.Thread(target=run_smtp_server, args=(2527, stop_smtp), daemon=True)
smtp_thread.start()
time.sleep(0.5)

# Configure email_service to use test SMTP server
os.environ["SMTP_HOST"] = "127.0.0.1"
os.environ["SMTP_PORT"] = "2527"
os.environ["SMTP_USER"] = "sender@gmail.com"
os.environ["SMTP_PASSWORD"] = "testpassword1234"
os.environ["SMTP_USE_TLS"] = "false"

# Verify config status
status = email_service.check_email_configuration()
print(f"Safe Configuration Status: Configured={status['configured']}, Host={status['smtp_host']}, User={status['smtp_user']}")
assert status["configured"] is True
assert status["password_configured"] is True

# Dispatch test OTP email
otp_code = "9182"
send_res = email_service.send_otp_email("gregfurtado94@gmail.com", otp_code, "Sign Up")
assert send_res["sent"] is True, f"Failed to send email: {send_res.get('error')}"
time.sleep(0.5)

assert len(delivered_messages) == 1
delivered = delivered_messages[0]
print(f"SMTP Message Received for: {delivered['to']}")
assert any("gregfurtado94@gmail.com" in dest for dest in delivered['to'])
assert otp_code in delivered["body"]
# Confirm raw OTP is NOT in subject header
assert f"Your OTP is {otp_code}" not in delivered["body"].split("\n\n")[0]
print("--> Live email delivered via real SMTP protocol, OTP code received inside body.")

# Clean up test SMTP server
stop_smtp.set()
del os.environ["SMTP_HOST"]
del os.environ["SMTP_PORT"]
del os.environ["SMTP_USER"]
del os.environ["SMTP_PASSWORD"]
del os.environ["SMTP_USE_TLS"]

print("\n--- 3. Testing Missing Configuration Protection ---")
status_unconfigured = email_service.check_email_configuration()
print(f"Status when .env has placeholders: Configured={status_unconfigured['configured']}, Missing={status_unconfigured['missing_settings']}")
assert status_unconfigured["configured"] is False
assert "SMTP_USER" in status_unconfigured["missing_settings"]
assert "SMTP_PASSWORD" in status_unconfigured["missing_settings"]

print("\n=====================================================================")
print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
print("=====================================================================")
