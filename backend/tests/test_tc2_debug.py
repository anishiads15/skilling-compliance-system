import cv2, json
import ai_service

cap = cv2.VideoCapture('static/uploads/tc2_uploaded_footage.mp4')
ret, frame = cap.read()
cap.release()

print('Frame shape:', frame.shape if frame is not None else None)

# 1. Native frame test
res_native = ai_service.detect_live_frame(frame, centre_id='TC2')
print('\n--- Native 720p Frame Results ---')
print('Students detected:', len(res_native['detections']), [d['label'] for d in res_native['detections']])
print('Face squares:', len(res_native['face_squares']), res_native['face_squares'])
print('Equipment detections:', len(res_native['equipment_detections']))
for eq in res_native['equipment_detections']:
    print('  ', eq.get('label'), ':', eq.get('name'), f"({eq.get('category_tab')})", 'conf=', eq.get('confidence'))

# 2. Downscaled 360p frame test (what browser currently sends)
frame_360 = cv2.resize(frame, (640, 360))
res_360 = ai_service.detect_live_frame(frame_360, centre_id='TC2')
print('\n--- Downscaled 360p Frame Results ---')
print('Students detected:', len(res_360['detections']), [d['label'] for d in res_360['detections']])
print('Face squares:', len(res_360['face_squares']), res_360['face_squares'])
print('Equipment detections:', len(res_360['equipment_detections']))
for eq in res_360['equipment_detections']:
    print('  ', eq.get('label'), ':', eq.get('name'), f"({eq.get('category_tab')})", 'conf=', eq.get('confidence'))
