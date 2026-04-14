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
    const [cols] = await db.query("SHOW COLUMNS FROM admin_tasks LIKE 'created_by'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE admin_tasks ADD COLUMN created_by INT DEFAULT NULL");
      console.log("Added created_by column to admin_tasks table.");
    } else {
      console.log("created_by column already exists in admin_tasks table.");
    }
  } catch (error) {
    console.error("Error updating schema:", error);
  }

  db.end();
}
run();
