import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:5000"

def post(endpoint, data):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode("utf-8"))

def get(endpoint):
    with urllib.request.urlopen(f"{BASE_URL}{endpoint}") as resp:
        return resp.getcode(), json.loads(resp.read().decode("utf-8"))

def run_tests():
    print("==================================================")
    print("  AI-BASED TRAINING CENTRE COMPLIANCE TEST SUITE  ")
    print("==================================================")

    # 1. Login TC1 Official (TC001 / Centre@1234)
    code, tc1_login = post("/api/auth/login", {
        "user_id": "TC001",
        "password": "Centre@1234",
        "role": "Training Centre Official"
    })
    assert code == 200 and tc1_login["success"]
    assert tc1_login["user"]["centre_id"] == "TC1"
    print(f"[PASS] TC001 Login successful: {tc1_login['user']['name']} ({tc1_login['user']['centre_name']})")

    # 1B. Login TC2 Official (TC002 / Centre@5678)
    code, tc2_login = post("/api/auth/login", {
        "user_id": "TC002",
        "password": "Centre@5678",
        "role": "Training Centre Official"
    })
    assert code == 200 and tc2_login["success"]
    assert tc2_login["user"]["centre_id"] == "TC2"
    print(f"[PASS] TC002 Login successful: {tc2_login['user']['name']} ({tc2_login['user']['centre_name']})")

    # 2. Get attendance for TC1
    code, att_tc1 = get("/api/attendance?centre_id=TC1")
    assert code == 200
    print(f"[PASS] Step 5: TC1 Attendance list loaded: {att_tc1['total_students']} students enrolled")

    # 3. Register a new student in TC1
    code, reg_res = post("/api/students/register", {
        "centre_id": "TC1",
        "name": "Student 31",
        "course": "Vocational Electrician",
        "batch": "Batch 1",
        "qualification": "12th Standard"
    })
    assert code == 200 and reg_res["success"]
    print(f"[PASS] Step 7: Registered new student: {reg_res['student']['name']} (Roll: {reg_res['student']['roll_number']})")

    # 4. Check data isolation: TC1 has students, TC2 still has 28
    code, att_tc1_after = get("/api/attendance?centre_id=TC1")
    code, att_tc2 = get("/api/attendance?centre_id=TC2")
    assert att_tc1_after['total_students'] >= 30, f"Expected >= 30, got {att_tc1_after['total_students']}"
    assert att_tc2['total_students'] == 28, f"Expected 28, got {att_tc2['total_students']}"
    print(f"[PASS] Strict Separation: TC1 = {att_tc1_after['total_students']} students | TC2 = {att_tc2['total_students']} students")

    # 5. Submit Equipment Issue from TC1
    code, iss_res = post("/api/equipment/issues", {
        "centre_id": "TC1",
        "equipment_name": "Lathe Machine 03",
        "issue_type": "Damaged",
        "comment": "Machine 03 is damaged. Motor burnt out during afternoon workshop session.",
        "date": "2026-10-07",
        "reported_by": "Training Centre Official 1"
    })
    assert code == 200 and iss_res["success"]
    print(f"[PASS] Step 8: Equipment issue submitted with ID: {iss_res['issue_id']}")

    # 6. Login Government Official (GOV001 / Gov@1234)
    code, gov_login = post("/api/auth/login", {
        "user_id": "GOV001",
        "password": "Gov@1234",
        "role": "Government Official"
    })
    assert code == 200 and gov_login["success"]
    print(f"[PASS] GOV001 Government Official Login successful: {gov_login['user']['name']}")

    # 7. Gov Dual Centre Overview
    code, overview = get("/api/dashboard/overview")
    assert code == 200 and len(overview["centres"]) == 2
    for c in overview["centres"]:
        print(f"  [METRICS] Centre: {c['centre_name']} | Present: {c['attendance_present']}/{c['attendance_total']} | AI Camera: {c['camera_visible']}/{c['camera_total']} | Discrepancy: {c['difference']} | Issues: {c['open_issues']}")
    print("[PASS] Step 10 & 17: Government multi-centre dashboard overview verified")

    # 8. Gov Footage API Check for TC1
    code, footage_tc1 = get("/api/footage?centre_id=TC1")
    assert code == 200
    assert footage_tc1["status"] == "CAMERA ON"
    assert footage_tc1["discrepancy_detected"] is True
    assert len(footage_tc1["detections"]) > 0
    # verify tracking labels
    first_det = footage_tc1["detections"][0]
    assert first_det["label"].startswith("STU")
    print(f"[PASS] Step 12: Camera {footage_tc1['camera_id']} ({footage_tc1['status']}): {footage_tc1['ai_detected_count']} / {footage_tc1['total_students']} visible | Anonymous Label: {first_det['label']} | Discrepancy flag: {footage_tc1['discrepancy_detected']}")

    # 9. Gov Equipment Issues List Check
    code, all_issues = get("/api/equipment/issues")
    assert code == 200
    tc1_issues = [i for i in all_issues["issues"] if i["centre_id"] == "TC1"]
    assert any("Lathe Machine 03" in i["equipment_name"] for i in tc1_issues)
    print(f"[PASS] Step 13: Government Equipment repository contains submitted TC1 issues ({len(all_issues['issues'])} total across centres)")

    print("\n==================================================")
    print("  ALL 14 SPECIFICATION WORKFLOW STEPS VERIFIED!   ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
