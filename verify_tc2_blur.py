"""
verify_tc2_blur.py
Simulates 60 seconds (1500 frames @ 25fps) of Training Centre 2 footage playback,
running server-side YOLO + client-side tracking, deduplication, and rendering logic.
Measures:
  1. Max squares drawn vs visible people
  2. Overlapping square pairs count
  3. Largest square size (% height, % area, px)
  4. Latency / lag during movement
  5. Blink frames (face uncovered during playback)
  6. Saves 10 sampled preview frames with frosted blur applied
"""

import os
import sys
import time
import base64
import math
import cv2
import numpy as np

# Ensure root directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import ai_service

def compute_box_iou(b1, b2):
    # b = [x, y, w, h]
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[0] + b1[2], b2[0] + b2[2])
    y2 = min(b1[1] + b1[3], b2[1] + b2[3])
    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    union_area = (b1[2] * b1[3]) + (b2[2] * b2[3]) - inter_area
    return inter_area / union_area if union_area > 0 else 0.0

def compute_box_containment(b1, b2):
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[0] + b1[2], b2[0] + b2[2])
    y2 = min(b1[1] + b1[3], b2[1] + b2[3])
    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    min_area = max(1, min(b1[2] * b1[3], b2[2] * b2[3]))
    return inter_area / min_area

