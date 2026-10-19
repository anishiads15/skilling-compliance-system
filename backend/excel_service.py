import os
import re
import glob
import openpyxl

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(PROJECT_DIR)

# Primary Excel search paths (single source of truth)
EXCEL_CANDIDATE_PATHS = [
    os.path.join(PROJECT_DIR, "authorised_users.xlsx"),
    os.path.join(ROOT_DIR, "authorised_users.xlsx"),
    os.path.join(PROJECT_DIR, "authorized_users.xlsx"),
    os.path.join(ROOT_DIR, "authorized_users.xlsx"),
    os.path.join(PROJECT_DIR, "authorised_users.xls"),
    os.path.join(ROOT_DIR, "authorised_users.xls"),
    os.path.join(PROJECT_DIR, "authorized_users.xls"),
    os.path.join(ROOT_DIR, "authorized_users.xls"),
]

# Cache: { "path": str, "mtime": float, "result": dict }
_EXCEL_CACHE = {
    "path": None,
    "mtime": 0,
    "result": None
}

def locate_excel_file():
    """
    Locates the uploaded Excel sheet as the single source of truth for authorised users.
    Checks:
    1. Project directory candidate paths (authorised_users.xlsx / authorized_users.xlsx)
    2. Any *.xlsx or *.xls in the project directory
    3. User OneDrive or uploaded directory if available
    """
    # 1. Candidate paths in project directory
    for path in EXCEL_CANDIDATE_PATHS:
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return os.path.abspath(path)

    # 2. Any .xlsx in project root
    local_excels = glob.glob(os.path.join(PROJECT_DIR, "*.xlsx")) + glob.glob(os.path.join(PROJECT_DIR, "*.xls"))
    if local_excels:
        return os.path.abspath(local_excels[0])

    # 3. Check user uploaded / brain directories
    brain_dir = os.path.abspath(os.path.join(PROJECT_DIR, "..", "..", "brain"))
    if os.path.exists(brain_dir):
        uploaded_excels = glob.glob(os.path.join(brain_dir, "**", ".user_uploaded", "*.xlsx"), recursive=True)
        if uploaded_excels:
            return os.path.abspath(uploaded_excels[0])

    # 4. Check OneDrive root if available
    onedrive_dir = os.path.join(os.path.expanduser("~"), "OneDrive")
    if os.path.exists(onedrive_dir):
        onedrive_excels = [
            os.path.join(onedrive_dir, "Book 1.xlsx"),
            os.path.join(onedrive_dir, "Book.xlsx")
        ]
        for p in onedrive_excels:
            if os.path.exists(p) and os.path.getsize(p) > 0:
                return os.path.abspath(p)

    return None

def normalize_email(email_str):
    """
    Normalizes an email address:
    - Trims leading and trailing whitespace
    - Handles unicode non-breaking and zero-width spaces
    - Removes internal spaces
    - Converts to lowercase
    """
    if not email_str:
        return ""
    cleaned = str(email_str).replace("\u00a0", "").replace("\u200b", "").replace("\u200c", "").replace("\u200d", "")
    cleaned = re.sub(r"\s+", "", cleaned)
    return cleaned.strip().lower()

