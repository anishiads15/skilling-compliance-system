import cv2
from ultralytics import YOLO

model = YOLO('yolov8n.pt')
cap = cv2.VideoCapture('static/uploads/tc2_uploaded_footage.mp4')

eq_classes = {
    56: ('Chair', 'Desks'), 57: ('Bench', 'Desks'), 60: ('Desk', 'Desks'), 13: ('Bench', 'Desks'),
    62: ('Display Monitor', 'Computer'), 63: ('Computer Terminal', 'Computer'), 64: ('Mouse', 'Periphery'),
    66: ('Keyboard', 'Terminal'), 67: ('Testing Device', 'Device'), 24: ('Bag', 'Storage'),
    28: ('Tool Case', 'Tool'), 74: ('Clock', 'Tool'), 76: ('Tool', 'Tool')
}
target_classes = [0, 62, 63] + list(eq_classes.keys())

for fno in [0, 30, 90, 150, 240, 360]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, fno)
    ret, frame = cap.read()
    if not ret: break

    res = model(frame, conf=0.16, classes=target_classes, verbose=False)[0]
    
    persons = []
    computers = []
    equipment = []
    h, w = frame.shape[:2]
    
    for b in res.boxes:
        cid = int(b.cls[0].item())
        conf = float(b.conf[0].item())
        x1, y1, x2, y2 = b.xyxy[0].tolist()
        is_edge = (x1 <= 20 or y1 <= 20 or x2 >= w - 20 or y2 >= h - 20)
        
        if not is_edge and conf < 0.18:
            continue
            
        if cid == 0:
            persons.append((round(x1), round(y1), round(x2-x1), round(y2-y1), round(conf, 2), is_edge))
        elif cid in [62, 63]:
            computers.append((round(x1), round(y1), round(x2-x1), round(y2-y1), round(conf, 2)))
        elif cid in eq_classes:
            equipment.append((eq_classes[cid][0], round(conf, 2)))

    edge_p = sum(1 for p in persons if p[5])
    print(f"Frame {fno:03d} -> Persons: {len(persons)} (Edge/Partial: {edge_p}), Computers: {len(computers)}, Equipment: {len(equipment)}")
