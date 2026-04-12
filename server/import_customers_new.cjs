const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308
  });

  try {
    const [cols] = await connection.query("SHOW COLUMNS FROM customers");
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('billing_address')) {
      await connection.query("ALTER TABLE customers ADD COLUMN billing_address VARCHAR(255)");
      console.log("Added column: billing_address");
    }

    process.stdout.write('Connected to DB. Reading Excel...\n');
    const wb = xlsx.readFile(__dirname + '/import_data/rigpro_tables_export (1).xlsx', { cellDates: true });
    
    if (!wb.Sheets['customers']) {
      throw new Error("Sheet 'customers' not found in excel file.");
    }
    const sheet = wb.Sheets['customers'];
    const rawData = xlsx.utils.sheet_to_json(sheet);
    
    process.stdout.write(`Parsed ${rawData.length} rows. Truncating table...\n`);

    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.query('TRUNCATE TABLE customers');
    await connection.query('SET FOREIGN_KEY_CHECKS=1');

    let inserted = 0;

    for (const row of rawData) {
      const id = row['id'];
      const name = row['name'];
      const billing_address = row['billing_address'];

      await connection.query(`
        INSERT INTO customers (id, name, billing_address)
        VALUES (?, ?, ?)
      `, [id, name, billing_address]);
      inserted++;
    }
    
    process.stdout.write(`Done! Inserted: ${inserted} records into customers table.\n`);
  } catch (err) {
    console.error("Error during import:", err);
  } finally {
    process.exit(0);
  }
}

run().catch(console.error);
