import cv2
import base64
import json
import time
import os
import requests

def run_verification():
    video_path = os.path.join("static", "uploads", "tc2_uploaded_footage.mp4")
    out_dir = os.path.join("static", "demo_assets")
    os.makedirs(out_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open {video_path}")
        return

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_sec = total_frames / fps

    print(f"Video loaded: {video_path}")
    print(f"Resolution: {width}x{height}, FPS: {fps:.1f}, Frames: {total_frames}, Duration: {duration_sec:.1f}s")

    # Sample 10 evenly spaced frames across the duration
    sample_indices = [int(i * (total_frames - 1) / 9) for i in range(10)]
    print(f"Sample frame indices: {sample_indices}")

    api_url = "http://127.0.0.1:5000/api/camera/detect_frame"
    
    results_summary = []
    total_time = 0.0

    for idx, f_idx in enumerate(sample_indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
        ret, frame = cap.read()
        if not ret:
            print(f"Failed to read frame at index {f_idx}")
            continue

        timestamp_sec = f_idx / fps
        h, w = frame.shape[:2]

        # Encode to JPEG
        _, enc_jpg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        jpg_b64 = "data:image/jpeg;base64," + base64.b64encode(enc_jpg).decode("utf-8")

        # Send to API
        t0 = time.time()
        resp = requests.post(api_url, json={
            "image": jpg_b64,
            "centre_id": "TC2",
            "client_timestamp": time.time() * 1000.0
        }, timeout=15)
        dt_ms = (time.time() - t0) * 1000.0
        total_time += dt_ms

        data = resp.json()
        active_count = data.get("active_count", 0)
        face_squares = data.get("face_squares", [])
        detections = data.get("detections", [])
        eq_dets = data.get("equipment_detections", [])
        cat_counts = data.get("category_counts", {})
        eq_summary = data.get("equipment_summary", {})
        cat_breakdown = data.get("category_breakdown", {})

        # Draw annotation on a copy of the frame
        annotated = frame.copy()

        # Draw equipment boxes in yellow/cyan
        for eq in eq_dets:
            bx = eq.get("bbox", [])
            lbl = eq.get("label", "equipment")
            cat = eq.get("category_tab", "Equipment")
            conf = eq.get("confidence", 0.0)
            if len(bx) == 4:
                ex1, ey1, ew, eh = bx
                color = (0, 220, 255) if cat == "Desks" else ((255, 180, 0) if cat == "Fans" else (200, 100, 255))
                cv2.rectangle(annotated, (ex1, ey1), (ex1 + ew, ey1 + eh), color, 2)
                cv2.putText(annotated, f"{lbl} {conf:.2f}", (ex1, max(15, ey1 - 4)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

        # Draw student boxes in green
        for det in detections:
            bx = det.get("bbox", [])
            conf = det.get("confidence", 0.0)
            sid = det.get("track_id", "?")
            if len(bx) == 4:
                sx1, sy1, sw, sh = bx
                cv2.rectangle(annotated, (sx1, sy1), (sx1 + sw, sy1 + sh), (0, 255, 0), 2)
                cv2.putText(annotated, f"Student #{sid} ({conf:.2f})", (sx1, max(15, sy1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        # Draw and apply face blur squares in frosted blue
        unblurred_count = 0
        for fs in face_squares:
            if len(fs) >= 4:
                fx, fy, fsize, _ = fs
                # Apply blur to visual representation
                fx_c = max(0, min(w - 1, fx))
                fy_c = max(0, min(h - 1, fy))
                fs_w = max(1, min(w - fx_c, fsize))
                fs_h = max(1, min(h - fy_c, fsize))
                roi = annotated[fy_c:fy_c+fs_h, fx_c:fx_c+fs_w]
                if roi.size > 0:
                    kw = max(15, (fs_w // 3) * 2 + 1)
                    blurred_roi = cv2.GaussianBlur(roi, (kw, kw), 25)
                    # Semi-transparent privacy tint
                    tint = blurred_roi.astype(float) * 0.75 + 35.0
                    annotated[fy_c:fy_c+fs_h, fx_c:fx_c+fs_w] = tint.astype('uint8')
                cv2.rectangle(annotated, (fx_c, fy_c), (fx_c + fs_w, fy_c + fs_h), (255, 120, 0), 2)

        # Check coverage
        if len(detections) > len(face_squares):
            unblurred_count = len(detections) - len(face_squares)

        # Add HUD overlay
        hud_text = f"Frame {f_idx} ({timestamp_sec:.1f}s) | Students: {active_count} | Faces Blurred: {len(face_squares)} | Latency: {dt_ms:.0f}ms"
        cv2.putText(annotated, hud_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 0), 3)
        cv2.putText(annotated, hud_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 1)

        eq_text = f"Fans: {cat_counts.get('fans', 0)} | Desks: {cat_counts.get('desks', 0)} | Devices: {cat_counts.get('electronic_devices', 0)}"
        cv2.putText(annotated, eq_text, (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 3)
        cv2.putText(annotated, eq_text, (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 1)

        out_path = os.path.join(out_dir, f"review_frame_{idx+1:02d}.jpg")
        cv2.imwrite(out_path, annotated)

        summary_item = {
            "index": idx + 1,
            "frame_idx": f_idx,
            "timestamp_sec": round(timestamp_sec, 2),
            "students_detected": active_count,
            "face_squares_blurred": len(face_squares),
            "unblurred_faces": unblurred_count,
            "fans_count": cat_counts.get("fans", 0),
            "desks_count": cat_counts.get("desks", 0),
            "devices_count": cat_counts.get("electronic_devices", 0),
            "latency_ms": round(dt_ms, 1),
            "saved_image": out_path
        }
        results_summary.append(summary_item)
        print(f"Frame {idx+1:02d} ({timestamp_sec:.1f}s): Students={active_count}, BlurSquares={len(face_squares)}, Unblurred={unblurred_count}, Fans={cat_counts.get('fans', 0)}, Desks={cat_counts.get('desks', 0)}, Devices={cat_counts.get('electronic_devices', 0)}, Latency={dt_ms:.1f}ms")

    cap.release()

    avg_latency = total_time / len(sample_indices) if sample_indices else 0.0
    print(f"\nAverage API Latency across 10 frames: {avg_latency:.1f} ms")

    # Also test TC1 Live Webcam endpoint to verify no regression
    print("\n--- Testing TC1 (Laptop webcam / live session) for regression ---")
    dummy_frame = cv2.imread(os.path.join(out_dir, "review_frame_01.jpg"))
    _, tc1_jpg = cv2.imencode(".jpg", dummy_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
    tc1_b64 = "data:image/jpeg;base64," + base64.b64encode(tc1_jpg).decode("utf-8")
    
    t0_tc1 = time.time()
    resp_tc1 = requests.post(api_url, json={
        "image": tc1_b64,
        "centre_id": "TC1",
        "client_timestamp": time.time() * 1000.0
    }, timeout=15)
    tc1_ms = (time.time() - t0_tc1) * 1000.0
    tc1_data = resp_tc1.json()
    print(f"TC1 Response: Success={tc1_data.get('success')}, Students={tc1_data.get('ai_detected_count')}, Devices={tc1_data.get('devices_detected_count')}, Latency={tc1_ms:.1f}ms")

    # Dump full JSON summary
    summary_path = os.path.join(out_dir, "tc2_verification_summary.json")
    with open(summary_path, "w") as f:
        json.dump({
            "video": video_path,
            "resolution": f"{width}x{height}",
            "frames": total_frames,
            "duration_sec": duration_sec,
            "average_latency_ms": round(avg_latency, 1),
            "tc1_latency_ms": round(tc1_ms, 1),
            "samples": results_summary
        }, f, indent=2)
    print(f"Verification summary written to {summary_path}")

if __name__ == "__main__":
    run_verification()
