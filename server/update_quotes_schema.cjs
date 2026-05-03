const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rigpro'
};

async function run() {
  const db = await mysql.createConnection({ user: 'root', password: 'password123', database: 'rigpro', port: 3308, host: 'localhost' });

  try {
    console.log("Updating quotes schema...");
    
    // Change date to create_date DATETIME
    try {
      await db.query("ALTER TABLE quotes CHANGE COLUMN date create_date DATETIME");
      console.log("Changed date to create_date DATETIME");
    } catch(e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log("Column date already changed or doesn't exist");
      } else {
        console.log("Error changing date:", e.message);
      }
    }

    // Add last_modified DATETIME
    const [cols] = await db.query("SHOW COLUMNS FROM quotes LIKE 'last_modified'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE quotes ADD COLUMN last_modified DATETIME");
      console.log("Added last_modified column to quotes");
      
      // Update existing records
      await db.query("UPDATE quotes SET last_modified = created_at WHERE last_modified IS NULL");
      
      // Update create_date to created_at where create_date might be just a DATE without time, or is null
      await db.query("UPDATE quotes SET create_date = created_at WHERE create_date IS NULL OR TIME(create_date) = '00:00:00'");
      console.log("Backfilled last_modified and create_date");
    } else {
      console.log("Column last_modified already exists");
    }
  } catch(e) {
    console.error(e);
  } finally {
    await db.end();
  }
}

run();