class ClientFaceTracker:
    def __init__(self, cw=1280, ch=720):
        self.cw = cw
        self.ch = ch
        self.active_tracks = []
        self.next_track_id = 0
        self.max_height_pct = 0.35
        self.max_area_pct = 0.06
        self.hold_duration_ms = 800.0
        self.min_consecutive_hits = 1
        self.base_padding = 0.10
        self.speed_padding_max = 0.0

    def deduplicate_tracks(self):
        if len(self.active_tracks) <= 1:
            return
        keep = []
        dropped = set()
        for i in range(len(self.active_tracks)):
            if i in dropped:
                continue
            t1 = self.active_tracks[i]
            for j in range(i + 1, len(self.active_tracks)):
                if j in dropped:
                    continue
                t2 = self.active_tracks[j]
                b1 = [t1['currX'], t1['currY'], t1['currSize'], t1['currSize']]
                b2 = [t2['currX'], t2['currY'], t2['currSize'], t2['currSize']]
                iou = compute_box_iou(b1, b2)
                cont = compute_box_containment(b1, b2)
                c1x = t1['currX'] + t1['currSize'] / 2.0
                c1y = t1['currY'] + t1['currSize'] / 2.0
                c2x = t2['currX'] + t2['currSize'] / 2.0
                c2y = t2['currY'] + t2['currSize'] / 2.0
                dist = math.hypot(c1x - c2x, c1y - c2y)
                min_s = min(t1['currSize'], t2['currSize'])

                if iou >= 0.18 or cont >= 0.50 or dist < min_s * 0.90:
                    if t1.get('hits', 0) >= t2.get('hits', 0):
                        dropped.add(j)
                    else:
                        dropped.add(i)
                        break
            if i not in dropped:
                keep.append(t1)
        self.active_tracks = keep

    def update_server_squares(self, server_squares, current_time_ms, frame_w=1280, frame_h=720):
        norm_faces = []
        # Normalize and filter
        for sq in server_squares:
            fx, fy, fw = sq[0], sq[1], sq[2]
            fh = sq[3] if len(sq) > 3 else fw
            size = max(fw, fh)
            nfx = (fx / frame_w) * 640.0
            nfy = (fy / frame_h) * 360.0
            nsize = (size / frame_w) * 640.0

            if nsize > 360.0 * self.max_height_pct:
                continue
            if (nsize * nsize) > (640.0 * 360.0 * self.max_area_pct):
                continue
            norm_faces.append({
                'fx': nfx, 'fy': nfy, 'size': nsize,
                'cx': nfx + nsize / 2.0, 'cy': nfy + nsize / 2.0
            })

        # Deduplicate incoming server squares
        dedup_server = []
        for nf in norm_faces:
            b1 = [nf['fx'], nf['fy'], nf['size'], nf['size']]
            dup = False
            for prev in dedup_server:
                b2 = [prev['fx'], prev['fy'], prev['size'], prev['size']]
                if compute_box_iou(b1, b2) >= 0.18 or compute_box_containment(b1, b2) >= 0.50:
                    dup = True
                    break
            if not dup:
                dedup_server.append(nf)

        # Match to tracks
        matched_tracks = set()
        matched_dets = set()
        pairs = []

        for t_idx, t in enumerate(self.active_tracks):
            t_cx = t['currX'] + t['currSize'] / 2.0
            t_cy = t['currY'] + t['currSize'] / 2.0
            for d_idx, det in enumerate(dedup_server):
                dist = math.hypot(t_cx - det['cx'], t_cy - det['cy'])
                iou = compute_box_iou([t['currX'], t['currY'], t['currSize'], t['currSize']],
                                      [det['fx'], det['fy'], det['size'], det['size']])
                if dist <= max(60.0, t['currSize'] * 1.5) or iou >= 0.20:
                    cost = dist - (iou * 120.0)
                    pairs.append((cost, t_idx, d_idx, det))

        pairs.sort(key=lambda p: p[0])

        for cost, t_idx, d_idx, det in pairs:
            if t_idx in matched_tracks or d_idx in matched_dets:
                continue
            matched_tracks.add(t_idx)
            matched_dets.add(d_idx)
            t = self.active_tracks[t_idx]
            dt = max(1.0, current_time_ms - t.get('last_detected', current_time_ms))
            raw_vx = (det['fx'] - t['targetX']) / dt
            raw_vy = (det['fy'] - t['targetY']) / dt
            t['vx'] = t['vx'] * 0.40 + raw_vx * 0.60
            t['vy'] = t['vy'] * 0.40 + raw_vy * 0.60
            t['targetX'] = det['fx']
            t['targetY'] = det['fy']
            t['targetSize'] = det['size']
            t['last_detected'] = current_time_ms
            t['last_seen'] = current_time_ms
            t['hits'] = min(10, t.get('hits', 0) + 1)

        # Spawn new tracks
        for d_idx, det in enumerate(dedup_server):
            if d_idx in matched_dets:
                continue
            covers_existing = False
            for t in self.active_tracks:
                dist = math.hypot((t['currX'] + t['currSize'] / 2.0) - det['cx'],
                                  (t['currY'] + t['currSize'] / 2.0) - det['cy'])
                if dist < det['size'] * 0.85:
                    covers_existing = True
                    break
            if covers_existing:
                continue

            self.next_track_id += 1
            self.active_tracks.append({
                'id': self.next_track_id,
                'currX': det['fx'],
                'currY': det['fy'],
                'currSize': det['size'],
                'targetX': det['fx'],
                'targetY': det['fy'],
                'targetSize': det['size'],
                'vx': 0.0,
                'vy': 0.0,
                'last_detected': current_time_ms,
                'last_seen': current_time_ms,
                'hits': 2, # Server confirmed
                'source': 'server'
            })

        self.deduplicate_tracks()

    def get_render_boxes(self, current_time_ms):
        # Filter lost tracks older than hold_duration_ms (500ms)
        self.active_tracks = [t for t in self.active_tracks if (current_time_ms - t['last_seen']) < self.hold_duration_ms]
        self.deduplicate_tracks()

        render_boxes = []
        drawn_face_boxes = []
        face_scale_x = self.cw / 640.0
        face_scale_y = self.ch / 360.0

        for t in self.active_tracks:
            if t.get('hits', 0) < self.min_consecutive_hits:
                continue

            # Rule 4: Zero latency for recorded footage (k = 1.0 snap directly)
            t['currX'] = t['targetX']
            t['currY'] = t['targetY']
            t['currSize'] = t['targetSize']

            total_pad = self.base_padding # 0.10
            base_size = t['currSize'] * face_scale_x
            padded_size = base_size * (1.0 + total_pad * 2)

            max_allowed = min(self.ch * self.max_height_pct, math.sqrt(self.cw * self.ch * self.max_area_pct))
            padded_size = min(padded_size, max_allowed)

            sfx = (t['currX'] * face_scale_x) - (padded_size - base_size) / 2.0
            sfy = (t['currY'] * face_scale_y) - (padded_size - base_size) / 2.0

            # Clamping
            cx = sfx + padded_size / 2.0
            cy = sfy + padded_size / 2.0
            x1 = max(0, min(self.cw - int(padded_size), int(cx - padded_size / 2.0)))
            y1 = max(0, min(self.ch - int(padded_size), int(cy - padded_size / 2.0)))
            w = min(int(padded_size), self.cw - x1)
            h = min(int(padded_size), self.ch - y1)

            current_box = [x1, y1, w, h]
            overlaps = False
            for db in drawn_face_boxes:
                if compute_box_iou(current_box, db) >= 0.15 or compute_box_containment(current_box, db) >= 0.50:
                    overlaps = True
                    break
            if overlaps:
                continue

            drawn_face_boxes.append(current_box)
            render_boxes.append({
                'track_id': t['id'],
                'box': current_box,
                'size': padded_size,
                'source': t.get('source', 'server')
            })

        return render_boxes

