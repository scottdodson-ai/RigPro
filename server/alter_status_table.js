import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'rigpro',
  port: 3308
});

async function run() {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM status LIKE 'date_time';`);
    if (rows.length === 0) {
      await db.query(`ALTER TABLE status ADD COLUMN date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
      console.log("Successfully added date_time column to status table.");
    } else {
      console.log("date_time column already exists.");
    }
  } catch (err) {
    console.error("Error altering status table:", err);
  }
  process.exit(0);
}
run();
