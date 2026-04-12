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
    await db.query("UPDATE status SET sort_order = sort_order + 10 WHERE id >= 2 ORDER BY id DESC");
    await db.query("UPDATE status SET id = id + 1 WHERE id >= 2 ORDER BY id DESC");
    await db.query("INSERT INTO status (id, name, sort_order) VALUES (2, 'customer_contact', 20)");
    
    // Also update quotes that match id -> maybe we don't need to if no foreign key is broken
    // Wait, let's see if we get an FK error
    console.log("Success");
  } catch(e) {
    console.error(e);
  }

  const [rows] = await db.query("SELECT * FROM status ORDER BY id ASC");
  console.log(JSON.stringify(rows, null, 2));
  
  db.end();
}
run();
