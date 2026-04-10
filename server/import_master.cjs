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

  process.stdout.write('Connected to DB. Reading Excel...\n');
  const wb = xlsx.readFile(__dirname + '/import_data/rigpro_4_9.xlsx', { cellDates: true });
  const sheet = wb.Sheets['master_jobs'];
  const rawData = xlsx.utils.sheet_to_json(sheet);
  
  process.stdout.write(`Parsed ${rawData.length} rows. Truncating table...\n`);

  await connection.query('TRUNCATE TABLE master_jobs');

  let inserted = 0;
  for (const row of rawData) {
    const vals = [
      row.customer_num || null,
      row.customer_name || null,
      row.job_number || null,
      row.total_billings || 0,
      row.total_expense || 0,
      row.total_hours || 0,
      row.job_description || null,
      row.month_closed || null,
      row.start_date || null,
      row.end_date || null,
      row.out_of_town || null,
      row.job_location || null,
      row.job_type || null,
      row.type_of_work || null,
      row.reoccuring || null,
      row.contract_type || null,
      row.employees_embedded || null,
      row.utilized_subcontracted_labor || null
    ];
    
    await connection.query(`
      INSERT INTO master_jobs 
      (customer_num, customer_name, job_number, total_billings, total_expense, total_hours, 
       job_description, month_closed, start_date, end_date, out_of_town, job_location, 
       job_type, type_of_work, reoccuring, contract_type, employees_embedded, utilized_subcontracted_labor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, vals);
    inserted++;
  }
  
  process.stdout.write(`Inserted ${inserted} records into master_jobs.\n`);
  process.exit(0);
}

run().catch(console.error);
