const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'password123', database: 'rigpro', port: 3308
  });

  console.log("Creating sites table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS sites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      site_type VARCHAR(50) DEFAULT '',
      address1 VARCHAR(255) DEFAULT '',
      city VARCHAR(100) DEFAULT '',
      state VARCHAR(50) DEFAULT '',
      zip VARCHAR(20) DEFAULT '',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("Migrating addresses...");
  const [customers] = await db.query('SELECT id, address1, city, state, zip FROM customers');
  let count = 0;
  for (const c of customers) {
    if (c.address1 || c.city || c.state || c.zip) {
      await db.query(`
        INSERT INTO sites (customer_id, site_type, address1, city, state, zip)
        VALUES (?, 'master_billing', ?, ?, ?, ?)
      `, [c.id, c.address1||'', c.city||'', c.state||'', c.zip||'']);
      count++;
    }
  }
  console.log(`Migrated ${count} addresses to sites.`);

  console.log("Dropping address columns from customers...");
  await db.query('ALTER TABLE customers DROP COLUMN address1, DROP COLUMN city, DROP COLUMN state, DROP COLUMN zip;');
  
  // also add billing_site_id to customers just in case "pointer to sites" means that, though we can use site_type='master_billing'.
  // Actually, standard 1:M is better. user says "Point master biiling address in Customers screen to sites and display record for 'master_billing'". This means frontend should query sites table.

  console.log("Done.");
  process.exit(0);
}
run().catch(console.error);
