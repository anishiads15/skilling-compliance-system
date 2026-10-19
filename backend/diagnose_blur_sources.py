import cv2
import json
import numpy as np
import ai_service

def diagnose_video():
    video_path = "static/uploads/tc2_uploaded_footage.mp4"
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Cannot open video", video_path)
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video opened: {total_frames} frames, {fps} fps")

    # Sample 10 frames across the video
    sample_indices = np.linspace(0, total_frames - 1, 10, dtype=int)
    results = []

    for idx in sample_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue

        h, w = frame.shape[:2]

        # 1. Test YOLO-pose genuine face extraction
        pose_faces = ai_service.extract_genuine_face_squares(frame)

        # 2. Test full server detection without client faces
        res_no_client = ai_service.detect_live_frame(frame, centre_id="TC2")
        
        # 3. Test full server detection WITH a simulated client front face (like BlazeFace)
        # Simulate front person face
        front_face = [{"bbox": [int(w*0.4), int(h*0.3), 80, 80], "cx": w*0.4+40, "cy": h*0.3+40, "probability": 0.95}]
        res_with_client = ai_service.detect_live_frame(frame, centre_id="TC2", client_faces=front_face)

        results.append({
            "frame_idx": int(idx),
            "video_time": round(float(idx / fps), 2),
            "frame_size": [w, h],
            "pose_faces_count": len(pose_faces),
            "pose_face_boxes": [f["face_bbox"] for f in pose_faces],
            "no_client_face_squares_count": len(res_no_client["face_squares"]),
            "no_client_face_squares": res_no_client["face_squares"],
            "no_client_person_count": len(res_no_client["detections"]),
            "with_client_face_squares_count": len(res_with_client["face_squares"]),
            "with_client_face_squares": res_with_client["face_squares"],
            "with_client_person_count": len(res_with_client["detections"]),
        })

    cap.release()

    print("\n--- DIAGNOSTIC RESULTS SUMMARY ---")
    for r in results:
        t = r["video_time"]
        w, h = r["frame_size"]
        p_faces = r["pose_faces_count"]
        p_cnt = r["no_client_person_count"]
        sq_no = r["no_client_face_squares_count"]
        sq_with = r["with_client_face_squares_count"]

        # Check largest square
        max_sq_no = max([sq[2] for sq in r["no_client_face_squares"]], default=0)
        max_pct_h = round((max_sq_no / h) * 100, 1)

        print(f"Time {t}s (Frame {r['frame_idx']}):")
        print(f"  - Visible People Detected: {p_cnt}")
        print(f"  - Raw YOLO-Pose Face Landmarks: {p_faces}")
        print(f"  - Server Output Squares (No Client BlazeFace): {sq_no} squares (max side {max_sq_no}px = {max_pct_h}% of frame height)")
        print(f"  - Server Output Squares (WITH 1 Client BlazeFace sent): {sq_with} squares")
        
        # Check overlaps
        sqs = r["no_client_face_squares"]
        overlaps = 0
        for i in range(len(sqs)):
            for j in range(i + 1, len(sqs)):
                b1, b2 = sqs[i], sqs[j]
                # compute IoU
                x1 = max(b1[0], b2[0])
                y1 = max(b1[1], b2[1])
                x2 = min(b1[0] + b1[2], b2[0] + b2[2])
                y2 = min(b1[1] + b1[3], b2[1] + b2[3])
                inter = max(0, x2 - x1) * max(0, y2 - y1)
                a1 = b1[2] * b1[3]
                a2 = b2[2] * b2[3]
                iou = inter / (a1 + a2 - inter) if (a1 + a2 - inter) > 0 else 0
                if iou > 0.10:
                    overlaps += 1
                    print(f"    * OVERLAPPING SQUARES FOUND: Sq{i} {b1} and Sq{j} {b2} with IoU={round(iou, 2)}")
        print(f"  - Overlapping duplicate pairs in output: {overlaps}")
        print()

if __name__ == "__main__":
    diagnose_video()
