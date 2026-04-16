const mysql = require('mysql2/promise');
require('dotenv').config();

const statesMap = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'dist. of columbia': 'DC'
};

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3308,
  });

  try {
    const [rows] = await db.query("SELECT id, state FROM sites WHERE state IS NOT NULL AND state != ''");
    let updated = 0;

    for (const row of rows) {
      const stateTrimmed = row.state.trim().toLowerCase();
      let newValue = null;

      if (statesMap[stateTrimmed]) {
        newValue = statesMap[stateTrimmed];
      } else if (stateTrimmed.length === 2 && Object.values(statesMap).includes(row.state.trim().toUpperCase())) {
        newValue = row.state.trim().toUpperCase();
      }

      if (newValue && newValue !== row.state) {
        await db.query("UPDATE sites SET state = ? WHERE id = ?", [newValue, row.id]);
        updated++;
      }
    }

    console.log(`Updated ${updated} records in the sites table.`);
  } catch (err) {
    console.error("Error updating states:", err);
  } finally {
    db.end();
  }
}

run();
