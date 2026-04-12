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
    // Add new columns if they do not exist
    const [cols] = await connection.query("SHOW COLUMNS FROM master_jobs");
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('date_of_sale')) {
      await connection.query("ALTER TABLE master_jobs ADD COLUMN date_of_sale DATETIME");
      console.log("Added column: date_of_sale");
    }
    if (!colNames.includes('status')) {
      await connection.query("ALTER TABLE master_jobs ADD COLUMN status VARCHAR(100)");
      console.log("Added column: status");
    }
    
    process.stdout.write('Connected to DB. Reading Excel...\n');
    const wb = xlsx.readFile(__dirname + '/import_data/rigpro_tables_export (1).xlsx', { cellDates: true });
    
    let sheetName = 'Master Job List';
    if (!wb.Sheets[sheetName]) {
      sheetName = 'Master Job list'; // Fallback in case of case sensitivity
    }
    const sheet = wb.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet);
    
    process.stdout.write(`Parsed ${rawData.length} rows. Updating table...\n`);

    let updated = 0;
    let inserted = 0;

    for (const row of rawData) {
      const job_num = row['Job #'] || row['job_number'];
      if (!job_num) continue; // Skip rows without job number

      const customer_num = row['Cust. #'];
      const customer_name = row['Customer'];
      const job_description = row['Description'];
      const job_location = row['Location'];
      const estimator = row['Estimator'];
      const date_of_sale = row['Date of Sale'] ? new Date(row['Date of Sale']) : null;
      const total_billings = row['Value'] || 0;
      const status = row['Status'];

      const [existing] = await connection.query("SELECT id FROM master_jobs WHERE job_number = ?", [job_num]);
      
      if (existing.length > 0) {
        // Update
        const id = existing[0].id;
        await connection.query(`
          UPDATE master_jobs 
          SET customer_num = ?, customer_name = ?, job_description = ?, job_location = ?,
              estimator = ?, date_of_sale = ?, total_billings = ?, status = ?
          WHERE id = ?
        `, [customer_num, customer_name, job_description, job_location, estimator, date_of_sale, total_billings, status, id]);
        updated++;
      } else {
        // Insert
        await connection.query(`
          INSERT INTO master_jobs 
          (customer_num, customer_name, job_number, job_description, job_location, estimator, date_of_sale, total_billings, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [customer_num, customer_name, job_num, job_description, job_location, estimator, date_of_sale, total_billings, status]);
        inserted++;
      }
    }
    
    process.stdout.write(`Done! Inserted: ${inserted}, Updated (overwritten duplicates): ${updated}\n`);
  } catch (err) {
    console.error("Error during import:", err);
  } finally {
    process.exit(0);
  }
}

run().catch(console.error);