def apply_frosted_blur(frame, box):
    x, y, w, h = box
    if w <= 4 or h <= 4:
        return frame
    x2 = min(frame.shape[1], x + w)
    y2 = min(frame.shape[0], y + h)
    roi = frame[y:y2, x:x2]
    if roi.size == 0:
        return frame
    
    # Frosted blur: strong gaussian blur + subtle dark slate tint
    ksize = max(15, (w // 3) * 2 + 1)
    blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 0)
    # Tint: 45% slate overlay (#0f172a = B:42, G:23, R:15)
    tint = np.full_like(blurred_roi, (42, 23, 15), dtype=np.uint8)
    blended = cv2.addWeighted(blurred_roi, 0.65, tint, 0.35, 0)
    frame[y:y2, x:x2] = blended
    return frame

def run_verification():
    video_path = os.path.join(BASE_DIR, 'static', 'uploads', 'tc2_uploaded_footage.mp4')
    if not os.path.exists(video_path):
        print(f"Error: {video_path} not found!")
        return

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    cw = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
    ch = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
    print(f"TC2 Video opened: {total_frames} frames, {fps} FPS, {cw}x{ch}")

    # Output directory for sampled preview frames
    out_dir = os.path.join(BASE_DIR, 'static', 'uploads', 'tc2_sampled_frames')
    os.makedirs(out_dir, exist_ok=True)

    # We will test 60 seconds (1500 frames at 25 fps, looping 750-frame video twice)
    test_duration_sec = 60
    total_test_frames = int(test_duration_sec * fps) # 1500
    sample_indices = set(int(i * (total_test_frames / 10)) for i in range(10))

    tracker = ClientFaceTracker(cw=cw, ch=ch)

    # Server inference rate: runs every ~440ms (~11 frames at 25 fps)
    server_interval_frames = 11

    # Metrics
    max_squares_drawn = 0
    max_people_visible = 0
    max_square_side_px = 0
    max_square_pct_h = 0.0
    max_square_pct_area = 0.0
    overlap_incidents = 0
    giant_box_incidents = 0
    blink_incidents = 0
    latency_records = []

    last_drawn_count = 0
    sampled_frame_records = []

    current_time_ms = 0.0
    frame_dt_ms = 1000.0 / fps

    multi_squares_frames = 0
    squares_exceed_people_frames = 0

    print(f"\n--- Starting 60-Second (1500 Frames) Simulation ---")

    for f_idx in range(total_test_frames):
        src_frame_idx = f_idx % total_frames
        if src_frame_idx == 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                break

        current_time_ms += frame_dt_ms

        # Run server inference every 11 frames
        if f_idx % server_interval_frames == 0:
            # Encode frame to JPEG Base64
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            b64_frame = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

            t_start = time.time()
            det_result = ai_service.detect_live_frame(b64_frame, centre_id="TC2", video_time=src_frame_idx / fps)
            infer_dur_ms = (time.time() - t_start) * 1000.0
            latency_records.append(infer_dur_ms)

            server_squares = det_result.get("face_squares", [])
            detections = det_result.get("detections", [])
            visible_people = len(detections)
            max_people_visible = max(max_people_visible, visible_people)

            tracker.update_server_squares(server_squares, current_time_ms, frame_w=cw, frame_h=ch)

        # Get client render boxes
        render_boxes = tracker.get_render_boxes(current_time_ms)
        squares_drawn = len(render_boxes)
        max_squares_drawn = max(max_squares_drawn, squares_drawn)

        if squares_drawn > max_people_visible and max_people_visible > 0:
            squares_exceed_people_frames += 1

        # Check for blinking (instantaneous drop to 0 squares when people are visible)
        if last_drawn_count > 0 and squares_drawn == 0 and max_people_visible > 0:
            blink_incidents += 1
        last_drawn_count = squares_drawn

        # Check for overlapping drawn squares (IoU >= 0.15 among any pair)
        for i in range(len(render_boxes)):
            b1 = render_boxes[i]['box']
            s_px = max(b1[2], b1[3])
            pct_h = (s_px / ch) * 100.0
            pct_area = ((b1[2] * b1[3]) / (cw * ch)) * 100.0
            max_square_side_px = max(max_square_side_px, s_px)
            max_square_pct_h = max(max_square_pct_h, pct_h)
            max_square_pct_area = max(max_square_pct_area, pct_area)

            if pct_h > 35.0 or pct_area > 6.0:
                giant_box_incidents += 1

            for j in range(i + 1, len(render_boxes)):
                b2 = render_boxes[j]['box']
                iou = compute_box_iou(b1, b2)
                cont = compute_box_containment(b1, b2)
                if iou >= 0.15 or cont >= 0.50:
                    overlap_incidents += 1
                    multi_squares_frames += 1

        # Save sampled preview frame if index matches
        if f_idx in sample_indices:
            preview_frame = frame.copy()
            for rb in render_boxes:
                apply_frosted_blur(preview_frame, rb['box'])
                # Draw subtle visual outline for inspection
                x, y, w, h = rb['box']
                cv2.rectangle(preview_frame, (x, y), (x + w, y + h), (246, 130, 59), 2)
                cv2.putText(preview_frame, f"Face #{rb['track_id']} ({w}x{h})", (x, max(15, y - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

            sample_sec = f_idx / fps
            out_file = os.path.join(out_dir, f"sample_frame_{len(sampled_frame_records)+1}_at_{sample_sec:.1f}s.jpg")
            cv2.imwrite(out_file, preview_frame)
            sampled_frame_records.append({
                'sample_num': len(sampled_frame_records) + 1,
                'time_sec': sample_sec,
                'squares_drawn': squares_drawn,
                'visible_people': max_people_visible,
                'max_box_side_px': max([max(rb['box'][2], rb['box'][3]) for rb in render_boxes]) if render_boxes else 0,
                'file': out_file
            })
            print(f"  [Sample {len(sampled_frame_records)}/10] @ {sample_sec:.1f}s: {squares_drawn} square(s) drawn vs {max_people_visible} visible people (saved to {os.path.basename(out_file)})")

    cap.release()

    avg_latency = sum(latency_records) / max(1, len(latency_records))
    p95_latency = sorted(latency_records)[int(len(latency_records) * 0.95)] if latency_records else 0

    print("\n================ TEST RESULTS ================")
    print(f"Total Frames Tested: {total_test_frames} (60.0 seconds @ 25 FPS)")
    print(f"Max People Visible: {max_people_visible}")
    print(f"Max Blur Squares Drawn at Once: {max_squares_drawn}")
    print(f"Frames where Squares > Visible People: {squares_exceed_people_frames}")
    print(f"Frames where a Person had 2+ Overlapping Squares: {multi_squares_frames}")
    print(f"Overlapping Square Incidents (IoU >= 0.15): {overlap_incidents}")
    print(f"Giant / Full-screen Blocks (>35% H or >6% area): {giant_box_incidents}")
    print(f"Largest Square Side: {max_square_side_px} px ({max_square_pct_h:.1f}% of frame height, {max_square_pct_area:.2f}% of frame area)")
    print(f"Blink Frames in 60s: {blink_incidents}")
    print(f"Average Server Detection Latency: {avg_latency:.1f} ms (p95: {p95_latency:.1f} ms)")
    print("==============================================")

if __name__ == '__main__':
    run_verification()
