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

  const [cols] = await db.query("SHOW COLUMNS FROM admin_tasks");
  console.log("admin_tasks columns:", cols.map(c => c.Field));
  
  const [rows] = await db.query("SELECT * FROM admin_tasks");
  console.log("admin_tasks data:", rows);

  db.end();
}
run();
