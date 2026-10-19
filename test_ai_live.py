import cv2
import time
import math
import numpy as np
from ultralytics import YOLO

def compute_iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[0] + box1[2], box2[0] + box2[2])
    y2 = min(box1[1] + box1[3], box2[1] + box2[3])
    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h
    box1_area = box1[2] * box1[3]
    box2_area = box2[2] * box2[3]
    union_area = box1_area + box2_area - inter_area
    if union_area <= 0:
        return 0.0
    return inter_area / union_area

# Load model
model = YOLO('yolov8n.pt')
cap = cv2.VideoCapture('static/uploads/tc2_uploaded_footage.mp4')
ret, frame = cap.read()
assert ret, "Could not read frame"

h, w = frame.shape[:2]
target_classes = [0, 62, 63, 56, 57, 60, 13, 24, 28, 64, 66, 67, 74, 76]
results = model(frame, conf=0.15, classes=target_classes, verbose=False)

raw_students = []
raw_computers = []
raw_equipment = []

for r in results:
    for box in r.boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        bw = x2 - x1
        bh = y2 - y1
        is_edge = (x1 <= 20 or y1 <= 20 or x2 >= w - 20 or y2 >= h - 20)

        if cls_id == 0:
            if conf >= 0.18 or (is_edge and conf >= 0.15):
                raw_students.append({
                    "bbox": [round(x1), round(y1), round(bw), round(bh)],
                    "confidence": round(conf, 2),
                    "is_edge": is_edge
                })
        elif cls_id in [62, 63]:
            if conf >= 0.16 or (is_edge and conf >= 0.14):
                raw_computers.append({
                    "bbox": [round(x1), round(y1), round(bw), round(bh)],
                    "confidence": round(conf, 2),
                    "name": "Laptop Computer" if cls_id == 63 else "Display Monitor"
                })

# Deduplicate
raw_students.sort(key=lambda x: x['confidence'], reverse=True)
accepted_students = []
for cand in raw_students:
    cb = cand['bbox']
    ccx = cb[0] + cb[2] / 2.0
    ccy = cb[1] + cb[3] / 2.0
    is_dup = False
    for acc in accepted_students:
        ab = acc['bbox']
        acx = ab[0] + ab[2] / 2.0
        acy = ab[1] + ab[3] / 2.0
        iou = compute_iou(cb, ab)
        dist = math.hypot(ccx - acx, ccy - acy)
        min_dim = min(cb[2], cb[3], ab[2], ab[3])
        if iou > 0.40 or (dist < min_dim * 0.45 and (iou > 0.15 or (cb[2] > 0.6 * ab[2] and cb[3] > 0.6 * ab[3]))):
            is_dup = True
            break
    if not is_dup:
        accepted_students.append(cand)

print(f"Total Raw Students: {len(raw_students)}, Accepted NMS Students: {len(accepted_students)}")
print(f"Total Computers: {len(raw_computers)}")
print("Test completed successfully!")
