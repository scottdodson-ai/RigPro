const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro'
};

async function run() {
  const db = await mysql.createConnection(DB_CONFIG);

  try {
    console.log("Updating schema for referrals...");
    
    // Add company_type to customers
    try {
      await db.query("ALTER TABLE customers ADD COLUMN company_type VARCHAR(50) DEFAULT 'direct'");
      console.log("Added company_type to customers");
    } catch(e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column company_type already exists on customers");
      } else {
        console.log("Error adding company_type:", e.message);
      }
    }

    // Add referred_by_id to quotes
    try {
      await db.query("ALTER TABLE quotes ADD COLUMN referred_by_id INT DEFAULT NULL");
      // Optionally add foreign key, but let's just add the column first to be safe and avoid constraint issues if data is messy
      console.log("Added referred_by_id to quotes");
    } catch(e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column referred_by_id already exists on quotes");
      } else {
        console.log("Error adding referred_by_id:", e.message);
      }
    }
    
    try {
        await db.query("ALTER TABLE quotes ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by_id) REFERENCES customers(id) ON DELETE SET NULL");
        console.log("Added foreign key for referred_by_id");
    } catch(e) {
        console.log("Foreign key might already exist or error:", e.message);
    }

    console.log("Done.");
  } catch(e) {
    console.error(e);
  } finally {
    await db.end();
  }
}

run();
