import urllib.request
import json

def test_endpoints():
    # 1. Test TC1 categories
    req = urllib.request.urlopen('http://127.0.0.1:5000/api/equipment/categories?centre_id=TC1')
    data1 = json.loads(req.read().decode())
    print('=== TC1 Categories ===')
    print(f'Total categories: {len(data1["categories"])}')
    for c in data1['categories']:
        print(f"  {c['category_key']}: {c['category_name']} -> Allotted={c['allotted_quantity']}, Good={c['reported_good']}, Damaged={c['reported_damaged']}, Camera={c['camera_count']} ({c['camera_status']})")
    print('TC1 Summary:', data1['summary'])

    # 2. Test TC2 categories
    req2 = urllib.request.urlopen('http://127.0.0.1:5000/api/equipment/categories?centre_id=TC2')
    data2 = json.loads(req2.read().decode())
    print('\n=== TC2 Categories ===')
    print(f'Total categories: {len(data2["categories"])}')
    for c in data2['categories']:
        print(f"  {c['category_key']}: {c['category_name']} -> Allotted={c['allotted_quantity']}, Good={c['reported_good']}, Damaged={c['reported_damaged']}, Camera={c['camera_count']} ({c['camera_status']})")
    print('TC2 Summary:', data2['summary'])

    # Assert exactly 5 categories for each centre
    assert len(data1['categories']) == 5, f"Expected 5 categories for TC1, got {len(data1['categories'])}"
    assert len(data2['categories']) == 5, f"Expected 5 categories for TC2, got {len(data2['categories'])}"

    # Assert single combined Desks/chairs category exists and no separate desks or chairs
    tc1_keys = [c['category_key'] for c in data1['categories']]
    tc2_keys = [c['category_key'] for c in data2['categories']]
    assert 'desks_chairs' in tc1_keys, "desks_chairs missing in TC1"
    assert 'desks_chairs' in tc2_keys, "desks_chairs missing in TC2"
    assert 'desks' not in tc1_keys, "legacy desks should not be in TC1"
    assert 'chairs' not in tc1_keys, "legacy chairs should not be in TC1"
    assert 'desks' not in tc2_keys, "legacy desks should not be in TC2"
    assert 'chairs' not in tc2_keys, "legacy chairs should not be in TC2"

    print("\n[PASS] ALL CATEGORY CHECKS PASSED: Exactly 5 categories with single combined 'Desks/chairs'!")

    # 3. Test inventory items
    req_inv = urllib.request.urlopen('http://127.0.0.1:5000/api/equipment/inventory?centre_id=TC1')
    inv1 = json.loads(req_inv.read().decode())
    desk_chair_items = [i for i in inv1['items'] if i['category'] == 'Desks/chairs']
    print(f'\nTC1 Desks/chairs inventory items count: {len(desk_chair_items)}')
    for item in desk_chair_items:
        print(f"  - {item['equipment_id']}: {item['equipment_name']} (Qty: {item['quantity']})")

    # 4. Test allocation update for Desks/chairs
    alloc_payload = json.dumps({
        "centre_id": "TC1",
        "allocations": [
            {"category_key": "desks_chairs", "allotted_quantity": 75}
        ],
        "updated_by": "Test Gov Official"
    }).encode('utf-8')
    req_alloc = urllib.request.Request('http://127.0.0.1:5000/api/equipment/categories/allocate', data=alloc_payload, headers={'Content-Type': 'application/json'})
    res_alloc = json.loads(urllib.request.urlopen(req_alloc).read().decode())
    assert res_alloc['success'] is True, "Allocation update failed"
    print("\n[PASS] Allocation update endpoint works with desks_chairs!")

    # 5. Test condition report for Desks/chairs
    rep_payload = json.dumps({
        "centre_id": "TC1",
        "reports": [
            {"category_key": "desks_chairs", "reported_good": 47}
        ],
        "submitted_by": "Test TC Official"
    }).encode('utf-8')
    req_rep = urllib.request.Request('http://127.0.0.1:5000/api/equipment/categories/report-condition', data=rep_payload, headers={'Content-Type': 'application/json'})
    res_rep = json.loads(urllib.request.urlopen(req_rep).read().decode())
    assert res_rep['success'] is True, "Condition report failed"
    print("[PASS] Condition report endpoint works with desks_chairs!")

    print("\n================ ALL TESTS PASSED ================")

if __name__ == '__main__':
    test_endpoints()
