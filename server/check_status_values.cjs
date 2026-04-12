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

  const [quotes] = await db.query("SELECT id, status FROM quotes LIMIT 5");
  console.log("Quotes statuses:", quotes);
  
  const [history] = await db.query("SELECT id, status_name FROM Quote_Status_History LIMIT 5");
  console.log("History statuses:", history);
  
  db.end();
}
run();
