import base64
import json
import urllib.request
import numpy as np
import cv2

BASE_URL = "http://127.0.0.1:5000"

def create_sample_frame():
    # Create synthetic frame with 2 persons
    frame = np.zeros((360, 640, 3), dtype=np.uint8)
    frame[:] = (30, 35, 45) # Dark room background
    
    # Draw simple person silhouettes that YOLO or tracker detects
    # Person 1
    cv2.circle(frame, (200, 100), 25, (180, 180, 180), -1)
    cv2.rectangle(frame, (170, 130), (230, 260), (120, 120, 120), -1)

    # Person 2
    cv2.circle(frame, (440, 100), 25, (180, 180, 180), -1)
    cv2.rectangle(frame, (410, 130), (470, 260), (120, 120, 120), -1)

    _, buffer = cv2.imencode('.jpg', frame)
    return base64.b64encode(buffer).decode('utf-8')

def test_camera_api():
    print("Testing /api/camera/detect_frame for TC1...")
    img_b64 = create_sample_frame()

    # Frame 1 for TC1
    req_data = {
        "image": img_b64,
        "centre_id": "TC1"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/camera/detect_frame",
        data=json.dumps(req_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        res1 = json.loads(resp.read().decode("utf-8"))

    print(f"[PASS] Status Code: {resp.status}")
    print(f"[PASS] Success: {res1['success']}")
    print(f"[PASS] TC1 Total Students: {res1['total_students']}")
    print(f"[PASS] AI Detected Count: {res1['ai_detected_count']}")
    print(f"[PASS] Official Attendance: {res1['official_attendance_count']}")
    print(f"[PASS] Discrepancy Flag: {res1['discrepancy_detected']}")

    # Frame 2 for TC2
    print("\nTesting /api/camera/detect_frame for TC2 (Centre Switching)...")
    req_data_tc2 = {
        "image": img_b64,
        "centre_id": "TC2"
    }
    req2 = urllib.request.Request(
        f"{BASE_URL}/api/camera/detect_frame",
        data=json.dumps(req_data_tc2).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp2:
        res2 = json.loads(resp2.read().decode("utf-8"))

    print(f"[PASS] TC2 Total Students: {res2['total_students']} (Expected 28)")
    print(f"[PASS] TC2 Official Attendance: {res2['official_attendance_count']} (Expected 24)")
    print(f"[PASS] TC2 AI Detected Count: {res2['ai_detected_count']}")
    assert res2['total_students'] == 28, f"Expected 28 for TC2, got {res2['total_students']}"

    print("\n[SUCCESS] Live camera API tested and verified!")

if __name__ == "__main__":
    test_camera_api()