def extract_authorised_users(excel_path=None):
    """
    Reads the uploaded Excel sheet, identifies all relevant columns,
    and returns verified authorised user records.
    
    Strict constraints:
    - Does NOT fall back to PDF or dummy records.
    - If Excel file is missing or columns cannot be mapped, reports the exact error.
    """
    global _EXCEL_CACHE

    target_path = excel_path or locate_excel_file()
    if not target_path or not os.path.exists(target_path):
        return {
            "success": False,
            "error": "The authorised users Excel file could not be located in the project.",
            "missing": "Excel file missing",
            "records": [],
            "count": 0
        }

    current_mtime = os.path.getmtime(target_path)
    if _EXCEL_CACHE["path"] == target_path and _EXCEL_CACHE["mtime"] == current_mtime and _EXCEL_CACHE["result"]:
        return _EXCEL_CACHE["result"]

    try:
        wb = openpyxl.load_workbook(target_path, data_only=True)
        ws = wb.active
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to load Excel file '{os.path.basename(target_path)}': {str(e)}",
            "records": [],
            "count": 0
        }

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {
            "success": False,
            "error": f"The Excel sheet '{os.path.basename(target_path)}' is empty.",
            "records": [],
            "count": 0
        }

    # Find the header row (first non-empty row)
    header_idx = None
    headers = []
    for idx, r in enumerate(rows):
        non_empty = [c for c in r if c is not None and str(c).strip()]
        if len(non_empty) >= 2:
            header_idx = idx
            headers = [str(c).strip() if c is not None else "" for c in r]
            break

    if header_idx is None:
        return {
            "success": False,
            "error": f"Could not identify a valid header row in '{os.path.basename(target_path)}'.",
            "records": [],
            "count": 0
        }

    # Map column headers case-insensitively
    name_col = None
    email_col = None
    role_col = None
    centre_col = None
    year_col = None

    for col_idx, h in enumerate(headers):
        h_norm = h.lower().replace("_", " ").strip()
        if not h_norm:
            continue
        
        # Email column detection
        if email_col is None and ("email" in h_norm or "e-mail" in h_norm or h_norm in ["mail", "email id", "email address"]):
            email_col = col_idx
            continue

        # Name column detection
        if name_col is None and ("name" in h_norm or h_norm in ["user", "official name", "full name"]):
            name_col = col_idx
            continue

        # Role column detection
        if role_col is None and ("role" in h_norm or "designation" in h_norm or "position" in h_norm):
            role_col = col_idx
            continue

        # Access Centre column detection
        if centre_col is None and ("centre" in h_norm or "center" in h_norm or "access" in h_norm or "scope" in h_norm):
            centre_col = col_idx
            continue

        # Joining Year column detection
        if year_col is None and ("year" in h_norm or "joining" in h_norm or "batch" in h_norm):
            year_col = col_idx
            continue

    # Validate required columns
    missing_cols = []
    if email_col is None:
        missing_cols.append("Email ID")
    if name_col is None:
        missing_cols.append("Name")
    if role_col is None:
        missing_cols.append("Role")

    if missing_cols:
        return {
            "success": False,
            "error": f"Required columns missing in Excel sheet: {', '.join(missing_cols)}. Found headers: {headers}",
            "missing_columns": missing_cols,
            "found_headers": headers,
            "records": [],
            "count": 0
        }

    records = []
    # Process data rows
    for r_idx in range(header_idx + 1, len(rows)):
        row = rows[r_idx]
        if not row:
            continue

        raw_email = row[email_col] if email_col < len(row) else None
        if not raw_email:
            continue
        email = normalize_email(raw_email)
        if not email or "@" not in email:
            continue

        raw_name = row[name_col] if name_col < len(row) else None
        name = str(raw_name).strip() if raw_name is not None else ""

        raw_role = row[role_col] if role_col < len(row) else None
        role_str = str(raw_role).strip() if raw_role is not None else ""

        raw_centre = row[centre_col] if (centre_col is not None and centre_col < len(row)) else None
        centre_str = str(raw_centre).strip() if raw_centre is not None else ""

        raw_year = row[year_col] if (year_col is not None and year_col < len(row)) else None
        year_joined = str(raw_year).strip() if raw_year is not None else "2024"

        # Determine official role
        if "gov" in role_str.lower():
            role = "Government Official"
            centre_id = None
            centre_name = None
            access_centres = "All centres"
        else:
            role = "Training Centre Official"
            if "1" in centre_str:
                centre_id = "TC1"
                centre_name = "Training Centre 1"
                access_centres = "Training Centre 1"
            elif "2" in centre_str:
                centre_id = "TC2"
                centre_name = "Training Centre 2"
                access_centres = "Training Centre 2"
            else:
                centre_id = "TC1"
                centre_name = "Training Centre 1"
                access_centres = centre_str or "Training Centre 1"

        record = {
            "name": name,
            "email": email,
            "role": role,
            "centre_id": centre_id,
            "centre_name": centre_name,
            "access_centres": access_centres,
            "year_joined": year_joined,
            "raw_line": f"{name} {email} {role} {access_centres}"
        }
        records.append(record)

    result = {
        "success": True,
        "excel_path": target_path,
        "excel_filename": os.path.basename(target_path),
        "mapped_columns": {
            "name": headers[name_col],
            "email": headers[email_col],
            "role": headers[role_col],
            "access_centres": headers[centre_col] if centre_col is not None else None,
            "year_joined": headers[year_col] if year_col is not None else None
        },
        "records": records,
        "count": len(records),
        "message": f"Successfully loaded {len(records)} authorised records from {os.path.basename(target_path)}."
    }

    _EXCEL_CACHE = {
        "path": target_path,
        "mtime": current_mtime,
        "result": result
    }

    return result

def is_email_authorised(email_str):
    """Checks whether an email address is authorized in the Excel sheet."""
    norm = normalize_email(email_str)
    if not norm:
        return False
    data = extract_authorised_users()
    if not data.get("success"):
        return False
    return any(r["email"] == norm for r in data.get("records", []))

def get_records_for_email(email_str):
    """Retrieves all authorized role and centre records for a given email address from the Excel sheet."""
    norm = normalize_email(email_str)
    if not norm:
        return []
    data = extract_authorised_users()
    if not data.get("success"):
        return []
    return [r for r in data.get("records", []) if r["email"] == norm]

def get_all_authorised_records():
    """Returns all genuine records extracted from the Excel sheet."""
    return extract_authorised_users()
