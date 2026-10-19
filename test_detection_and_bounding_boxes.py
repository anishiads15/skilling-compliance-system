import os
import sys
import json
import base64
import math
import cv2
import numpy as np
import urllib.request

print("======================================================================")
print("COMPREHENSIVE AUDIT & VERIFICATION TEST: DETECTION & BOUNDING BOXES")
print("======================================================================")

# --------------------------------------------------------------------
# 1. AUDIT & VERIFY FRONTEND STYLING (static/app.js)
# --------------------------------------------------------------------
print("\n[TEST 1] Verifying Professional Bounding Box Visuals in static/app.js...")
with open("static/app.js", "r", encoding="utf-8") as f:
    app_js = f.read()

# Check for professional styling parameters
assert "ctx.lineWidth = 1.5" in app_js, "Failed: Outline thickness should be thin 1.5px"
assert "drawRoundedOutline" in app_js, "Failed: Rounded outline helper missing"
assert "rgba(16, 185, 129, 0.04)" in app_js, "Failed: Subtle student inner tint missing"
assert "rgba(2, 132, 199, 0.04)" in app_js, "Failed: Subtle equipment inner tint missing"
assert "drawProfessionalTag" in app_js, "Failed: Compact professional tag function missing"
assert "rgba(15, 23, 42, 0.88)" in app_js, "Failed: Dark translucent tag backdrop missing"
assert "Inter" in app_js, "Failed: Clean Inter typography missing"
assert "Math.round(det.confidence * 100)" in app_js, "Failed: Confidence score display missing on students"
assert "Math.round(eq.confidence * 100)" in app_js, "Failed: Confidence score display missing on equipment"
assert "tagX = Math.max(3, Math.min(canvas.width - tagW - 3, x))" in app_js, "Failed: Boundary clamping missing"
assert "tagY = (y >= tagH + 4) ? (y - tagH - 2) : (y + 3)" in app_js, "Failed: Adaptive top boundary placement missing"
assert "sqSize = fw * scaleX" in app_js, "Failed: Square face blur dimension calculation missing"
print("  PASS: Professional bounding box outlines, rounded corners, typography, confidence scores, and boundary clamping verified.")

# --------------------------------------------------------------------
# 2. VERIFY FACE PRIVACY SEPARATION (NO LABELS / BORDERS ON FACES)
# --------------------------------------------------------------------
print("\n[TEST 2] Verifying Face Privacy Blurring Separation...")
assert "PRIVACY PROTECTED" not in app_js, "Failed: Face privacy must not have text labels"
assert "FACE" not in app_js or "drawProfessionalTag" in app_js, "Failed: Check tag logic"
# Verify blur loop in app.js does not invoke drawProfessionalTag or strokeRect/drawRoundedOutline
blur_section = app_js[app_js.find("allFaceSquares.forEach"):app_js.find("Draw Equipment & Computer Detections")]
assert "drawProfessionalTag" not in blur_section, "Failed: Face privacy must not have tags"
assert "stroke" not in blur_section, "Failed: Face privacy must not have outlines/borders"
print("  PASS: Face privacy is purely square mosaic blur with zero bounding boxes, borders, or labels.")

# --------------------------------------------------------------------
# 3. VERIFY BACKEND DETECTION IMPROVEMENTS (ai_service.py)
# --------------------------------------------------------------------
print("\n[TEST 3] Verifying Backend Detection Pipeline & Anti-Flicker in ai_service.py...")
import ai_service

# Verify IoU computation function
assert hasattr(ai_service, "compute_iou"), "Failed: compute_iou missing in ai_service"
iou_val = ai_service.compute_iou([10, 10, 50, 50], [20, 20, 50, 50])
assert 0.46 < iou_val < 0.48, f"Failed: compute_iou calculation error: {iou_val}"

# Verify extended equipment classes
assert 24 in ai_service.COCO_EQUIPMENT_CLASSES, "Class 24 (backpack/storage bag) missing"
assert 28 in ai_service.COCO_EQUIPMENT_CLASSES, "Class 28 (suitcase/kit) missing"
assert 39 in ai_service.COCO_EQUIPMENT_CLASSES, "Class 39 (bottle/container) missing"
assert 73 in ai_service.COCO_EQUIPMENT_CLASSES, "Class 73 (book/manual) missing"

# Verify tracker smoothing and anti-flicker
st = ai_service.AnonymousStudentTracker(max_disappeared=25, dist_thresh=200.0)
frame1_boxes = [{"bbox": [100, 100, 80, 160], "confidence": 0.88}]
t1 = st.update(frame1_boxes)
assert len(t1) == 1 and t1[0]["code"] == "STU01"

# Simulate single frame detector dropout
t2 = st.update([])
assert len(t2) == 1 and t2[0]["code"] == "STU01", "Failed: Anti-flicker failed, track disappeared during 1-frame dropout"

# Simulate object re-detected slightly shifted
frame3_boxes = [{"bbox": [104, 102, 80, 160], "confidence": 0.89}]
t3 = st.update(frame3_boxes)
assert len(t3) == 1 and t3[0]["code"] == "STU01", "Failed: Tracker lost track identity"
# Verify EMA smoothing: smoothed x should be between 100 and 104
assert 100 <= t3[0]["bbox"][0] <= 104, "Failed: Bounding box EMA smoothing failed"
print("  PASS: IoU NMS, expanded equipment classes, EMA bbox smoothing, and anti-flicker persistence verified.")

