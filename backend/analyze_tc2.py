import cv2, os, math
from ultralytics import YOLO

vpath = r'static/uploads/SIH Footage/040.avi'
cap = cv2.VideoCapture(vpath)
model = YOLO('yolov8n.pt')

class SpatialTracker:
    def __init__(self, dist_thresh=100.0, max_disappeared=25):
        self.tracks = {}
        self.next_id = 1
        self.dist_thresh = dist_thresh
        self.max_disappeared = max_disappeared

    def update(self, boxes):
        # boxes: list of [x, y, w, h]
        det_centroids = [(b[0] + b[2]/2.0, b[1] + b[3]/2.0) for b in boxes]
        
        if len(self.tracks) == 0:
            for i, b in enumerate(boxes):
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = {
                    'centroid': det_centroids[i],
                    'bbox': b,
                    'seen': 1,
                    'disappeared': 0
                }
            return

        track_ids = list(self.tracks.keys())
        track_centroids = [self.tracks[tid]['centroid'] for tid in track_ids]

        pairs = []
        for t_idx, tc in enumerate(track_centroids):
            for d_idx, dc in enumerate(det_centroids):
                dist = math.hypot(tc[0] - dc[0], tc[1] - dc[1])
                if dist < self.dist_thresh:
                    pairs.append((dist, t_idx, d_idx))
        pairs.sort(key=lambda p: p[0])

        matched_t = set()
        matched_d = set()
        for dist, t_idx, d_idx in pairs:
            if t_idx in matched_t or d_idx in matched_d:
                continue
            matched_t.add(t_idx)
            matched_d.add(d_idx)
            tid = track_ids[t_idx]
            b = boxes[d_idx]
            # Smooth centroid update
            cx, cy = det_centroids[d_idx]
            old_cx, old_cy = self.tracks[tid]['centroid']
            self.tracks[tid]['centroid'] = (0.7 * old_cx + 0.3 * cx, 0.7 * old_cy + 0.3 * cy)
            self.tracks[tid]['bbox'] = b
            self.tracks[tid]['seen'] += 1
            self.tracks[tid]['disappeared'] = 0

        for d_idx, b in enumerate(boxes):
            if d_idx not in matched_d:
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = {
                    'centroid': det_centroids[d_idx],
                    'bbox': b,
                    'seen': 1,
                    'disappeared': 0
                }

        for t_idx, tid in enumerate(track_ids):
            if t_idx not in matched_t:
                self.tracks[tid]['disappeared'] += 1

student_tracker = SpatialTracker(dist_thresh=140.0)
computer_tracker = SpatialTracker(dist_thresh=100.0)

# Sample 1 frame per second for first 60 seconds (60 frames)
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
sample_step = int(fps)
fno = 0
samples = 0
max_samples = 60

while cap.isOpened() and samples < max_samples:
    ret, frame = cap.read()
    if not ret: break
    if fno % sample_step == 0:
        results = model(frame, conf=0.25, classes=[0, 62, 63], verbose=False)
        stu_boxes = []
        comp_boxes = []
        for r in results:
            for b in r.boxes:
                cls_id = int(b.cls[0].item())
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                bbox = [round(x1), round(y1), round(x2 - x1), round(y2 - y1)]
                if cls_id == 0:
                    stu_boxes.append(bbox)
                elif cls_id in [62, 63]: # laptop or tv/monitor
                    # Deduplicate overlapping laptop and tv detections on the same screen (IoU or distance)
                    is_dup = False
                    cx = x1 + (x2 - x1)/2
                    cy = y1 + (y2 - y1)/2
                    for existing in comp_boxes:
                        ecx = existing[0] + existing[2]/2
                        ecy = existing[1] + existing[3]/2
                        if math.hypot(cx - ecx, cy - ecy) < 50.0:
                            is_dup = True
                            break
                    if not is_dup:
                        comp_boxes.append(bbox)
        student_tracker.update(stu_boxes)
        computer_tracker.update(comp_boxes)
        samples += 1
    fno += 1

cap.release()

# Filter persistent tracks (seen in at least 4 seconds out of 60)
active_students = [t for tid, t in student_tracker.tracks.items() if t['seen'] >= 4]
active_computers = [t for tid, t in computer_tracker.tracks.items() if t['seen'] >= 4]

print(f'Processed {samples} seconds of 040.avi')
print(f'Unique persistent students detected: {len(active_students)}')
print(f'Unique persistent computers detected: {len(active_computers)}')
for tid, t in enumerate(active_computers, 1):
    seen_cnt = t['seen']
    bbox = t['bbox']
    print(f'  Computer {tid}: seen in {seen_cnt} frames, bbox={bbox}')
for tid, t in enumerate(active_students, 1):
    seen_cnt = t['seen']
    bbox = t['bbox']
    print(f'  Student {tid}: seen in {seen_cnt} frames, bbox={bbox}')
