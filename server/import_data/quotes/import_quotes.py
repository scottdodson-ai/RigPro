import json
import mysql.connector
import sys

# DATABASE_CONFIG
DB_CONFIG = {
    "host": "localhost",
    "port": 3308,
    "user": "root",
    "password": "password123",
    "database": "rigpro"
}

JSON_FILE = "quotes_all.json"

def import_quotes():
    try:
        with open(JSON_FILE, 'r') as f:
            quotes = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return

    added = 0
    skipped = 0

    for q in quotes:
        client = (q.get('recipient') or {}).get('company') or 'Unknown'
        date = q.get('quote_date_iso')
        total = q.get('total_price', 0)
        source = q.get('source_file', 'Imported')
        desc = q.get('work_scope', '')
        site = q.get('recipient', {}).get('address', '')
        sender = q.get('sender', {}).get('name', 'Unassigned')

        # DUPLICATE CHECK based on Customer, Date, Total
        # Usually these three together identify a quote in such a data dump
        cursor.execute(
            "SELECT id FROM quotes WHERE customer_name = %s AND date = %s AND total = %s",
            (client, date, total)
        )
        existing = cursor.fetchone()

        if existing:
            print(f"SKIPPING duplicate: QUOTE {source} for {client} (${total}) on {date}")
            skipped += 1
            continue

        # INSERT
        full_json = json.dumps(q)
        try:
            cursor.execute(
                """INSERT INTO quotes 
                (quote_number, customer_name, job_site, description, date, status, total, sales_assoc, quote_data) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (source, client, site, desc, date, 'Submitted', total, sender, full_json)
            )
            added += 1
            print(f"ADDED: QUOTE {source} for {client} (${total})")
        except Exception as e:
            print(f"FAILED to add {source}: {e}")

    conn.commit()
    cursor.close()
    conn.close()

    print("\n" + "="*40)
    print(f"IMPORT SUMMARY")
    print(f"Processed: {len(quotes)}")
    print(f"Imported:  {added}")
    print(f"Skipped:   {skipped}")
    print("="*40)

if __name__ == "__main__":
    import_quotes()
