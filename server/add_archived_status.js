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
    const [rows] = await db.query(`SELECT id FROM status WHERE name = 'archived'`);
    if(rows.length === 0) {
      await db.query(`INSERT INTO status (name, sort_order) VALUES ('archived', 110)`);
      console.log("Successfully inserted archived status row.");
    } else {
      console.log("Archived status row already exists.");
    }
  } catch (err) {
    console.error("Error inserting into status table:", err);
  }
  process.exit(0);
}
run();
