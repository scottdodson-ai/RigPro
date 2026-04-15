const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3306,
  });

  console.log("Starting site migration...");

  try {
    // 1. Add primary_site_id to customers if not exists
    const [cols] = await db.query("SHOW COLUMNS FROM customers LIKE 'primary_site_id'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE customers ADD COLUMN primary_site_id INT DEFAULT NULL");
      console.log("Added primary_site_id column to customers table.");
    }

    // 2. Fetch all customers
    const [customers] = await db.query("SELECT id, name, street, city, state, zip FROM customers");
    console.log(`Processing ${customers.length} customers...`);

    let migratedCount = 0;
    let createdSites = 0;

    for (const cust of customers) {
      const hasAddress = cust.street || cust.city || cust.state || cust.zip;
      if (!hasAddress) continue;

      // Check if this address already exists in sites for this customer
      const [existing] = await db.query(
        "SELECT id FROM sites WHERE customer_id = ? AND address1 = ? AND city = ? AND state = ? AND zip = ?",
        [cust.id, cust.street || '', cust.city || '', cust.state || '', cust.zip || '']
      );

      let siteId;
      if (existing.length > 0) {
        siteId = existing[0].id;
      } else {
        // Create new site
        const [res] = await db.query(
          "INSERT INTO sites (customer_id, site_type, address1, city, state, zip, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [cust.id, 'PrimaryHQ', cust.street || '', cust.city || '', cust.state || '', cust.zip || '', `Migrated from customer record: ${cust.name}`]
        );
        siteId = res.insertId;
        createdSites++;
      }

      // Update customer record
      await db.query("UPDATE customers SET primary_site_id = ? WHERE id = ?", [siteId, cust.id]);
      migratedCount++;
    }

    console.log(`Migration complete. Migrated ${migratedCount} customers. Created ${createdSites} new site records.`);

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await db.end();
  }
}

run();
