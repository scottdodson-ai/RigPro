const mysql = require('mysql2/promise');
require('dotenv').config();

const STATE_MAPPING = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
  'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
  'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
  'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
  'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY'
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
    const [rows] = await db.query("SELECT id, address1, city, state, zip FROM sites");
    let updated = 0;

    for (const row of rows) {
      if (!row.address1 && !row.city) continue;
      
      let newAddress = (row.address1 || '').trim();
      let newCity = (row.city || '').trim();
      let newState = (row.state || '').trim();
      let newZip = (row.zip || '').trim();
      
      let changed = false;

      // Handle city having state like "OH 4420" or "MO 63102 United States"
      if (newCity && !newState) {
         let match = newCity.match(/^([A-Z]{2})\s+([0-9]{5}(-[0-9]{4})?)(?:\s+(.*))?$/);
         if (match) {
            newState = match[1];
            newZip = match[2];
            newCity = ''; // We lost the city name, assume it's in address1
            
            // Re-parse address1
            let addrMatch = newAddress.match(/^(.*),\s*(.*)$/);
            if (addrMatch) {
               newAddress = addrMatch[1];
               newCity = addrMatch[2];
            }
            changed = true;
         } else {
             // Handle "MO 63102 United States"
             let m2 = newCity.match(/^([A-Z]{2})\s+([0-9]{4,5})/);
             if (m2) {
                newState = m2[1];
                if (!newZip) newZip = m2[2];
                newCity = '';
                let addrMatch = newAddress.match(/^(.*),\s*(.*)$/);
                if (addrMatch) {
                   newAddress = addrMatch[1];
                   newCity = addrMatch[2];
                }
                changed = true;
             }
         }
      }
      
      // Cleanup any messy states that got stuck in City previously
      if (newCity && !newState) {
         let cityParts = newCity.split(' ');
         if (cityParts.length >= 2) {
             let potentialState = cityParts[cityParts.length-1];
             if (potentialState.match(/^[A-Z]{2}$/i) || STATE_MAPPING[potentialState.toUpperCase()]) {
                  newState = potentialState;
                  newCity = cityParts.slice(0,-1).join(' ');
                  changed = true;
             } else if (cityParts.length >= 3 && cityParts[cityParts.length-1].match(/^\d{4,5}$/)) {
                  newZip = cityParts[cityParts.length-1];
                  potentialState = cityParts[cityParts.length-2];
                  newState = potentialState;
                  newCity = cityParts.slice(0,-2).join(' ');
                  changed = true;
             }
         }
      }
      
      // Always normalize state to 2 chars if possible
      if (newState) {
         let upperState = newState.toUpperCase();
         if (STATE_MAPPING[upperState]) {
            newState = STATE_MAPPING[upperState];
            changed = true;
         }
      }

      if (changed) {
         await db.query("UPDATE sites SET address1=?, city=?, state=?, zip=? WHERE id=?", [
            newAddress, newCity, newState, newZip, row.id
         ]);
         updated++;
      }
    }

    console.log(`Updated ${updated} address records.`);
  } catch(e) {
    console.error(e);
  } finally {
    db.end();
  }
}
run();
