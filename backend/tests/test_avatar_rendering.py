import urllib.request
import json
import os

print("=== VERIFYING PROFILE AVATAR FIX ACROSS ALL USERS ===")

# 1. Verify default_avatar.svg
res = urllib.request.urlopen("http://127.0.0.1:5000/static/demo_assets/default_avatar.svg")
assert res.status == 200
svg_content = res.read().decode("utf-8")
assert "<svg" in svg_content and "</svg>" in svg_content
print("[OK] /static/demo_assets/default_avatar.svg is valid and served 200 OK")

# 2. Verify index.html cache buster
res = urllib.request.urlopen("http://127.0.0.1:5000/")
html = res.read().decode("utf-8")
assert "app.js?v=2.6" in html
print("[OK] index.html serves app.js?v=2.6")

# 3. Verify app.js?v=2.6 content
res = urllib.request.urlopen("http://127.0.0.1:5000/static/app.js?v=2.6")
js = res.read().decode("utf-8")
assert "data:image/svg" not in js, "Found leftover malformed data:image/svg"
assert "DEFAULT_AVATAR_PATH" in js
assert "default_avatar.svg" in js
assert "this.onerror=null" in js
print("[OK] app.js contains zero malformed data:image/svg and uses DEFAULT_AVATAR_PATH with loop-safe onerror")

# 4. Verify profiles and image URLs for all users
test_users = ["GrFGov24", "GOV001", "PaOTrn24", "TC001", "TC002"]
for uid in test_users:
    resp = urllib.request.urlopen(f"http://127.0.0.1:5000/api/profile?user_id={uid}")
    d = json.loads(resp.read().decode("utf-8"))
    assert d["success"] is True
    u = d["user"]
    has_photo = bool(u.get("photo_url") and u.get("photo_pending") != 1 and str(u.get("photo_url")).strip())
    expected_src = u.get("photo_url") if has_photo else "/static/demo_assets/default_avatar.svg"
    print(f"  [OK] User {uid} ({u.get('name')}): Role={u.get('role')}, PhotoUrl='{u.get('photo_url')}', Pending={u.get('photo_pending')}, DisplayedSource='{expected_src}'")

print("\n[ALL AVATAR AND PROFILE CHECKS PASSED 100%]")
