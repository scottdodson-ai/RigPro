require('dotenv').config();
const mysql = require('mysql2/promise');

async function r() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308
  });
  try {
    await db.query("INSERT IGNORE INTO role (name) VALUES ('manager')");
    await db.query("UPDATE users u JOIN role r ON u.role = r.name SET u.role = r.id");
    await db.query("ALTER TABLE users MODIFY COLUMN role INT");
    console.log("Successfully updated DB.");
  } catch (e) {
    console.error("Error:", e);
  }
  db.end();
}
r();
