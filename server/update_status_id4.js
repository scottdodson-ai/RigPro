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
    await db.query(`UPDATE status SET name = 'quote_in_review' WHERE id = 4`);
    console.log("Successfully updated status id:4 to quote_in_review.");
  } catch (err) {
    console.error("Error updating status table:", err);
  }
  process.exit(0);
}
run();
