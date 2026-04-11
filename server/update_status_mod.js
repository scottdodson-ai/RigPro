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
    const [result] = await db.query(`UPDATE status SET name = 'quote_modification_required' WHERE name = 'quote_modification_needed'`);
    if(result.affectedRows > 0) {
      console.log("Successfully updated quote_modification_needed to quote_modification_required.");
    } else {
      console.log("No matching record found to update.");
    }
  } catch (err) {
    console.error("Error updating status table:", err);
  }
  process.exit(0);
}
run();
