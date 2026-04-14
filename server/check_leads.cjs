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

  const [leads] = await db.query("SELECT * FROM leads WHERE estimator_id IS NOT NULL AND estimator_id != '' AND status_number != 2");
  console.log("Leads needing update:", leads.length);
  console.log(leads);

  db.end();
}
run();
