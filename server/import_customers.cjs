const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'rigpro',
    port: 3308
  });

  const wb = xlsx.readFile(__dirname + '/import_data/rigpro_4_9.xlsx', { cellDates: true });
  const sheet = wb.Sheets['customers'];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  process.stdout.write(`Parsed ${data.length} rows.\n`);

  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('TRUNCATE TABLE customers');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  let inserted = 0;
  for (const row of data) {
    const address1 = [row.Number, row.Street].filter(Boolean).join(' ');

    const vals = [
      row.id || null,
      row.name || 'Unknown',
      address1 || null,
      row.City || null,
      row.State || null,
      row.Zip || null,
      row.payment_terms || null
    ];
    
    await connection.query(`
      INSERT INTO customers 
      (id, name, address1, city, state, zip, payment_terms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, vals);
    inserted++;
  }
  
  process.stdout.write(`Inserted ${inserted} records into customers.\n`);
  process.exit(0);
}

run().catch(console.error);
