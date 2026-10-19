import sys
import time
import json
import base64
import requests
import numpy as np
import cv2
from datetime import datetime
import database
import ai_service

BASE_URL = "http://127.0.0.1:5000"
CONFIG_PATH = "equipment_detection_config.json"

def create_synthetic_frame(color=(128, 128, 128), text="Test Frame"):
    """Creates a base64 JPEG test frame with high visual variance (normal room)."""
    img = np.full((480, 640, 3), color, dtype=np.uint8)
    cv2.rectangle(img, (50, 50), (200, 300), (40, 40, 40), -1)
    cv2.rectangle(img, (250, 80), (550, 400), (200, 200, 200), -1)
    cv2.putText(img, text, (60, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

def create_black_frame(luminance=10):
    """Creates a completely dark/covered camera frame with near-zero variance."""
    img = np.full((480, 640, 3), (luminance, luminance, luminance), dtype=np.uint8)
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

def test_health():
    print("[1] Testing server connectivity...")
    r = requests.get(f"{BASE_URL}/", timeout=5)
    assert r.status_code == 200, f"Root page check failed: {r.status_code}"
    print("    Server is healthy.")

def test_camera_detection_and_echo():
    print("[2] Testing detect_frame with timestamp echo and normal frame...")
    frame = create_synthetic_frame(text="Operating Classroom")
    payload = {
        "centre_id": "TC1",
        "camera_id": "CAM-TC1",
        "frame": frame,
        "video_time": 12.34,
        "playback_timestamp": 1729123456789
    }
    # Ensure baseline is clear (3 consecutive clear frames resolve any prior lingering alert)
    for _ in range(3):
        r = requests.post(f"{BASE_URL}/api/camera/detect_frame", json=payload, timeout=10)
    assert r.status_code == 200, f"detect_frame failed: {r.text}"
    res = r.json()
    assert res.get("video_time") == 12.34, f"video_time not echoed: {res.get('video_time')}"
    assert res.get("playback_timestamp") == 1729123456789, f"playback_timestamp not echoed: {res.get('playback_timestamp')}"
    assert res.get("is_camera_covered") == False, "Normal textured frame wrongly marked as covered"
    print("    detect_frame echoed video_time and playback_timestamp correctly.")

def test_obstruction_operating_hours_and_debounce():
    print("[3] Testing camera obstruction manager: debounce, operating hours, and transition rate...")
    mgr = ai_service.camera_obstruction_mgr
    
    # Check within operating hours (simulate 10:00 AM)
    dt_day = datetime.now().replace(hour=10, minute=0, second=0)
    assert mgr.is_within_operating_hours("TC1", dt_day) == True, "10:00 AM should be within operating hours"
    
    # Check outside operating hours (simulate 22:00 PM)
    dt_night = datetime.now().replace(hour=22, minute=0, second=0)
    assert mgr.is_within_operating_hours("TC1", dt_night) == False, "22:00 PM should be outside operating hours"
    print("    Operating hours check: 10:00 AM -> True, 22:00 PM -> False.")

    # Test sudden vs gradual transition
    cid = "TEST_TC"
    mgr.reset_for_testing()
    
    # Seed luminance buffer with bright frames
    mgr.record_luminance(cid, 180.0, timestamp=100.0)
    mgr.record_luminance(cid, 175.0, timestamp=100.5)
    # Sudden drop to 15 at timestamp 101.0
    transition = mgr.classify_transition(cid, 15.0, current_time=101.0)
    assert transition == "Sudden lens coverage", f"Expected 'Sudden lens coverage', got {transition}"
    print(f"    Transition classification test 1 (sudden drop): {transition}")

    # Seed gradual drop
    mgr.record_luminance(cid, 50.0, timestamp=200.0)
    mgr.record_luminance(cid, 35.0, timestamp=200.5)
    transition_grad = mgr.classify_transition(cid, 25.0, current_time=201.0)
    assert transition_grad == "Gradual lighting reduction", f"Expected 'Gradual lighting reduction', got {transition_grad}"
    print(f"    Transition classification test 2 (gradual change): {transition_grad}")

def test_covered_detection_api_cycle():
    print("[4] Testing covered detection debounce, alert generation, and recovery via API...")
    # Load and temporarily adjust config for real integration test
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        orig_config = json.load(f)

    test_config = dict(orig_config)
    test_config["operating_hours"] = {
        "TC1": {"start": "00:00", "end": "23:59"},
        "TC2": {"start": "00:00", "end": "23:59"},
        "default": {"start": "00:00", "end": "23:59"}
    }
    test_config["camera_covered_config"] = {
        "confirm_duration_sec": 1.2,
        "demo_mode": True,
        "demo_confirm_duration_sec": 1.2,
        "resolve_clear_frames": 3
    }

    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(test_config, f, indent=2)

        black_frame = create_black_frame()
        normal_frame = create_synthetic_frame(text="Recovered Room")

        # Step A: First black frame should start debounce window, NOT immediately alert
        r1 = requests.post(f"{BASE_URL}/api/camera/detect_frame", json={
            "centre_id": "TC1",
            "camera_id": "CAM-TC1",
            "frame": black_frame
        }, timeout=10)
        res1 = r1.json()
        assert res1.get("is_camera_covered") == False, "First black frame should NOT trigger immediate covered alert (debounce window active)"
        print("    Debounce test passed: Frame 1 is_camera_covered = False.")

        # Step B: Wait for confirm duration (1.3s) and send consecutive covered frames
        time.sleep(1.3)
        for _ in range(2):
            r2 = requests.post(f"{BASE_URL}/api/camera/detect_frame", json={
                "centre_id": "TC1",
                "camera_id": "CAM-TC1",
                "frame": black_frame
            }, timeout=10)
        res2 = r2.json()
        assert res2.get("is_camera_covered") == True, f"Expected is_camera_covered=True, got {res2.get('is_camera_covered')}"
        assert res2.get("ai_detected_count_display") == "BLOCKED", f"Expected count_display 'BLOCKED', got {res2.get('ai_detected_count_display')}"
        print("    Confirmed covered: is_camera_covered = True, count_display = BLOCKED.")

        # Step C: Verify single continuous incident is open in database
        conn = database.get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM camera_alerts WHERE UPPER(centre_id) = 'TC1' AND status = 'Ongoing'")
        ongoing = c.fetchall()
        assert len(ongoing) >= 1, "Expected at least 1 ongoing alert in database"
        active_alert = dict(ongoing[0])
        print(f"    Ongoing alert in DB: ID={active_alert['alert_id']}, Type={active_alert['alert_type']}, Date={active_alert['date_covered']}, Time={active_alert['time_covered']}")

        # Step D: Send 3rd black frame - should remain single continuous incident (no duplicate)
        requests.post(f"{BASE_URL}/api/camera/detect_frame", json={
            "centre_id": "TC1",
            "camera_id": "CAM-TC1",
            "frame": black_frame
        }, timeout=10)
        c.execute("SELECT COUNT(*) as count FROM camera_alerts WHERE UPPER(centre_id) = 'TC1' AND status = 'Ongoing'")
        ongoing_count = c.fetchone()["count"]
        assert ongoing_count == 1, f"Expected exactly 1 ongoing alert (no duplicates), found {ongoing_count}"
        print(f"    Verified single continuous incident: ongoing count = {ongoing_count}.")

        # Step E: Send 3 clear frames to resolve
        for i in range(3):
            requests.post(f"{BASE_URL}/api/camera/detect_frame", json={
                "centre_id": "TC1",
                "camera_id": "CAM-TC1",
                "frame": normal_frame
            }, timeout=10)
        
        c.execute("SELECT status, resolved_at FROM camera_alerts WHERE alert_id = ?", (active_alert['alert_id'],))
        updated = dict(c.fetchone())
        assert updated["status"] == "Resolved", f"Expected status 'Resolved', got {updated['status']}"
        assert updated["resolved_at"] is not None, "resolved_at must be populated"
        print(f"    Obstruction resolved cleanly: status={updated['status']}, resolved_at={updated['resolved_at']}.")
        conn.close()

    finally:
        # Cleanly restore original config
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(orig_config, f, indent=2)

def test_sql_counts_and_api_endpoints():
    print("[5] Testing /api/alerts/footage and /api/dashboard/overview SQL calculations...")
    r = requests.get(f"{BASE_URL}/api/alerts/footage?centre_id=TC1", timeout=10)
    assert r.status_code == 200, f"/api/alerts/footage failed: {r.text}"
    res = r.json()
    assert "this_month_count" in res, "this_month_count missing from /api/alerts/footage"
    assert "total_count" in res, "total_count missing from /api/alerts/footage"
    assert isinstance(res["this_month_count"], int)
    assert isinstance(res["total_count"], int)
    print(f"    Footage Alerts for TC1: this_month_count={res['this_month_count']}, total_count={res['total_count']}, total_alerts_in_table={len(res['alerts'])}")

    # Check dashboard overview
    r_ov = requests.get(f"{BASE_URL}/api/dashboard/overview", timeout=10)
    assert r_ov.status_code == 200, f"/api/dashboard/overview failed: {r_ov.text}"
    ov = r_ov.json()
    found_tc1 = False
    for centre in ov.get("centres", []):
        if centre.get("centre_id") == "TC1":
            found_tc1 = True
            assert "covered_this_month" in centre, "covered_this_month missing from TC1 card"
            assert "covered_total" in centre, "covered_total missing from TC1 card"
            assert "status_display" in centre, "status_display missing from TC1 card"
            assert "covered_summary" in centre, "covered_summary missing from TC1 card"
            print(f"    TC1 Dashboard Card: this_month={centre['covered_this_month']}, total={centre['covered_total']}, status={centre['status_display']}, summary='{centre['covered_summary']}'")
    assert found_tc1, "TC1 not found in /api/dashboard/overview"

def test_after_hours_exclusion():
    print("[6] Testing after-hours exclusion from tampering statistics...")
    conn = database.get_db_connection()
    c = conn.cursor()
    # Insert a synthetic after-hours record
    alert_id = f"ALERT-TEST-NIGHT-{int(time.time())}"
    c.execute("""
        INSERT INTO camera_alerts (alert_id, centre_id, camera_id, alert_type, date_covered, time_covered, status, created_at)
        VALUES (?, 'TC1', 'CAM-TC1', 'camera_dark_after_hours', '2026-10-17', '23:00:00', 'Resolved', datetime('now'))
    """, (alert_id,))
    conn.commit()

    # Query footage alerts - this after-hours record must NOT appear
    r = requests.get(f"{BASE_URL}/api/alerts/footage?centre_id=TC1", timeout=10)
    res = r.json()
    alert_types = [a["alert_type"] for a in res["alerts"]]
    assert "camera_dark_after_hours" not in alert_types, "camera_dark_after_hours leaked into /api/alerts/footage!"
    
    # Cleanup test record
    c.execute("DELETE FROM camera_alerts WHERE alert_id = ?", (alert_id,))
    conn.commit()
    conn.close()
    print("    Confirmed: camera_dark_after_hours is strictly excluded from Footage Alerts and counts.")

if __name__ == "__main__":
    print("=== STARTING FULL HARDENED SPECIFICATION TEST ===")
    test_health()
    test_camera_detection_and_echo()
    test_obstruction_operating_hours_and_debounce()
    test_covered_detection_api_cycle()
    test_sql_counts_and_api_endpoints()
    test_after_hours_exclusion()
    print("=== ALL 6 SPECIFICATION TESTS PASSED SUCCESSFULLY! ===")
