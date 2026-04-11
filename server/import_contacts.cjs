const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308,
  });

  console.log("Connected to DB.");

  try {
    const [cols] = await db.query("SHOW COLUMNS FROM customer_contacts LIKE 'mobile'");
    if (cols.length === 0) {
      console.log("Adding 'mobile' column to customer_contacts...");
      await db.query("ALTER TABLE customer_contacts ADD COLUMN mobile VARCHAR(100)");
    } else {
      console.log("'mobile' column already exists.");
    }
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      console.log("Creating customer_contacts table...");
      await db.query(`
        CREATE TABLE customer_contacts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          title VARCHAR(100),
          email VARCHAR(100),
          mobile VARCHAR(100),
          phone VARCHAR(50),
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
      `);
    } else {
      throw e;
    }
  }

  // Read excel
  const wb = xlsx.readFile('/root/RigPro/server/import_data/contacts_040926.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(ws);

  console.log(`Found ${rows.length} rows to insert.`);

  await db.query("TRUNCATE TABLE customer_contacts");
  console.log("Truncated customer_contacts table.");

  let inserted = 0;
  for (const row of rows) {
    const customer_id = row.customer_id;
    const name = row.name || '';
    const email = row.email || '';
    const mobile = row.mobile || '';
    const phone = row.phone || '';
    const title = row.title || '';
    const is_primary = row.is_primary ? 1 : 0;

    if (!customer_id || !name) continue;

    try {
      await db.query(
        "INSERT INTO customer_contacts (customer_id, name, title, email, mobile, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [customer_id, name, title, email, mobile, phone, is_primary]
      );
      inserted++;
    } catch (e) {
      if (e.code === 'ER_NO_REFERENCED_ROW_2') {
         // silently ignore if customer_id doesn't exist
      } else {
         console.error("Error inserting row", row, e.message);
      }
    }
  }

  console.log(`Successfully inserted ${inserted} records.`);
  await db.end();
}

run().catch(console.error);
