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
    // Check if customer_contact already exists at id 2
    const [rows] = await db.query("SELECT * FROM status WHERE id = 2 AND name = 'customer_contact'");
    if (rows.length > 0) {
      console.log("customer_contact already exists at id 2");
      process.exit(0);
    }
  
    await db.beginTransaction();
    
    // Increment foreign keys in quotes table if necessary
    // Let's check constraints first or just update them manually
    await db.query("UPDATE quotes SET status_id = status_id + 1 WHERE status_id >= 2 ORDER BY status_id DESC");
    
    // Do the same for Quote_Status_History
    await db.query("UPDATE Quote_Status_History SET status_id = status_id + 1 WHERE status_id >= 2 ORDER BY status_id DESC");
    
    // Optional: master_jobs might have status_id?
    // Not sure. Let's just try to update status table.
    
    await db.query("UPDATE status SET sort_order = sort_order + 10 WHERE id >= 2 ORDER BY id DESC");
    await db.query("UPDATE status SET id = id + 1 WHERE id >= 2 ORDER BY id DESC");
    
    await db.query("INSERT INTO status (id, name, sort_order) VALUES (2, 'customer_contact', 20)");
    
    await db.commit();
    console.log("Successfully updated status table and incremented IDs.");
  } catch (err) {
    await db.rollback();
    console.error("Error updating status table:", err);
  } finally {
    db.end();
  }
}
run();
