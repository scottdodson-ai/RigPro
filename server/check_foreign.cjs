const mysql = require('mysql2/promise');
require('dotenv').config();

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308,
  });

  try {
    const [rows] = await db.query("SELECT id, address1, city, state, zip FROM sites");
    const foreignOrUnknown = rows.filter(r => {
      if (!r.address1 && !r.city && !r.state && !r.zip) return false;
      if (r.state && US_STATES.has(r.state.toUpperCase())) return false;
      return true;
    });
    
    console.log(`Found ${foreignOrUnknown.length} records that don't map to a standard US state (which could include foreign, empty, or unparsed):`);
    console.table(foreignOrUnknown);
  } catch(e) {
    console.error(e);
  } finally {
    db.end();
  }
}
run();
