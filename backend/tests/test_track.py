import cv2, os, math
from ultralytics import YOLO

vpath = r'static/uploads/SIH Footage/040.avi'
cap = cv2.VideoCapture(vpath)
model = YOLO('yolov8n.pt')

class CentroidTracker:
    def __init__(self, dist_thresh=120.0, max_disappeared=30):
        self.tracks = {}
        self.total_unique_created = 0
        self.dist_thresh = dist_thresh
        self.max_disappeared = max_disappeared
    
    def update(self, boxes):
        if len(self.tracks) == 0:
            for b in boxes:
                self.total_unique_created += 1
                tid = self.total_unique_created
                x, y, w, h = b['bbox']
                self.tracks[tid] = {
                    'centroid': (x + w/2, y + h/2),
                    'bbox': [x, y, w, h],
                    'disappeared': 0,
                    'seen_count': 1,
                    'class': b['class']
                }
            return
        
        det_centroids = [(b['bbox'][0] + b['bbox'][2]/2, b['bbox'][1] + b['bbox'][3]/2) for b in boxes]
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
            x, y, w, h = b['bbox']
            self.tracks[tid]['centroid'] = (x + w/2, y + h/2)
            self.tracks[tid]['bbox'] = [x, y, w, h]
            self.tracks[tid]['disappeared'] = 0
            self.tracks[tid]['seen_count'] += 1

        for d_idx, b in enumerate(boxes):
            if d_idx not in matched_d:
                self.total_unique_created += 1
                tid = self.total_unique_created
                x, y, w, h = b['bbox']
                self.tracks[tid] = {
                    'centroid': (x + w/2, y + h/2),
                    'bbox': [x, y, w, h],
                    'disappeared': 0,
                    'seen_count': 1,
                    'class': b['class']
                }
        
        for t_idx, tid in enumerate(track_ids):
            if t_idx not in matched_t:
                self.tracks[tid]['disappeared'] += 1

comp_tracker = CentroidTracker(dist_thresh=120.0, max_disappeared=30)
student_tracker = CentroidTracker(dist_thresh=150.0, max_disappeared=30)

step = 5
fno = 0
max_frames = 250

while cap.isOpened() and fno < max_frames:
    ret, frame = cap.read()
    if not ret: break
    if fno % step == 0:
        results = model(frame, conf=0.25, classes=[0, 62, 63], verbose=False)
        comp_boxes = []
        stu_boxes = []
        for r in results:
            for b in r.boxes:
                cls_id = int(b.cls[0].item())
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                bbox = [round(x1), round(y1), round(x2 - x1), round(y2 - y1)]
                if cls_id in [62, 63]: # tv or laptop
                    comp_boxes.append({'bbox': bbox, 'class': model.names[cls_id]})
                elif cls_id == 0:
                    stu_boxes.append({'bbox': bbox, 'class': 'person'})
        comp_tracker.update(comp_boxes)
        student_tracker.update(stu_boxes)
    fno += 1

cap.release()

solid_comps = [t for tid, t in comp_tracker.tracks.items() if t['seen_count'] >= 3]
solid_stus = [t for tid, t in student_tracker.tracks.items() if t['seen_count'] >= 3]

print(f'Total computer tracks created: {comp_tracker.total_unique_created}, persistent: {len(solid_comps)}')
print(f'Total student tracks created: {student_tracker.total_unique_created}, persistent: {len(solid_stus)}')
for tid, t in comp_tracker.tracks.items():
    if t['seen_count'] >= 3:
        print(f"  Computer #{tid}: class={t['class']}, seen={t['seen_count']}, centroid={t['centroid']}")
for tid, t in student_tracker.tracks.items():
    if t['seen_count'] >= 3:
        print(f"  Student #{tid}: class={t['class']}, seen={t['seen_count']}, centroid={t['centroid']}")
