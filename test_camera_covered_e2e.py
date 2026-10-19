import requests
import numpy as np
import cv2
import base64
import time

def encode_frame(img):
    _, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 75])
    return "data:image/jpeg;base64," + base64.b64encode(enc).decode("utf-8")

def test_covered_and_dashboard():
    base_url = "http://127.0.0.1:5000"

    print("=== TEST 1: Check initial dashboard status ===")
    r_dash = requests.get(f"{base_url}/api/dashboard/overview").json()
    print("Initial dashboard centres:", [(c["centre_id"], c["camera_status"], c.get("is_camera_covered")) for c in r_dash["centres"]])

    print("\n=== TEST 2: Simulate physical camera covered on TC1 ===")
    # Covered frame (dark tight palm/tape on lens: mean ~ 4, std ~ 1)
    covered_frame = np.random.normal(4, 1.2, (360, 640, 3)).clip(0, 255).astype(np.uint8)
    covered_b64 = encode_frame(covered_frame)

    # Send 3 covered frames over 1.5 seconds to trigger sustained obstruction (> 1.2s and >= 2 frames)
    for i in range(4):
        resp = requests.post(f"{base_url}/api/camera/detect_frame", json={
            "image": covered_b64,
            "centre_id": "TC1",
            "client_timestamp": time.time() * 1000.0
        }).json()
        print(f"Covered frame {i+1}: is_camera_covered={resp.get('is_camera_covered')}, status={resp.get('coverage_alert', {}).get('status')}")
        time.sleep(0.5)

    print("\n=== TEST 3: Verify camera_alerts list (/api/alerts/footage) ===")
    r_alerts = requests.get(f"{base_url}/api/alerts/footage?centre_id=TC1").json()
    print(f"Total alerts for TC1: {r_alerts.get('total')}, ongoing: {r_alerts.get('ongoing_count')}")
    if r_alerts.get("alerts"):
        latest = r_alerts["alerts"][0]
        print(f"Latest Alert: ID={latest.get('alert_id')}, Date={latest.get('date_covered')}, Time={latest.get('time_covered')}, Status={latest.get('status')}, Centre={latest.get('centre_name')}")

    print("\n=== TEST 4: Verify Dashboard Overview card (/api/dashboard/overview) ===")
    r_dash2 = requests.get(f"{base_url}/api/dashboard/overview").json()
    for c in r_dash2["centres"]:
        if c["centre_id"] == "TC1":
            print(f"TC1 Dashboard Card Status: camera_status='{c['camera_status']}', is_camera_covered={c['is_camera_covered']}, covered_time='{c.get('covered_time')}'")
            assert c["is_camera_covered"] is True, "TC1 should be marked covered on dashboard!"
            assert c["camera_status"] == "camera covered", "TC1 camera_status should be 'camera covered'!"
        elif c["centre_id"] == "TC2":
            assert c["is_camera_covered"] is False, "TC2 must NOT be marked covered!"
            assert c["camera_status"] == "CAMERA ON", "TC2 camera_status should remain CAMERA ON!"

    print("\n=== TEST 5: Simulate camera uncovered on TC1 ===")
    # Normal classroom / illuminated scene frame (mean ~ 110, std ~ 40)
    normal_frame = np.random.normal(110, 35.0, (360, 640, 3)).clip(0, 255).astype(np.uint8)
    # Add strong macroscopic variance across quadrants
    normal_frame[:180, :320] = 40
    normal_frame[180:, 320:] = 200
    normal_b64 = encode_frame(normal_frame)

    for i in range(3):
        resp = requests.post(f"{base_url}/api/camera/detect_frame", json={
            "image": normal_b64,
            "centre_id": "TC1",
            "client_timestamp": time.time() * 1000.0
        }).json()
        print(f"Clear frame {i+1}: is_camera_covered={resp.get('is_camera_covered')}, status={resp.get('coverage_alert', {}).get('status')}")
        time.sleep(0.4)

    print("\n=== TEST 6: Verify alert resolution ===")
    r_alerts_res = requests.get(f"{base_url}/api/alerts/footage?centre_id=TC1").json()
    if r_alerts_res.get("alerts"):
        latest_res = r_alerts_res["alerts"][0]
        print(f"Alert after uncovering: ID={latest_res.get('alert_id')}, Status={latest_res.get('status')}, ResolvedAt={latest_res.get('resolved_at')}")

    r_dash3 = requests.get(f"{base_url}/api/dashboard/overview").json()
    for c in r_dash3["centres"]:
        if c["centre_id"] == "TC1":
            print(f"TC1 Dashboard Card after resolution: camera_status='{c['camera_status']}', is_camera_covered={c['is_camera_covered']}")
            assert c["is_camera_covered"] is False, "TC1 should no longer be marked covered!"

    print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    test_covered_and_dashboard()
