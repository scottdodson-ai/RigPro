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
    // Check if status already exists and drop it to be safe (although we just want to rename)
    await db.query(`DROP TABLE IF EXISTS status;`);
    await db.query(`RENAME TABLE statuses TO status;`);
    console.log("Successfully renamed statuses to status table.");
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
       console.log("Table statuses does not exist. Skipping rename.");
    } else {
       console.error("Error renaming:", err);
    }
  }
  process.exit(0);
}
run();
