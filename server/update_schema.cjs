const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rigpro123!',
  database: process.env.DB_NAME || 'rigpro_db'
};

async function run() {
  const db = await mysql.createConnection(DB_CONFIG);

  try {
    console.log("Updating schema...");
    
    // Add customer_id to quotes if it isn't there
    const [cols] = await db.query("SHOW COLUMNS FROM quotes LIKE 'customer_id'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE quotes ADD COLUMN customer_id INT AFTER quote_number");
      console.log("Added customer_id to quotes");
    }

    // Replace job_site with separate fields in quotes
    const [js1] = await db.query("SHOW COLUMNS FROM quotes LIKE 'job_site_address1'");
    if (js1.length === 0) {
      await db.query("ALTER TABLE quotes ADD COLUMN job_site_address1 VARCHAR(255) AFTER job_site");
      await db.query("ALTER TABLE quotes ADD COLUMN job_site_city VARCHAR(100) AFTER job_site_address1");
      await db.query("ALTER TABLE quotes ADD COLUMN job_site_state VARCHAR(50) AFTER job_site_city");
      await db.query("ALTER TABLE quotes ADD COLUMN job_site_zip VARCHAR(20) AFTER job_site_state");
      console.log("Added job_site address fields to quotes");
    }

    // Do the same for rfqs? User said "Job Site in quote should be replaced", but "Source data for RFQ Customer information and New Estimate Customer information should both be the Customers table."
    // Yes, add job_site address fields to rfqs as well for parity
    const [rjs1] = await db.query("SHOW COLUMNS FROM rfqs LIKE 'job_site_address1'");
    if (rjs1.length === 0) {
      await db.query("ALTER TABLE rfqs ADD COLUMN job_site_address1 VARCHAR(255) AFTER job_site");
      await db.query("ALTER TABLE rfqs ADD COLUMN job_site_city VARCHAR(100) AFTER job_site_address1");
      await db.query("ALTER TABLE rfqs ADD COLUMN job_site_state VARCHAR(50) AFTER job_site_city");
      await db.query("ALTER TABLE rfqs ADD COLUMN job_site_zip VARCHAR(20) AFTER job_site_state");
      console.log("Added job_site address fields to rfqs");
    }

    // Fix up existing quotes by mapping customer_name to customer_id
    console.log("Mapping quotes to customer_id...");
    const [quotes] = await db.query("SELECT id, customer_name FROM quotes WHERE customer_id IS NULL");
    
    // Create a map to avoid excessive queries
    const [customers] = await db.query("SELECT id, name FROM customers");
    const custMap = {};
    for (const c of customers) {
      custMap[c.name.toLowerCase().trim()] = c.id;
    }

    for (const q of quotes) {
      const cname = (q.customer_name || '').toLowerCase().trim();
      let cid = custMap[cname];
      
      if (!cid && cname) {
        const [res] = await db.query("INSERT INTO customers (name) VALUES (?)", [q.customer_name]);
        cid = res.insertId;
        custMap[cname] = cid;
      }

      if (cid) {
        await db.query("UPDATE quotes SET customer_id = ? WHERE id = ?", [cid, q.id]);
      }
    }
    console.log(`Mapped ${quotes.length} quotes.`);
    
  } catch(e) {
    console.error(e);
  } finally {
    await db.end();
  }
}

run();
