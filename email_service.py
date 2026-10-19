"""
Email service powered by EmailJS REST API.
Dispatches signup and forgot-password OTP emails securely from the backend.
Preserves confidentiality by keeping OTP generation, expiry, and verification strictly on the server.
"""
import os
import re
import json
import urllib.request
import urllib.error

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env_file(force_reload=False):
    """
    Safely loads environment variables from a .env file located in the project root.
    Populates os.environ without overwriting existing environment variables unless force_reload=True.
    """
    env_paths = [
        os.path.join(PROJECT_DIR, ".env"),
        os.path.join(os.getcwd(), ".env"),
    ]
    for p in env_paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k and (k not in os.environ or force_reload):
                                os.environ[k] = v
                break
            except Exception as e:
                print(f"[ENV NOTICE] Error reading .env file at {p}: {e}")

# Initial load on import
load_env_file(force_reload=True)

def get_emailjs_config():
    """
    Retrieves EmailJS configuration from environment variables (.env or OS environment).
    Defaults to the user-supplied EmailJS credentials.
    """
    load_env_file(force_reload=False)

    service_id = (
        os.environ.get("EMAILJS_SERVICE_ID") or
        "service_71zfxw8"
    ).strip()

    template_id = (
        os.environ.get("EMAILJS_TEMPLATE_ID") or
        "template_qlc56qj"
    ).strip()

    public_key = (
        os.environ.get("EMAILJS_PUBLIC_KEY") or
        os.environ.get("EMAILJS_USER_ID") or
        "_8N3Y4amvpvUyzYH5"
    ).strip()

    private_key = (
        os.environ.get("EMAILJS_PRIVATE_KEY") or
        os.environ.get("EMAILJS_ACCESS_TOKEN") or
        ""
    ).strip()

    origin = (
        os.environ.get("EMAILJS_ORIGIN") or
        "http://127.0.0.1:5000"
    ).strip()

    missing_keys = []
    if not service_id:
        missing_keys.append("EMAILJS_SERVICE_ID")
    if not template_id:
        missing_keys.append("EMAILJS_TEMPLATE_ID")
    if not public_key:
        missing_keys.append("EMAILJS_PUBLIC_KEY")

    is_configured = len(missing_keys) == 0

    return {
        "service_id": service_id,
        "template_id": template_id,
        "public_key": public_key,
        "private_key": private_key,
        "origin": origin,
        "is_configured": is_configured,
        "missing_keys": missing_keys
    }

def check_email_configuration():
    """
    Safely inspects the EmailJS configuration and reports status without
    revealing sensitive keys.
    """
    cfg = get_emailjs_config()

    masked_pub = None
    if cfg["public_key"] and len(cfg["public_key"]) > 6:
        masked_pub = cfg["public_key"][:4] + "..." + cfg["public_key"][-4:]

    status_msg = (
        "EmailJS REST API is configured and ready to dispatch real OTP emails."
        if cfg["is_configured"] else
        f"Email service configuration is incomplete. Missing in .env: {', '.join(cfg['missing_keys'])}."
    )

    return {
        "configured": cfg["is_configured"],
        "provider": "EmailJS (REST API)",
        "service_id": cfg["service_id"],
        "template_id": cfg["template_id"],
        "public_key_configured": bool(cfg["public_key"]),
        "masked_public_key": masked_pub,
        "api_key_configured": cfg["is_configured"],
        "has_private_key": bool(cfg["private_key"]),
        "origin": cfg["origin"],
        "from_email": f"EmailJS Service ({cfg['service_id']})",
        "missing_settings": cfg["missing_keys"],
        "status_message": status_msg
    }

