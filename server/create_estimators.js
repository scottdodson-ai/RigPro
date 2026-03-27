import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
  });

  try {
    console.log("Creating estimators table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS estimators (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(100),
          phone VARCHAR(50),
          status VARCHAR(20) DEFAULT 'Active'
      );
    `);
    
    console.log("Populating estimators table...");
    await db.query(`
      INSERT IGNORE INTO estimators (name, email, phone) VALUES 
      ('Dan M', 'dan.m@shoemakerrigging.com', '330-555-0101'),
      ('Sarah K', 'sarah.k@shoemakerrigging.com', '330-555-0102'),
      ('Mike R', 'mike.r@shoemakerrigging.com', '330-555-0103');
    `);
    
    console.log("Done!");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
