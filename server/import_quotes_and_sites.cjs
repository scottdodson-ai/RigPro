const xlsx = require('xlsx');
const mysql = require('mysql2/promise');

function parseDateStr(str) {
  if (!str) return null;
  // expects 'm/d/yy' or 'm/d/yyyy'
  const parts = String(str).split('/');
  if (parts.length === 3) {
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    const m = parts[0].padStart(2, '0');
    const d = parts[1].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

async function main() {
  const db = await mysql.createConnection({ 
    user: 'root', 
    password: 'password123', 
    database: 'rigpro', 
    port: 3308 
  });

  // 1. Clear tables
  console.log("Clearing tables...");
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE quotes');
  await db.query('TRUNCATE TABLE sites');
  await db.query('TRUNCATE TABLE customers');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  // Load Status Table
  const [statusRows] = await db.query('SELECT id, name FROM status');
  const statusMap = {};
  for (let r of statusRows) {
    statusMap[r.name.toLowerCase()] = r.id;
  }

  // Parse Excel
  const wb = xlsx.readFile('./import_data/quotes_final.xlsx');
  const openQuotesData = xlsx.utils.sheet_to_json(wb.Sheets['Open Quotes'], { raw: false });
  const leadsData = xlsx.utils.sheet_to_json(wb.Sheets['Zero Quotes-Leads'], { raw: false });

  // Import customers and sites from Open Quotes
  const seenCustomers = new Set();
  const sitesMap = {}; // key: customer_id + addr, value: site_id

  console.log("Processing Open Quotes for customers and sites...");
  for (const row of openQuotesData) {
    const custId = parseInt(row.customer_id, 10);
    const custName = row['Lookup Name'];

    if (!isNaN(custId) && custName && !seenCustomers.has(custId)) {
      seenCustomers.add(custId);
      await db.query(
        'INSERT INTO customers (id, name, customer_num) VALUES (?, ?, ?)',
        [custId, custName, custId.toString()]
      );
    }

    // handle sites
    if (!isNaN(custId)) {
      const addr1 = (row.job_site_address1 || '').toString().trim().substring(0, 255);
      const city = (row.job_site_city || '').toString().trim().substring(0, 100);
      const state = (row.job_site_state || '').toString().trim().substring(0, 50);
      const zip = (row.job_site_zip || '').toString().trim().substring(0, 20);

      const siteKey = `${custId}|${addr1}|${city}|${state}|${zip}`;
      if (!sitesMap[siteKey] && (addr1 || city || state || zip)) {
        // Insert new site
        const [result] = await db.query(
          'INSERT INTO sites (customer_id, address1, city, state, zip) VALUES (?, ?, ?, ?, ?)',
          [custId, addr1, city, state, zip]
        );
        sitesMap[siteKey] = result.insertId;
      }
    }
  }

  // Process Quotes
  const allData = [
    { sheet: 'Open Quotes', data: openQuotesData },
    { sheet: 'Zero Quotes-Leads', data: leadsData }
  ];

  let quotesCreated = 0;
  for (const group of allData) {
    console.log(`Processing Quotes for ${group.sheet}...`);
    for (let i = 0; i < group.data.length; i++) {
      const row = group.data[i];
      const custId = parseInt(row.customer_id, 10);
      if (isNaN(custId)) continue;

      let siteId = null;
      if (group.sheet === 'Open Quotes') {
        const addr1 = (row.job_site_address1 || '').toString().trim().substring(0, 255);
        const city = (row.job_site_city || '').toString().trim().substring(0, 100);
        const state = (row.job_site_state || '').toString().trim().substring(0, 50);
        const zip = (row.job_site_zip || '').toString().trim().substring(0, 20);
        const siteKey = `${custId}|${addr1}|${city}|${state}|${zip}`;
        siteId = sitesMap[siteKey] || null;
      }

      const dateStr = parseDateStr(row.date);
      const qType = row.quote_type || 'Contract';
      const statusStr = (row.status || '').toLowerCase();
      const statusId = statusMap[statusStr] || null;
      const desc = row.description || '';
      
      const qn = `IMP-${group.sheet === 'Open Quotes' ? 'OQ' : 'ZQ'}-${String(i+1).padStart(4, '0')}`;
      const customerName = row['Lookup Name'] || '';

      await db.query(
        `INSERT INTO quotes (quote_number, customer_id, site_id, customer_name, date, quote_type, status, description, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [qn, custId, siteId, customerName, dateStr, qType, statusId, desc, row.notes || '']
      );
      quotesCreated++;
    }
  }

  console.log(`Created ${quotesCreated} quotes.`);
  await db.end();
}

main().catch(console.error);
