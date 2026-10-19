"""
Legacy module placeholder.
Replaced by excel_service.py as the single source of truth for authorised users.
Strict constraint: Does not use old PDF as a fallback.
"""
import excel_service

def locate_pdf_file():
    return None

def normalize_email(email_str):
    return excel_service.normalize_email(email_str)

def extract_authorised_users(pdf_path=None):
    # Delegate strictly to excel_service (never use PDF fallback)
    return excel_service.extract_authorised_users()

def is_email_authorised(email_str):
    return excel_service.is_email_authorised(email_str)

def get_records_for_email(email_str):
    return excel_service.get_records_for_email(email_str)

def get_all_authorised_records():
    return excel_service.get_all_authorised_records()
