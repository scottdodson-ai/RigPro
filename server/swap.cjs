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
    await db.query("UPDATE status SET name = 'In Progress', sort_order = 20 WHERE id = 2");
    await db.query("UPDATE status SET name = 'customer_contact', sort_order = 30 WHERE id = 3");
    
    const [rows] = await db.query("SELECT id, name, sort_order FROM status LIMIT 5");
    console.log(rows);
  } catch(e) {
    console.error(e);
  }

  db.end();
}
run();