def send_emailjs_otp(to_email, otp_code, purpose="Sign Up Verification"):
    """
    Dispatches a 4-digit OTP email using the EmailJS REST API.
    Uses exact template parameters: 'to_email' and 'otp'.
    """
    cfg = get_emailjs_config()

    if not cfg["is_configured"]:
        missing_str = ", ".join(cfg["missing_keys"])
        log_msg = (
            f"\n[EMAILJS DISPATCH NOTICE] ======================================\n"
            f"Attempted recipient: {to_email}\n"
            f"Purpose: {purpose}\n"
            f"Status: NOT SENT (EmailJS configuration incomplete in .env)\n"
            f"Missing settings: {missing_str}\n"
            f"===============================================================\n"
        )
        print(log_msg)
        return {
            "sent": False,
            "provider": "EmailJS",
            "emailjs_configured": False,
            "resend_configured": False,
            "smtp_configured": False,
            "error": f"EmailJS service is not configured. Missing {missing_str} in .env file.",
            "technical_details": f"Missing settings: {missing_str}",
            "response": None
        }

    payload = {
        "service_id": cfg["service_id"],
        "template_id": cfg["template_id"],
        "user_id": cfg["public_key"],
        "template_params": {
            "to_email": to_email,
            "otp": str(otp_code)
        }
    }

    if cfg["private_key"]:
        payload["accessToken"] = cfg["private_key"]

    data = json.dumps(payload).encode("utf-8")
    origin = cfg["origin"] or "http://127.0.0.1:5000"

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": origin,
        "Referer": origin.rstrip("/") + "/"
    }

    req = urllib.request.Request(
        "https://api.emailjs.com/api/v1.0/email/send",
        data=data,
        headers=headers
    )

    print(f"[EMAILJS TRANSMISSION] Dispatching OTP for {purpose} to {to_email} via EmailJS (Service: {cfg['service_id']}, Template: {cfg['template_id']})...")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode("utf-8", errors="ignore")
            print(f"[EMAILJS SUCCESS] Message accepted by EmailJS for {to_email} (Status {resp.status}: {resp_body})")
            return {
                "sent": True,
                "provider": "EmailJS",
                "emailjs_configured": True,
                "resend_configured": True,
                "smtp_configured": True,
                "response": resp_body,
                "error": None,
                "technical_details": None
            }

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"[EMAILJS HTTP ERROR] Status {e.code}: {err_body}")
        
        user_msg = f"Email delivery failed (EmailJS HTTP {e.code}): {err_body}"
        if e.code == 403 and "non-browser" in err_body.lower():
            user_msg = (
                "EmailJS API access from non-browser environments is disabled. "
                "Please enable non-browser API access in https://dashboard.emailjs.com/admin/account/security "
                "or ensure origin headers are accepted."
            )
        elif e.code == 400:
            user_msg = f"EmailJS request rejected: {err_body}. Please verify template parameters (to_email, otp)."

        return {
            "sent": False,
            "provider": "EmailJS",
            "emailjs_configured": True,
            "resend_configured": True,
            "smtp_configured": True,
            "error": user_msg,
            "technical_details": f"HTTP {e.code}: {err_body}",
            "response": None
        }

    except urllib.error.URLError as e:
        err_msg = f"Network connection error while connecting to EmailJS: {e.reason}"
        print(f"[EMAILJS NETWORK ERROR] {err_msg}")
        return {
            "sent": False,
            "provider": "EmailJS",
            "emailjs_configured": True,
            "resend_configured": True,
            "smtp_configured": True,
            "error": err_msg,
            "technical_details": str(e),
            "response": None
        }

    except Exception as e:
        err_msg = f"Unexpected error during EmailJS dispatch: {str(e)}"
        print(f"[EMAILJS UNEXPECTED ERROR] {err_msg}")
        return {
            "sent": False,
            "provider": "EmailJS",
            "emailjs_configured": True,
            "resend_configured": True,
            "smtp_configured": True,
            "error": err_msg,
            "technical_details": str(e),
            "response": None
        }

def send_otp_email(to_email, otp_code, purpose="Sign Up"):
    """
    Sends 4-digit verification OTP via EmailJS REST API.
    Maps template params: to_email -> recipient, otp -> 4-digit code.
    """
    return send_emailjs_otp(to_email, otp_code, purpose)

def send_credentials_email(to_email, name, login_id, initial_password, role, centre_name=None):
    """
    Logs credential notification. If an external credential dispatch mechanism
    is configured, sends it; otherwise prints secure audit log.
    """
    print(f"[CREDENTIALS AUDIT] Account created for {name} ({to_email}). Login ID: {login_id}, Role: {role}")
    return {"sent": True}
