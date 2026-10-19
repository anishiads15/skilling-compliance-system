def test_dark_mode_rules():
    with open('static/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Verify key dark mode selectors exist
    assert 'html.dark button.border-transparent:hover' in html, "border-transparent:hover missing"
    assert 'html.dark button.border-transparent:focus' in html, "border-transparent:focus missing"
    assert 'html.dark button.border-blue-600' in html, "border-blue-600 missing"
    assert 'html.dark button.border-emerald-600' in html, "border-emerald-600 missing"
    assert 'html.dark #cameraCategoryTabs button' in html, "cameraCategoryTabs missing"
    assert 'html.dark .hover\\:bg-slate-100:hover' in html, "hover:bg-slate-100 override missing"
    assert 'html.dark .hover\\:bg-slate-200:hover' in html, "hover:bg-slate-200 override missing"
    assert 'html.dark aside nav button:hover' in html, "aside nav button:hover missing"

    with open('static/app.js', 'r', encoding='utf-8') as f:
        js = f.read()

    # Verify desks_chairs exists in both catIcons
    assert 'desks_chairs' in js, "desks_chairs missing in app.js"
    assert 'Desks/chairs' in js, "Desks/chairs missing in app.js"

    print("[PASS] All Dark Mode tab hover CSS rules and Desks/chairs category mappings verified!")

if __name__ == '__main__':
    test_dark_mode_rules()
