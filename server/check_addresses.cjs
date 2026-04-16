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
    const [sitesRows] = await db.query("SELECT id, name, address1, city, state, zip FROM sites WHERE address1 LIKE '%,%' LIMIT 10");
    console.log("Sites with commas in address1:");
    console.table(sitesRows);
    
    // Check customers table just in case
    const [custRows] = await db.query("SELECT id, name, address1, city, state, zipcode FROM customers WHERE address1 LIKE '%,%' LIMIT 10");
    console.log("Customers with commas in address1:");
    console.table(custRows);
  } catch(e) {
    console.error(e);
  } finally {
    db.end();
  }
}
run();
