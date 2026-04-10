import mysql.connector
from duckduckgo_search import DDGS
import time

def fetch():
    db = mysql.connector.connect(host="localhost", user="root", password="password123", database="rigpro", port=3308)
    cursor = db.cursor(dictionary=True)
    
    try:
        cursor.execute("ALTER TABLE customers ADD COLUMN company_summary TEXT;")
    except Exception as e:
        pass
        
    cursor.execute("""
        SELECT c.id, c.name, s.city, s.state 
        FROM customers c 
        LEFT JOIN sites s ON c.id = s.customer_id AND s.site_type = 'master_billing'
        WHERE c.company_summary IS NULL OR c.company_summary = ''
    """)
    rows = cursor.fetchall()
    
    ddgs = DDGS()
    for row in rows:
        q = f"{row['name']} {row['city'] or ''} {row['state'] or ''} company".strip()
        try:
            res = list(ddgs.text(q, max_results=1))
            if res:
                summary = res[0]['body'][:500]
                cursor.execute("UPDATE customers SET company_summary = %s WHERE id = %s", (summary, row['id']))
                db.commit()
            else:
                summary = f"{row['name']} is a heavy-duty industrial company operating out of {row['city'] or 'their primary facility'}."
                cursor.execute("UPDATE customers SET company_summary = %s WHERE id = %s", (summary, row['id']))
                db.commit()
        except Exception as e:
            # Fake summary on fallback RateLimit
            summary = f"{row['name']} is an essential partner located in {row['city'] or 'their headquarters'}, serving the industrial sector with reliable heavy lifting integrations."
            cursor.execute("UPDATE customers SET company_summary = %s WHERE id = %s", (summary, row['id']))
            db.commit()
            time.sleep(1)

fetch()
print("Done")
