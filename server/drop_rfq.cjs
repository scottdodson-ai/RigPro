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

  try {
    await db.query(`DROP TABLE IF EXISTS job_folders`);
    await db.query(`DROP TABLE IF EXISTS rfqs`);
    console.log("Dropped rfqs and job_folders successfully");
  } catch(e) {
    console.error(e);
  }
  db.end();
}
run();
