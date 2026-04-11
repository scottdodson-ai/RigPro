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
    await db.query(`TRUNCATE TABLE status;`);
    await db.query(`
      INSERT INTO status (name, sort_order) VALUES
      ('quote_requested', 10),
      ('customer_contact', 20),
      ('quote_in_process', 30),
      ('quote_accepted', 40),
      ('quote_modification_needed', 50),
      ('quote_sent', 60),
      ('quote_accepted', 70),
      ('job_complete', 80),
      ('partial_payment', 90),
      ('full_payment', 100);
    `);
    console.log("Successfully updated status table with new records.");
  } catch (err) {
    console.error("Error updating status table:", err);
  }
  process.exit(0);
}
run();
