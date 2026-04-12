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

  const [cols] = await db.query("SHOW COLUMNS FROM quotes");
  console.log("Quotes columns:", cols.map(c => c.Field));
  
  const [cols2] = await db.query("SHOW COLUMNS FROM Quote_Status_History");
  console.log("Quote_Status_History columns:", cols2.map(c => c.Field));

  const [cols3] = await db.query("SHOW COLUMNS FROM master_jobs");
  console.log("master_jobs columns:", cols3.map(c => c.Field));
  
  db.end();
}
run();
