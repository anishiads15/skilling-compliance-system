import sqlite3
from datetime import datetime

def run_migration():
    conn = sqlite3.connect('compliance.db')
    c = conn.cursor()
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    print('Current category allocations:')
    for r in c.execute('SELECT centre_id, category_key, category_name, allotted_quantity, reported_good, reported_damaged, reported_missing FROM category_allocations').fetchall():
        print(r)

    # For each centre, consolidate desks and chairs
    for centre in ['TC1', 'TC2']:
        c.execute("""
        SELECT category_key, category_name, allotted_quantity, reported_good, reported_damaged, reported_missing, reported_by, reported_at, updated_by, updated_at
        FROM category_allocations
        WHERE UPPER(centre_id) = UPPER(?) AND LOWER(category_key) IN ('desks', 'chairs')
        """, (centre,))
        rows = c.fetchall()
        if rows:
            tot_allotted = sum(r[2] for r in rows)
            goods = [r[3] for r in rows if r[3] is not None]
            tot_good = sum(goods) if len(goods) > 0 else None
            tot_damaged = sum(r[4] for r in rows if r[4] is not None)
            tot_missing = sum(r[5] for r in rows if r[5] is not None)
            rep_by = next((r[6] for r in rows if r[6]), 'Training Centre Official')
            rep_at = next((r[7] for r in rows if r[7]), now_str)
            up_by = next((r[8] for r in rows if r[8]), 'Government Official')
            up_at = next((r[9] for r in rows if r[9]), now_str)

            c.execute("""
            INSERT INTO category_allocations (
                centre_id, category_key, category_name, allotted_quantity, 
                reported_good, reported_damaged, reported_missing, 
                reported_by, reported_at, updated_by, updated_at
            ) VALUES (?, 'desks_chairs', 'Desks/chairs', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(centre_id, category_key) DO UPDATE SET
                category_name = excluded.category_name,
                allotted_quantity = excluded.allotted_quantity,
                reported_good = excluded.reported_good,
                reported_damaged = excluded.reported_damaged,
                reported_missing = excluded.reported_missing,
                reported_by = excluded.reported_by,
                reported_at = excluded.reported_at,
                updated_by = excluded.updated_by,
                updated_at = excluded.updated_at
            """, (centre, tot_allotted, tot_good, tot_damaged, tot_missing, rep_by, rep_at, up_by, up_at))

            # Delete separate desks and chairs rows
            c.execute("""
            DELETE FROM category_allocations
            WHERE UPPER(centre_id) = UPPER(?) AND LOWER(category_key) IN ('desks', 'chairs')
            """, (centre,))

    # Update government_equipment category
    c.execute("""
    UPDATE government_equipment 
    SET category = 'Desks/chairs' 
    WHERE category IN ('Desks', 'Chairs')
    """)

    conn.commit()

    print('\nUpdated category allocations:')
    for r in c.execute('SELECT centre_id, category_key, category_name, allotted_quantity, reported_good, reported_damaged, reported_missing FROM category_allocations').fetchall():
        print(r)

    print('\nDistinct categories in government_equipment:')
    for r in c.execute('SELECT DISTINCT category FROM government_equipment').fetchall():
        print(r)

    conn.close()

if __name__ == '__main__':
    run_migration()
