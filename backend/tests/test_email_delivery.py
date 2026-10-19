"""
Utility to test real EmailJS REST API email delivery for the Training Centre System.
Usage:
    python test_email_delivery.py [recipient_email]
Example:
    python test_email_delivery.py gregfurtado94@gmail.com
"""
import sys
import os

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

import email_service

def main():
    recipient = sys.argv[1] if len(sys.argv) > 1 else "gregfurtado94@gmail.com"

    print("=====================================================================")
    print("EMAILJS REST API CONFIGURATION & LIVE DELIVERY TEST")
    print("=====================================================================")

    # 1. Safely inspect configuration
    status = email_service.check_email_configuration()
    print(f"Provider:              {status['provider']}")
    print(f"Service ID:            {status['service_id']}")
    print(f"Template ID:           {status['template_id']}")
    print(f"Public Key Configured: {'Yes (' + status['masked_public_key'] + ')' if status['public_key_configured'] else 'No (Missing)'}")
    print(f"Origin Header:         {status.get('origin')}")
    print(f"Service Ready:         {status['configured']}")

    if not status["configured"]:
        print("\n[!] EMAILJS SERVICE IS NOT READY:")
        print(f"    Missing settings in .env: {', '.join(status['missing_settings'])}")
        print("\nTo fix this:")
        print("  1. Open your .env file at: " + os.path.join(PROJECT_DIR, ".env"))
        print("  2. Add your EmailJS configuration:")
        print("       EMAILJS_SERVICE_ID=service_71zfxw8")
        print("       EMAILJS_TEMPLATE_ID=template_qlc56qj")
        print("       EMAILJS_PUBLIC_KEY=_8N3Y4amvpvUyzYH5")
        print("  3. Save the file and run this test again.")
        print("=====================================================================")
        return 1

    # 2. If configured, attempt real email delivery via EmailJS API
    print(f"\nAttempting live email delivery via EmailJS REST API to: {recipient}...")
    test_otp = "7391"
    result = email_service.send_otp_email(recipient, test_otp, "Live Verification")

    print(f"\nDispatch Result:")
    print(f"  Sent:                {result.get('sent')}")
    print(f"  Response:            {result.get('response')}")
    if result.get("error"):
        print(f"  Error:               {result.get('error')}")
        if result.get("technical_details"):
            print(f"  Technical Details:   {result.get('technical_details')}")
        print("\n[X] Email delivery failed.")
        return 1
    else:
        print(f"\n[OK] SUCCESS! Live OTP email accepted by EmailJS (Response: {result.get('response')}).")
        print(f"     Email dispatched to {recipient}. Check inbox (and spam folder).")
        return 0

if __name__ == "__main__":
    sys.exit(main())
