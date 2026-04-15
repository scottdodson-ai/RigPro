/**
 * Import customers from Final Customer List.xlsx into the running database.
 * - Uses address1 column for `street`
 * - Ignores billing_address; copies customer address fields to billing fields
 * - Drops and recreates customers table with new schema
 */
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');

async function main() {
  const filePath = path.join(__dirname, 'Final Customer List.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log(`Read ${data.length} rows from "${sheetName}"`);

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308,
    multipleStatements: true
  });

  // Temporarily disable FK checks so we can drop customers
  await db.query('SET FOREIGN_KEY_CHECKS = 0');

  // Drop and recreate customers table with new schema
  await db.query('DROP TABLE IF EXISTS customers');
  await db.query(`
    CREATE TABLE customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      street VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(50),
      zip VARCHAR(20),
      notes TEXT,
      billing_street VARCHAR(255),
      billing_city VARCHAR(100),
      billing_state VARCHAR(50),
      billing_zip VARCHAR(20),
      website VARCHAR(100),
      industry VARCHAR(100),
      payment_terms VARCHAR(50),
      account_num VARCHAR(50),
      company_summary LONGTEXT,
      customer_num VARCHAR(50),
      tombstone TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log('Recreated customers table with new schema');

  // Insert rows
  let inserted = 0;
  for (const row of data) {
    const name = (row.name || '').trim();
    if (!name) continue;

    const street = (row.address1 || '').trim();
    const city = (row.city || '').trim();
    const state = (row.state || '').trim();
    const zip = String(row.zip || '').trim();
    const tombstone = row.tombstone ? 1 : 0;

    // Use customer address fields for billing address too (ignore billing_address column)
    const billing_street = street;
    const billing_city = city;
    const billing_state = state;
    const billing_zip = zip;

    const created_at = row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');
    const updated_at = row.updated_at
      ? new Date(row.updated_at).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      await db.query(
        `INSERT INTO customers (id, name, street, city, state, zip, billing_street, billing_city, billing_state, billing_zip, tombstone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, name, street, city, state, zip, billing_street, billing_city, billing_state, billing_zip, tombstone, created_at, updated_at]
      );
      inserted++;
    } catch (err) {
      console.error(`  SKIP row id=${row.id} name="${name}": ${err.message}`);
    }
  }

  // Re-enable FK checks
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log(`Done. Inserted ${inserted} of ${data.length} customers.`);
  await db.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
