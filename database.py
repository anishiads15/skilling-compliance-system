"""
Database layer for AI-Based Training Centre Compliance & Monitoring System.
Stores Training Centre 1 and Training Centre 2 data with strict separation.
Roles: Government Official and Training Centre Official.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "compliance.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table (Gov Official and Training Centre Officials)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        password TEXT NOT NULL,
        role TEXT NOT NULL, -- 'Government Official' or 'Training Centre Official'
        centre_id TEXT,     -- 'TC1', 'TC2', or NULL
        centre_name TEXT,   -- 'Training Centre 1', 'Training Centre 2', or NULL
        dob TEXT NOT NULL,
        qualification TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        account_status TEXT DEFAULT 'Signed Up'
    )
    """)

    # 2. Training Centres Table (Two centres: TC1 and TC2)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS training_centres (
        centre_id TEXT PRIMARY KEY,
        centre_name TEXT NOT NULL,
        location TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE'
    )
    """)

    # 3. Students Table (Separated by centre_id)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        centre_id TEXT NOT NULL,
        roll_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        dob TEXT,
        gender TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        course TEXT NOT NULL,
        batch TEXT NOT NULL,
        highest_qualification TEXT,
        qualification_year TEXT,
        institution TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 4. Attendance Sessions Table (with day, time, subject, AI count, discrepancy)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_sessions (
        session_id TEXT PRIMARY KEY,
        centre_id TEXT NOT NULL,
        date TEXT NOT NULL,
        day TEXT,
        time TEXT,
        subject TEXT,
        session_name TEXT NOT NULL,
        manual_present_count INTEGER NOT NULL,
        ai_camera_count INTEGER DEFAULT 0,
        total_students INTEGER NOT NULL,
        difference INTEGER DEFAULT 0,
        discrepancy_status TEXT DEFAULT 'Matched',
        is_locked INTEGER NOT NULL DEFAULT 1,
        submitted_by TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 5. Attendance Records Table (Student level Present / Absent)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        centre_id TEXT NOT NULL,
        roll_number INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'Present' or 'Absent'
        FOREIGN KEY (session_id) REFERENCES attendance_sessions (session_id)
    )
    """)

    # 6. Equipment Issues Table (Reported by TC officials)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipment_issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id TEXT UNIQUE NOT NULL,
        centre_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        comment TEXT NOT NULL,
        date TEXT NOT NULL,
        reported_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Open',
        created_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 7. Camera Feeds Table (One live feed per centre)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS camera_feeds (
        camera_id TEXT PRIMARY KEY,
        centre_id TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CAMERA ON',
        ai_detected_count INTEGER NOT NULL,
        feed_label TEXT NOT NULL DEFAULT 'LIVE WEBCAM',
        sample_video_path TEXT,
        last_updated TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 8. Government Equipment Inventory Table (Supplied by Government)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS government_equipment (
        equipment_id TEXT PRIMARY KEY,
        centre_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        category TEXT NOT NULL,
        standard_tag TEXT NOT NULL,
        base_condition TEXT NOT NULL DEFAULT 'Good',
        supplied_date TEXT NOT NULL DEFAULT '2026-01-15',
        status TEXT NOT NULL DEFAULT 'Active',
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 9. Equipment Allocations Table (Officially allotted quantity per centre by Government Official)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipment_allocations (
        centre_id TEXT PRIMARY KEY,
        allotted_quantity INTEGER NOT NULL DEFAULT 10,
        allotted_by TEXT DEFAULT 'Government Official',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 10. Equipment Condition Reports Table (Submitted by Training Centre Officials)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipment_condition_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        centre_id TEXT NOT NULL,
        good_condition_count INTEGER NOT NULL,
        allotted_quantity INTEGER NOT NULL,
        submitted_by TEXT NOT NULL,
        submitted_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    # 11. Camera Alerts Table (Physical camera coverage / obstruction events)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS camera_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id TEXT UNIQUE NOT NULL,
        centre_id TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        alert_type TEXT NOT NULL DEFAULT 'Camera Covered',
        date_covered TEXT NOT NULL,
        time_covered TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Ongoing',
        resolved_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    conn.commit()

    # Apply schema migrations if table existed previously without new columns
    upgrade_db_schema(cursor, conn)

    seed_data(cursor, conn)
    conn.close()

def upgrade_db_schema(cursor, conn):
    """Ensure all required columns exist in existing database tables."""
    # Check users table columns
    cursor.execute("PRAGMA table_info(users)")
    u_cols = [row[1] for row in cursor.fetchall()]
    if "email" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
    if "year_joined" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN year_joined TEXT DEFAULT '2024'")
    if "photo_pending" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN photo_pending INTEGER DEFAULT 0")
    if "account_status" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'Signed Up'")

    # Check attendance_sessions columns
    cursor.execute("PRAGMA table_info(attendance_sessions)")
    a_cols = [row[1] for row in cursor.fetchall()]
    if "day" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN day TEXT")
    if "time" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN time TEXT")
    if "subject" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN subject TEXT")
    if "ai_camera_count" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN ai_camera_count INTEGER DEFAULT 0")
    if "difference" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN difference INTEGER DEFAULT 0")
    if "discrepancy_status" not in a_cols:
        cursor.execute("ALTER TABLE attendance_sessions ADD COLUMN discrepancy_status TEXT DEFAULT 'Matched'")

    # Ensure demo users have proper email IDs and updated passwords
    cursor.execute("UPDATE users SET email = 'tc1.official@skilling.gov.in', password = 'Centre@1234' WHERE user_id = 'TC1OFF001'")
    cursor.execute("UPDATE users SET email = 'tc2.official@skilling.gov.in', password = 'Centre@5678' WHERE user_id = 'TC2OFF001'")
    cursor.execute("UPDATE users SET email = 'gov.official@skilling.gov.in', password = 'Gov@1234' WHERE user_id = 'GOV001'")

    # Ensure camera_feeds has ai_equipment_count and video_url
    cursor.execute("PRAGMA table_info(camera_feeds)")
    cam_cols = [row[1] for row in cursor.fetchall()]
    if "ai_equipment_count" not in cam_cols:
        cursor.execute("ALTER TABLE camera_feeds ADD COLUMN ai_equipment_count INTEGER DEFAULT 8")
    if "video_url" not in cam_cols:
        cursor.execute("ALTER TABLE camera_feeds ADD COLUMN video_url TEXT")

    # Configure TC2 camera feed to use uploaded footage
    cursor.execute("""
    UPDATE camera_feeds 
    SET feed_label = 'UPLOADED FOOTAGE', 
        sample_video_path = '/static/uploads/tc2_uploaded_footage.mp4'
    WHERE centre_id = 'TC2'
    """)

    # Check equipment_allocations and ensure category_allocations table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS category_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        centre_id TEXT NOT NULL,
        category_key TEXT NOT NULL,
        category_name TEXT NOT NULL,
        allotted_quantity INTEGER NOT NULL DEFAULT 0,
        reported_good INTEGER DEFAULT NULL,
        reported_damaged INTEGER DEFAULT 0,
        reported_missing INTEGER DEFAULT 0,
        reported_by TEXT DEFAULT NULL,
        reported_at TEXT DEFAULT NULL,
        updated_by TEXT DEFAULT 'Government Official',
        updated_at TEXT NOT NULL,
        UNIQUE(centre_id, category_key),
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    cursor.execute("SELECT COUNT(*) as count FROM category_allocations")
    if cursor.fetchone()["count"] == 0:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        categories_seed = [
            # TC1
            ("TC1", "desks_chairs", "Desks/chairs", 75, 47, 28, 0, "Training Centre Official 1", now_str, "Government Official", now_str),
            ("TC1", "computers", "Computers", 30, 28, 2, 0, "Training Centre Official 1", now_str, "Government Official", now_str),
            ("TC1", "machines", "Machines", 8, 7, 1, 0, "Training Centre Official 1", now_str, "Government Official", now_str),
            ("TC1", "fans", "Fans", 10, 6, 4, 0, "Training Centre Official 1", now_str, "Government Official", now_str),
            ("TC1", "tools", "Tools", 20, 11, 9, 0, "Training Centre Official 1", now_str, "Government Official", now_str),
            # TC2
            ("TC2", "desks_chairs", "Desks/chairs", 35, 33, 2, 0, "Training Centre Official 2", now_str, "Government Official", now_str),
            ("TC2", "computers", "Computers", 5, 5, 0, 0, "Training Centre Official 2", now_str, "Government Official", now_str),
            ("TC2", "machines", "Machines", 6, 5, 1, 0, "Training Centre Official 2", now_str, "Government Official", now_str),
            ("TC2", "fans", "Fans", 4, 4, 0, 0, "Training Centre Official 2", now_str, "Government Official", now_str),
            ("TC2", "tools", "Tools", 10, 9, 1, 0, "Training Centre Official 2", now_str, "Government Official", now_str),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO category_allocations (
            centre_id, category_key, category_name, allotted_quantity, 
            reported_good, reported_damaged, reported_missing, 
            reported_by, reported_at, updated_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, categories_seed)

    # Consolidate legacy separate desks and chairs rows into Desks/chairs if present
    for centre in ["TC1", "TC2"]:
        cursor.execute("""
        SELECT category_key, allotted_quantity, reported_good, reported_damaged, reported_missing, reported_by, reported_at, updated_by, updated_at
        FROM category_allocations
        WHERE UPPER(centre_id) = UPPER(?) AND LOWER(category_key) IN ('desks', 'chairs')
        """, (centre,))
        legacy_rows = cursor.fetchall()
        if legacy_rows:
            c_allotted = sum(int(r["allotted_quantity"]) for r in legacy_rows)
            c_goods = [int(r["reported_good"]) for r in legacy_rows if r["reported_good"] is not None]
            c_good = sum(c_goods) if len(c_goods) > 0 else None
            c_damaged = sum(int(r["reported_damaged"]) for r in legacy_rows if r["reported_damaged"] is not None)
            c_missing = sum(int(r["reported_missing"]) for r in legacy_rows if r["reported_missing"] is not None)
            c_rep_by = next((r["reported_by"] for r in legacy_rows if r["reported_by"]), "Training Centre Official")
            c_rep_at = next((r["reported_at"] for r in legacy_rows if r["reported_at"]), datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            c_up_by = next((r["updated_by"] for r in legacy_rows if r["updated_by"]), "Government Official")
            c_up_at = next((r["updated_at"] for r in legacy_rows if r["updated_at"]), datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

            cursor.execute("""
            INSERT INTO category_allocations (
                centre_id, category_key, category_name, allotted_quantity,
                reported_good, reported_damaged, reported_missing,
                reported_by, reported_at, updated_by, updated_at
            ) VALUES (?, 'desks_chairs', 'Desks/chairs', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(centre_id, category_key) DO UPDATE SET
                category_name = excluded.category_name,
                allotted_quantity = excluded.allotted_quantity,
                reported_good = excluded.reported_good,
                reported_damaged = excluded.reported_damaged,
                reported_missing = excluded.reported_missing,
                reported_by = excluded.reported_by,
                reported_at = excluded.reported_at,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
            """, (centre, c_allotted, c_good, c_damaged, c_missing, c_rep_by, c_rep_at, c_up_by, c_up_at))

            cursor.execute("""
            DELETE FROM category_allocations
            WHERE UPPER(centre_id) = UPPER(?) AND LOWER(category_key) IN ('desks', 'chairs')
            """, (centre,))

    # Ensure government_equipment schema has new columns
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS government_equipment (
        equipment_id TEXT PRIMARY KEY,
        centre_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        category TEXT NOT NULL,
        standard_tag TEXT NOT NULL,
        serial_number TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        base_condition TEXT NOT NULL DEFAULT 'Good',
        inspection_status TEXT NOT NULL DEFAULT 'Good',
        trainee_comment TEXT DEFAULT '',
        inspected_by TEXT,
        inspected_at TEXT,
        fixed_by TEXT,
        fixed_at TEXT,
        supplied_date TEXT NOT NULL DEFAULT '2026-01-15',
        status TEXT NOT NULL DEFAULT 'Active',
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)

    cursor.execute("PRAGMA table_info(government_equipment)")
    geq_cols = [row[1] for row in cursor.fetchall()]
    if "serial_number" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN serial_number TEXT")
        cursor.execute("UPDATE government_equipment SET serial_number = standard_tag WHERE serial_number IS NULL OR serial_number = ''")
    if "quantity" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN quantity INTEGER DEFAULT 1")
    if "inspection_status" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN inspection_status TEXT DEFAULT 'Good'")
    if "trainee_comment" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN trainee_comment TEXT DEFAULT ''")
    if "inspected_by" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN inspected_by TEXT")
    if "inspected_at" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN inspected_at TEXT")
    if "fixed_by" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN fixed_by TEXT")
    if "fixed_at" not in geq_cols:
        cursor.execute("ALTER TABLE government_equipment ADD COLUMN fixed_at TEXT")

    # Standardize category labels in government_equipment
    cursor.execute("UPDATE government_equipment SET category = 'Desks/chairs' WHERE category LIKE '%Desk%' OR category LIKE '%Workstation%' OR category LIKE '%Chair%'")
    cursor.execute("UPDATE government_equipment SET category = 'Computers' WHERE category LIKE '%Electronic%' OR category LIKE '%Computer%'")
    cursor.execute("UPDATE government_equipment SET category = 'Machines' WHERE category LIKE '%Machine%'")
    cursor.execute("UPDATE government_equipment SET category = 'Tools' WHERE equipment_name LIKE '%Multimeter%' OR equipment_name LIKE '%Tool%'")

    # Add Chairs and Fans items to TC1 and TC2 if not present
    cursor.execute("SELECT COUNT(*) as count FROM government_equipment WHERE (category = 'Desks/chairs' OR category = 'Chairs') AND centre_id = 'TC1'")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT OR IGNORE INTO government_equipment (equipment_id, centre_id, equipment_name, category, standard_tag, serial_number, quantity, inspection_status, trainee_comment, supplied_date, status) VALUES ('EQ-TC1-11', 'TC1', 'Ergonomic Student Chairs Set', 'Desks/chairs', 'EQ11', 'SN-CH-01', 25, 'Good', '', '2026-01-15', 'Active')")
        cursor.execute("INSERT OR IGNORE INTO government_equipment (equipment_id, centre_id, equipment_name, category, standard_tag, serial_number, quantity, inspection_status, trainee_comment, supplied_date, status) VALUES ('EQ-TC1-12', 'TC1', 'High-Speed Classroom Fans', 'Fans', 'EQ12', 'SN-FN-01', 6, 'Good', '', '2026-01-15', 'Active')")
    cursor.execute("SELECT COUNT(*) as count FROM government_equipment WHERE (category = 'Desks/chairs' OR category = 'Chairs') AND centre_id = 'TC2'")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("INSERT OR IGNORE INTO government_equipment (equipment_id, centre_id, equipment_name, category, standard_tag, serial_number, quantity, inspection_status, trainee_comment, supplied_date, status) VALUES ('EQ-TC2-11', 'TC2', 'Workshop Swivel Chairs Set', 'Desks/chairs', 'EQ11', 'SN-CH-02', 20, 'Good', '', '2026-01-15', 'Active')")
        cursor.execute("INSERT OR IGNORE INTO government_equipment (equipment_id, centre_id, equipment_name, category, standard_tag, serial_number, quantity, inspection_status, trainee_comment, supplied_date, status) VALUES ('EQ-TC2-12', 'TC2', 'Industrial Exhaust Fans', 'Fans', 'EQ12', 'SN-FN-02', 4, 'Good', '', '2026-01-15', 'Active')")


    # Ensure camera_alerts table exists for physical camera coverage alerts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS camera_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id TEXT UNIQUE NOT NULL,
        centre_id TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        alert_type TEXT NOT NULL DEFAULT 'Camera Covered',
        date_covered TEXT NOT NULL,
        time_covered TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Ongoing',
        resolved_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)
    cursor.execute("PRAGMA table_info(camera_alerts)")
    cam_cols = [row[1] for row in cursor.fetchall()]
    if "transition_type" not in cam_cols:
        try: cursor.execute("ALTER TABLE camera_alerts ADD COLUMN transition_type TEXT DEFAULT ''")
        except Exception: pass
    if "details" not in cam_cols:
        try: cursor.execute("ALTER TABLE camera_alerts ADD COLUMN details TEXT DEFAULT ''")
        except Exception: pass

    seed_government_equipment(cursor)
    conn.commit()

def seed_government_equipment(cursor):
    """Seed government supplied equipment inventory (10 items per centre)."""
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS government_equipment (
        equipment_id TEXT PRIMARY KEY,
        centre_id TEXT NOT NULL,
        equipment_name TEXT NOT NULL,
        category TEXT NOT NULL,
        standard_tag TEXT NOT NULL,
        base_condition TEXT NOT NULL DEFAULT 'Good',
        supplied_date TEXT NOT NULL DEFAULT '2026-01-15',
        status TEXT NOT NULL DEFAULT 'Active',
        FOREIGN KEY (centre_id) REFERENCES training_centres (centre_id)
    )
    """)
    cursor.execute("SELECT COUNT(*) as count FROM government_equipment")
    if cursor.fetchone()["count"] == 0:
        gov_equipment = [
            # TC1 Equipment (10 items supplied by Government)
            ("EQ-TC1-01", "TC1", "Lathe Machine 03", "Machines", "EQ01", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-02", "TC1", "Machine 1", "Machines", "EQ02", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-03", "TC1", "Computer Terminal 01", "Electronic Devices", "EQ03", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-04", "TC1", "Computer Terminal 02", "Electronic Devices", "EQ04", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-05", "TC1", "Computer Terminal 03", "Electronic Devices", "EQ05", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-06", "TC1", "Workbench 01", "Desks / Workstations", "EQ06", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-07", "TC1", "Workbench 02", "Desks / Workstations", "EQ07", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-08", "TC1", "Student Workstation 01", "Desks / Workstations", "EQ08", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-09", "TC1", "Student Workstation 02", "Desks / Workstations", "EQ09", "Good", "2026-01-15", "Active"),
            ("EQ-TC1-10", "TC1", "Digital Multimeter Set 01", "Electronic Devices", "EQ10", "Good", "2026-01-15", "Active"),

            # TC2 Equipment (10 items supplied by Government)
            ("EQ-TC2-01", "TC2", "Workbench 04", "Desks / Workstations", "EQ01", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-02", "TC2", "CNC Machine 02", "Machines", "EQ02", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-03", "TC2", "Computer Terminal 01", "Electronic Devices", "EQ03", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-04", "TC2", "Computer Terminal 02", "Electronic Devices", "EQ04", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-05", "TC2", "Computer Terminal 03", "Electronic Devices", "EQ05", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-06", "TC2", "Workbench 01", "Desks / Workstations", "EQ06", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-07", "TC2", "Workbench 02", "Desks / Workstations", "EQ07", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-08", "TC2", "Student Workstation 01", "Desks / Workstations", "EQ08", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-09", "TC2", "Student Workstation 02", "Desks / Workstations", "EQ09", "Good", "2026-01-15", "Active"),
            ("EQ-TC2-10", "TC2", "Precision Tool Set 01", "Machines", "EQ10", "Good", "2026-01-15", "Active"),
        ]
        cursor.executemany("""
        INSERT OR REPLACE INTO government_equipment (equipment_id, centre_id, equipment_name, category, standard_tag, base_condition, supplied_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, gov_equipment)

def seed_data(cursor, conn):
    today_str = datetime.now().strftime("%Y-%m-%d")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Seed Training Centres (Strictly 2 Centres)
    centres = [
        ("TC1", "Training Centre 1", "Industrial Estate Campus, Sector 4", 30, "ACTIVE"),
        ("TC2", "Training Centre 2", "Vocational Skills Center, Block B", 28, "ACTIVE")
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO training_centres (centre_id, centre_name, location, capacity, status)
    VALUES (?, ?, ?, ?, ?)
    """, centres)

    # 2. Seed Users (Configured with required credentials)
    users = [
        # Training Centre 1 Official (TC001 - Centre@1234)
        (
            "TC001",
            "Training Centre Official 1",
            "tc001@skilling.gov.in",
            "Centre@1234",
            "Training Centre Official",
            "TC1",
            "Training Centre 1",
            "15/08/1985",
            "B.Tech (Electrical Engineering)",
            "/static/demo_assets/profile_tc1.jpg"
        ),
        # Training Centre 2 Official (TC002 - Centre@5678)
        (
            "TC002",
            "Training Centre Official 2",
            "tc002@skilling.gov.in",
            "Centre@5678",
            "Training Centre Official",
            "TC2",
            "Training Centre 2",
            "22/11/1988",
            "M.Tech (Mechanical Engineering)",
            "/static/demo_assets/profile_tc2.jpg"
        ),
        # Government Official (GOV001 - Gov@1234)
        (
            "GOV001",
            "Government Official 1",
            "gov.official@skilling.gov.in",
            "Gov@1234",
            "Government Official",
            None,
            None,
            "10/05/1978",
            "M.Sc, Ph.D (Public Administration)",
            "/static/demo_assets/profile_gov.jpg"
        ),
        # Backward compatibility aliases
        (
            "TC1OFF001",
            "Training Centre Official 1",
            "tc1.official@skilling.gov.in",
            "Centre@1234",
            "Training Centre Official",
            "TC1",
            "Training Centre 1",
            "15/08/1985",
            "B.Tech (Electrical Engineering)",
            "/static/demo_assets/profile_tc1.jpg"
        ),
        (
            "TC2OFF001",
            "Training Centre Official 2",
            "tc2.official@skilling.gov.in",
            "Centre@5678",
            "Training Centre Official",
            "TC2",
            "Training Centre 2",
            "22/11/1988",
            "M.Tech (Mechanical Engineering)",
            "/static/demo_assets/profile_tc2.jpg"
        )
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO users (user_id, name, email, password, role, centre_id, centre_name, dob, qualification, photo_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # 3. Seed Students for Training Centre 1 (30 Students)
    cursor.execute("SELECT COUNT(*) as count FROM students WHERE centre_id = 'TC1'")
    if cursor.fetchone()["count"] == 0:
        tc1_students = []
        for roll in range(1, 31):
            s_id = f"TC1-STU-{roll:03d}"
            s_name = f"Student {roll}"
            tc1_students.append((
                s_id, "TC1", roll, s_name, "2004-03-15", "Male" if roll % 2 == 1 else "Female",
                f"+91 98100 {roll:05d}", f"student{roll}.tc1@skillmail.org", "Delhi Metro Zone",
                "Solar & Electrical Technician", "Batch 1", "12th Standard", "2023", "Govt Senior Secondary School", now_str
            ))
        cursor.executemany("""
        INSERT OR REPLACE INTO students (student_id, centre_id, roll_number, name, dob, gender, phone, email, address, course, batch, highest_qualification, qualification_year, institution, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, tc1_students)

    # 4. Seed Students for Training Centre 2 (28 Students)
    cursor.execute("SELECT COUNT(*) as count FROM students WHERE centre_id = 'TC2'")
    if cursor.fetchone()["count"] == 0:
        tc2_students = []
        for roll in range(1, 29):
            s_id = f"TC2-STU-{roll:03d}"
            s_name = f"Student {roll}"
            tc2_students.append((
                s_id, "TC2", roll, s_name, "2003-07-20", "Male" if roll % 2 == 0 else "Female",
                f"+91 98200 {roll:05d}", f"student{roll}.tc2@skillmail.org", "Bengaluru Tech Zone",
                "CNC Machining & Milling", "Batch 1", "Diploma in Engineering", "2024", "State Technical Institute", now_str
            ))
        cursor.executemany("""
        INSERT OR REPLACE INTO students (student_id, centre_id, roll_number, name, dob, gender, phone, email, address, course, batch, highest_qualification, qualification_year, institution, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, tc2_students)

    # 5. Pre-seed Historical Attendance Records for Inspect Scope (Section 8 & 9)
    cursor.execute("SELECT COUNT(*) as count FROM attendance_sessions")
    if cursor.fetchone()["count"] < 10:
        seed_historical_attendance(cursor)

    # 6. Seed Equipment Issues
    cursor.execute("SELECT COUNT(*) as count FROM equipment_issues")
    if cursor.fetchone()["count"] == 0:
        issues = [
            (
                "ISS-TC1-001", "TC1", "Lathe Machine 03", "Damaged",
                "Motor is not functioning.", "2026-10-07", "Training Centre Official 1", "Open", now_str
            ),
            (
                "ISS-TC1-002", "TC1", "Computer 12", "Not Working",
                "System does not switch on.", "2026-10-07", "Training Centre Official 1", "Open", now_str
            ),
            (
                "ISS-TC2-001", "TC2", "Workbench 04", "Missing",
                "Workbench is not available in workshop.", "2026-10-07", "Training Centre Official 2", "Open", now_str
            )
        ]
        cursor.executemany("""
        INSERT OR REPLACE INTO equipment_issues (issue_id, centre_id, equipment_name, issue_type, comment, date, reported_by, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, issues)

    # 7. Seed Camera Feeds
    cameras = [
        ("CAM-TC1", "TC1", "Classroom 101", "CAMERA ON", 26, "LIVE WEBCAM", "/static/demo_assets/classroom_feed.mp4", now_str),
        ("CAM-TC2", "TC2", "Workshop Bay 2", "CAMERA ON", 4, "UPLOADED FOOTAGE", "/static/uploads/tc2_uploaded_footage.mp4", now_str)
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO camera_feeds (camera_id, centre_id, location, status, ai_detected_count, feed_label, sample_video_path, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, cameras)

    conn.commit()

def seed_historical_attendance(cursor):
    """
    Populates historical attendance sessions across August, September, and October 2026
    for Training Centre 1 (30 students) and Training Centre 2 (28 students),
    satisfying Section 8 and Section 9 (Month-wise organisation and discrepancy tracking).
    """
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # TC1 Historical Sessions (Total 30)
    tc1_data = [
        # October 2026
        ("2026-10-08", "Thursday", "10:00 AM", "Thermodynamics", "Session 1", 28, 26, 30, 2, "Discrepancy"),
        ("2026-10-07", "Wednesday", "10:00 AM", "Thermodynamics", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-10-06", "Tuesday", "10:00 AM", "Solar Inverter Technology", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-10-05", "Monday", "10:00 AM", "Photovoltaic Cell Physics", "Session 1", 27, 25, 30, 2, "Discrepancy"),
        ("2026-10-02", "Friday", "10:00 AM", "Grid Synchronization", "Session 1", 28, 28, 30, 0, "Matched"),
        ("2026-10-01", "Thursday", "10:00 AM", "Solar Cell Maintenance", "Session 1", 30, 30, 30, 0, "Matched"),
        # September 2026
        ("2026-09-30", "Wednesday", "10:00 AM", "Electrical Power Distribution", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-09-29", "Tuesday", "10:00 AM", "High-Voltage Safety Protocol", "Session 1", 28, 26, 30, 2, "Discrepancy"),
        ("2026-09-28", "Monday", "10:00 AM", "DC Circuit Analysis", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-09-25", "Friday", "10:00 AM", "Storage Battery Systems", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-09-24", "Thursday", "10:00 AM", "Earthing & Lightning Arrester", "Session 1", 27, 27, 30, 0, "Matched"),
        ("2026-09-23", "Wednesday", "10:00 AM", "Thermodynamics", "Session 1", 29, 27, 30, 2, "Discrepancy"),
        ("2026-09-22", "Tuesday", "10:00 AM", "Transformer Principles", "Session 1", 28, 28, 30, 0, "Matched"),
        ("2026-09-21", "Monday", "10:00 AM", "AC Power Fundamentals", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-09-18", "Friday", "10:00 AM", "Solar Array Wiring", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-09-17", "Thursday", "10:00 AM", "Switchgear & Relays", "Session 1", 28, 28, 30, 0, "Matched"),
        ("2026-09-16", "Wednesday", "10:00 AM", "Photovoltaic Inverters", "Session 1", 28, 25, 30, 3, "Discrepancy"),
        ("2026-09-15", "Tuesday", "10:00 AM", "Microgrid Architectures", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-09-14", "Monday", "10:00 AM", "Electrical Metering", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-09-11", "Friday", "10:00 AM", "Panel Cleaning & Safety", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-09-10", "Thursday", "10:00 AM", "Cabling & Conduit Routing", "Session 1", 28, 28, 30, 0, "Matched"),
        # August 2026
        ("2026-08-28", "Friday", "10:00 AM", "Thermodynamics", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-08-27", "Thursday", "10:00 AM", "Semiconductor Basics", "Session 1", 29, 27, 30, 2, "Discrepancy"),
        ("2026-08-26", "Wednesday", "10:00 AM", "Workshop Occupational Safety", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-08-25", "Tuesday", "10:00 AM", "Hand & Power Tool Safety", "Session 1", 28, 28, 30, 0, "Matched"),
        ("2026-08-24", "Monday", "10:00 AM", "Soldering & Desoldering", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-08-21", "Friday", "10:00 AM", "Solar Radiation Measurement", "Session 1", 28, 28, 30, 0, "Matched"),
        ("2026-08-20", "Thursday", "10:00 AM", "Component Testing Bench", "Session 1", 27, 27, 30, 0, "Matched"),
        ("2026-08-19", "Wednesday", "10:00 AM", "Multimeter Calibration", "Session 1", 29, 29, 30, 0, "Matched"),
        ("2026-08-18", "Tuesday", "10:00 AM", "Energy Storage Chemistry", "Session 1", 28, 26, 30, 2, "Discrepancy"),
        ("2026-08-14", "Friday", "10:00 AM", "Solar Resource Assessment", "Session 1", 30, 30, 30, 0, "Matched"),
        ("2026-08-13", "Thursday", "10:00 AM", "First Aid & Electrical Hazard", "Session 1", 30, 30, 30, 0, "Matched")
    ]

    for item in tc1_data:
        date_v, day_v, time_v, subj_v, sess_n, man_v, ai_v, tot_v, diff_v, stat_v = item
        s_id = f"ATT-TC1-{date_v.replace('-', '')}-{sess_n.replace(' ', '')}"
        cursor.execute("""
        INSERT OR REPLACE INTO attendance_sessions (
            session_id, centre_id, date, day, time, subject, session_name,
            manual_present_count, ai_camera_count, total_students, difference, discrepancy_status,
            is_locked, submitted_by, submitted_at
        ) VALUES (?, 'TC1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Training Centre Official 1', ?)
        """, (s_id, date_v, day_v, time_v, subj_v, sess_n, man_v, ai_v, tot_v, diff_v, stat_v, now_str))

    # TC2 Historical Sessions (Total 28)
    tc2_data = [
        # October 2026
        ("2026-10-08", "Thursday", "10:00 AM", "Thermodynamics", "Session 1", 25, 24, 28, 1, "Discrepancy"),
        ("2026-10-07", "Wednesday", "10:00 AM", "CNC Programming & G-Code", "Session 1", 24, 23, 28, 1, "Discrepancy"),
        ("2026-10-06", "Tuesday", "10:00 AM", "CNC Milling Fundamentals", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-10-05", "Monday", "10:00 AM", "Hydraulics & Pneumatics", "Session 1", 25, 25, 28, 0, "Matched"),
        ("2026-10-02", "Friday", "10:00 AM", "Industrial Tool Safety", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-10-01", "Thursday", "10:00 AM", "Precision Metrology", "Session 1", 26, 26, 28, 0, "Matched"),
        # September 2026
        ("2026-09-30", "Wednesday", "10:00 AM", "CAD 3D Modeling (SolidWorks)", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-09-29", "Tuesday", "10:00 AM", "CAM Toolpath Generation", "Session 1", 25, 23, 28, 2, "Discrepancy"),
        ("2026-09-28", "Monday", "10:00 AM", "Feed & Speed Optimization", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-09-25", "Friday", "10:00 AM", "Lathe Turning Practicals", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-09-24", "Thursday", "10:00 AM", "Coolant & Lubrication Systems", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-09-23", "Wednesday", "10:00 AM", "Thermodynamics", "Session 1", 25, 24, 28, 1, "Discrepancy"),
        ("2026-09-22", "Tuesday", "10:00 AM", "Surface Grinding Operations", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-09-21", "Monday", "10:00 AM", "Geometric Dimensioning & Tol", "Session 1", 28, 28, 28, 0, "Matched"),
        ("2026-09-18", "Friday", "10:00 AM", "Cutter Compensation Codes", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-09-17", "Thursday", "10:00 AM", "Spindle Speed Control", "Session 1", 25, 23, 28, 2, "Discrepancy"),
        ("2026-09-16", "Wednesday", "10:00 AM", "Carbide Insert Selection", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-09-15", "Tuesday", "10:00 AM", "Coordinate System Offsets (G54)", "Session 1", 26, 26, 28, 0, "Matched"),
        # August 2026
        ("2026-08-28", "Friday", "10:00 AM", "Thermodynamics", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-08-27", "Thursday", "10:00 AM", "Engineering Materials & Heat", "Session 1", 26, 24, 28, 2, "Discrepancy"),
        ("2026-08-26", "Wednesday", "10:00 AM", "Workshop Health & Safety", "Session 1", 28, 28, 28, 0, "Matched"),
        ("2026-08-25", "Tuesday", "10:00 AM", "Vernier Caliper & Micrometer", "Session 1", 27, 27, 28, 0, "Matched"),
        ("2026-08-21", "Friday", "10:00 AM", "Dial Gauge Alignment", "Session 1", 26, 26, 28, 0, "Matched"),
        ("2026-08-20", "Thursday", "10:00 AM", "Drill Press Operations", "Session 1", 27, 25, 28, 2, "Discrepancy"),
        ("2026-08-19", "Wednesday", "10:00 AM", "Bench Vise & Filing Practicals", "Session 1", 28, 28, 28, 0, "Matched")
    ]

    for item in tc2_data:
        date_v, day_v, time_v, subj_v, sess_n, man_v, ai_v, tot_v, diff_v, stat_v = item
        s_id = f"ATT-TC2-{date_v.replace('-', '')}-{sess_n.replace(' ', '')}"
        cursor.execute("""
        INSERT OR REPLACE INTO attendance_sessions (
            session_id, centre_id, date, day, time, subject, session_name,
            manual_present_count, ai_camera_count, total_students, difference, discrepancy_status,
            is_locked, submitted_by, submitted_at
        ) VALUES (?, 'TC2', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Training Centre Official 2', ?)
        """, (s_id, date_v, day_v, time_v, subj_v, sess_n, man_v, ai_v, tot_v, diff_v, stat_v, now_str))

if __name__ == "__main__":
    init_db()
    print("Database updated and initialized successfully with historical records and user emails.")
