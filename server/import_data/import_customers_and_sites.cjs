/**
 * Import customers from Final Customer List.xlsx into the running database.
 * - Does NOT drop the customers table (imports without duplicates)
 * - Adds address data to the `sites` table tied to customer_id without duplicates.
 * - Geocodes the addresses using Nominatim (respecting 1 req/sec limit).
 */
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const https = require('https');

const geocodeAddress = async (address1, city, state, zip) => {
  try {
    const addrStr = `${address1 || ''}, ${city || ''}, ${state || ''} ${zip || ''}`.trim().replace(/, ,/g, ',').replace(/, $/g, '');
    if (!addrStr || addrStr.length < 5) return null;
    
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addrStr)}`;
    const res = await fetch(url, { headers: { 'User-Agent': `RigPro-Import-${Date.now()}` } });
    if (!res.ok) return null;
    const parsed = await res.json();
    if (parsed && parsed.length > 0) return `${parsed[0].lat},${parsed[0].lon}`;
    return null;
  } catch (e) {
    return null;
  }
};

async function main() {
  const filePath = path.join(__dirname, 'Final Customer List.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log(`Read ${data.length} rows from "${sheetName}"`);

  const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'password123',
    database: 'rigpro',
    port: 3308,
    waitForConnections: true,
    connectionLimit: 10
  });

  let newCustomers = 0;
  let newSites = 0;
  let geocodedSites = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const name = (row.name || '').trim();
    if (!name) continue;

    const street = (row.address1 || '').trim();
    const city = (row.city || '').trim();
    const state = (row.state || '').trim();
    const zip = String(row.zip || '').trim();
    const tombstone = row.tombstone ? 1 : 0;

    let customerId = null;

    try {
      // Try to find the customer first
      const [existing] = await db.query('SELECT id FROM customers WHERE name = ?', [name]);
      if (existing.length > 0) {
        customerId = existing[0].id;
      } else {
        // Insert customer
        const billing_street = street;
        const billing_city = city;
        const billing_state = state;
        const billing_zip = zip;
        
        const created_at = row.created_at
          ? new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' ')
          : new Date().toISOString().slice(0, 19).replace('T', ' ');
        const updated_at = row.updated_at
          ? new Date(row.updated_at).toISOString().slice(0, 19).replace('T', ' ')
          : new Date().toISOString().slice(0, 19).replace('T', ' ');

        const [res] = await db.query(
          `INSERT INTO customers (name, billing_street, billing_city, billing_state, billing_zip, tombstone, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, billing_street, billing_city, billing_state, billing_zip, tombstone, created_at, updated_at]
        );
        customerId = res.insertId;
        newCustomers++;
      }

      // If customer has a valid address, link it to sites
      if (customerId && street) {
        // Check if site already exists
        const [siteRows] = await db.query(
          'SELECT id, geocode FROM sites WHERE customer_id = ? AND address1 = ? AND city = ? AND state = ? AND zip = ?',
          [customerId, street, city, state, zip]
        );

        if (siteRows.length === 0) {
          // Geocode before insert
          const geocode = await geocodeAddress(street, city, state, zip);
          
          await db.query(
            'INSERT INTO sites (customer_id, site_type, address1, city, state, zip, geocode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [customerId, 'HQ / Billing', street, city, state, zip, geocode]
          );
          
          newSites++;
          if (geocode) geocodedSites++;
          
          // Sleep to respect 1 req / sec limit of OSM Nominatim
          await new Promise(r => setTimeout(r, 1200));
        } else {
          // If site exists but has no geocode, maybe geocode it?
          // We'll skip for now to save time if they just ran this script multiple times.
        }
      }
      
      if (i % 50 === 0 && i !== 0) {
        console.log(`Processed ${i} / ${data.length} records...`);
      }
      
    } catch (err) {
      console.error(`  SKIP row name="${name}": ${err.message}`);
    }
  }

  console.log(`Done.\nNew Customers: ${newCustomers}\nNew Sites: ${newSites}\nSites Geocoded: ${geocodedSites}`);
  await db.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
