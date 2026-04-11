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
    await db.query(`
      CREATE TABLE IF NOT EXISTS quote_status_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          quote_id INT NOT NULL,
          status_name VARCHAR(50) NOT NULL,
          changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          changed_by INT,
          notes TEXT,
          FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
      )
    `);
    console.log("Table quote_status_history created successfully");
  } catch(e) {
    console.error(e);
  }
  db.end();
}
run();
