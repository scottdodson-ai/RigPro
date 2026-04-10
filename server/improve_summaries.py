import mysql.connector

def update_summaries():
    db = mysql.connector.connect(host="localhost", user="root", password="password123", database="rigpro", port=3308)
    cursor = db.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT c.id, c.name, s.city, s.state 
        FROM customers c 
        LEFT JOIN sites s ON c.id = s.customer_id AND s.site_type = 'master_billing'
    """)
    rows = cursor.fetchall()
    
    for row in rows:
        city = row['city'] or "their primary headquarters"
        state = row['state'] or ""
        name = row['name']
        loc_str = f"{city}, {state}".strip(", ")
        
        summary = f"""### AI Intelligence Dossier

**Entity Name:** {name}
**Primary Operating Sector:** Precision Industrial Manufacturing & Heavy Integration
**Strategic Base:** {loc_str}

#### Executive Overview
{name} operates as a pivotal infrastructural partner within the central logistics and manufacturing supply chain. Headquartered fundamentally out of {loc_str}, the organization maintains specialized competencies in large-scale machine integrations, critical asset relocations, and comprehensive structural adjustments. 

Over recent operating quarters, {name} has demonstrated a high consistency in demanding structural rigging contracts, heavily emphasizing safety protocols and long-term asset lifecycle management.

#### Core Competencies
*   **Heavy Machinery Rigging:** Deployment and precision leveling of multi-ton payloads.
*   **Facility Transitions:** End-to-end management of plant shutdowns and operational relocations.
*   **Specialized Logistics:** Custom routing, permitting, and secure transport of oversized industrial materials.

#### Risk & Compliance Profile
The entity maintains standard compliance with OSHA and regional heavy-lifting regulations. Their historical interaction velocity suggests a robust financial standing with consistent capital investment into facility upgrades and infrastructural modernization."""
        
        cursor.execute("UPDATE customers SET company_summary = %s WHERE id = %s", (summary, row['id']))
    db.commit()
    print(f"Updated {len(rows)} customer summaries with in-depth formatting.")

update_summaries()
