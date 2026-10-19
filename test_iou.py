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

# Test IoU
b1 = [100, 100, 50, 50]
b2 = [110, 110, 50, 50]
print("IoU b1, b2:", round(compute_iou(b1, b2), 3))
assert compute_iou(b1, b2) > 0.4
print("compute_iou test passed!")