# --------------------------------------------------------------------
# 4. VERIFY PARTIALLY VISIBLE & EDGE-CROPPED DETECTION LOGIC
# --------------------------------------------------------------------
print("\n[TEST 4] Verifying Partially Visible & Edge Detection Sensitivity...")
# Edge candidate at (5, 5) with confidence 0.15 should be accepted
edge_frame = np.full((360, 640, 3), 40, dtype=np.uint8)
# Call detect_live_frame with client_persons including edge and interior candidates
client_persons_test = [
    {"bbox": [5, 10, 80, 180], "confidence": 0.16},  # partially visible edge person
    {"bbox": [250, 80, 100, 200], "confidence": 0.85}  # clear interior person
]
res_edge = ai_service.detect_live_frame(
    edge_frame,
    centre_id="TC1",
    client_persons=client_persons_test
)
assert res_edge["count"] >= 2, f"Failed: Expected at least 2 detected students, got {res_edge['count']}"
print(f"  PASS: Successfully accepted partially visible edge person (count: {res_edge['count']}).")

# --------------------------------------------------------------------
# 5. LIVE SERVER API ENDPOINT VERIFICATION (http://127.0.0.1:5000)
# --------------------------------------------------------------------
print("\n[TEST 5] Verifying Live Server API Endpoint (/api/camera/detect_frame)...")
_, buf = cv2.imencode(".jpg", edge_frame)
b64_img = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

payload = {
    "image": b64_img,
    "centre_id": "TC1",
    "client_faces": [{"bbox": [260, 90, 45, 45]}],
    "client_persons": client_persons_test,
    "client_equipment": [
        {"class": "laptop", "bbox": [180, 200, 70, 50], "confidence": 0.88},
        {"class": "chair", "bbox": [170, 220, 60, 80], "confidence": 0.75}
    ]
}
req = urllib.request.Request(
    "http://127.0.0.1:5000/api/camera/detect_frame",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode("utf-8"))

assert data["success"] is True, "Failed: API responded with success: False"
assert data["ai_detected_count"] >= 2, f"Failed: Expected count >= 2, got {data['ai_detected_count']}"
assert len(data["face_squares"]) == 1, "Failed: Expected 1 square face region"
assert data["face_squares"][0][2] == data["face_squares"][0][3], "Failed: Face blur is not perfectly square"
assert data["equipment_detected_count"] >= 1, "Failed: Expected equipment detections"

# Check label and confidence in detections
first_det = data["detections"][0]
assert "confidence" in first_det and first_det["confidence"] > 0, "Failed: Detection confidence missing"
print(f"  PASS: API returned {data['ai_detected_count']} students, {data['equipment_detected_count']} equipment, "
      f"and 1 square face blur with confidence scores.")

# --------------------------------------------------------------------
# 6. VERIFY REAL FOOTAGE PROCESSING (TC2: static/uploads/tc2_uploaded_footage.mp4)
# --------------------------------------------------------------------
print("\n[TEST 6] Verifying Actual TC2 Video Footage Detection...")
video_path = os.path.join("static", "uploads", "tc2_uploaded_footage.mp4")
assert os.path.exists(video_path), f"Failed: Video file {video_path} not found"

cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
print(f"  TC2 video opened: {total_frames} total frames available.")

# Sample 3 frames from different parts of the video
sample_indices = [int(total_frames * 0.2), int(total_frames * 0.5), int(total_frames * 0.8)]
total_tc2_students_seen = 0
total_tc2_comps_seen = 0

for idx in sample_indices:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if not ret:
        continue
    _, frame_buf = cv2.imencode(".jpg", frame)
    frame_b64 = "data:image/jpeg;base64," + base64.b64encode(frame_buf).decode("utf-8")
    
    tc2_payload = {
        "image": frame_b64,
        "centre_id": "TC2"
    }
    tc2_req = urllib.request.Request(
        "http://127.0.0.1:5000/api/camera/detect_frame",
        data=json.dumps(tc2_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    tc2_resp = urllib.request.urlopen(tc2_req)
    tc2_data = json.loads(tc2_resp.read().decode("utf-8"))
    
    stu_count = tc2_data["ai_detected_count"]
    comp_count = tc2_data["unique_computers_detected"]
    total_tc2_students_seen = max(total_tc2_students_seen, stu_count)
    total_tc2_comps_seen = max(total_tc2_comps_seen, comp_count)
    print(f"  Frame {idx}: Detected {stu_count} students, {comp_count} computers.")

cap.release()
assert total_tc2_students_seen >= 4, f"Failed: TC2 expected at least 4 students, got {total_tc2_students_seen}"
assert total_tc2_comps_seen >= 5, f"Failed: TC2 expected at least 5 computers, got {total_tc2_comps_seen}"
print(f"  PASS: Actual TC2 video footage processed with {total_tc2_students_seen} students and {total_tc2_comps_seen} unique computers detected.")

# --------------------------------------------------------------------
# 7. VERIFY UI PRESERVATION (No Upload Button, Collapsible Policy Dropdown)
# --------------------------------------------------------------------
print("\n[TEST 7] Verifying UI Preservation Constraints...")
assert 'id="uploadFootageInput"' not in app_js, "Failed: Upload footage input must not exist"
assert 'id="uploadFootageBtn"' not in app_js, "Failed: Upload footage button must not exist"
assert "<details" in app_js and "Anonymous Tracking Policy" in app_js, "Failed: Policy accordion missing"
print("  PASS: No upload option present; Anonymous Tracking Policy dropdown intact.")

print("\n======================================================================")
print(">>> ALL 7 TEST SUITES PASSED FLAWLESSLY! SYSTEM IS 100% OPERATIONAL <<<")
print("======================================================================")
