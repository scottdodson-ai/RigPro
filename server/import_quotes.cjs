const fs = require('fs');
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

  const raw = fs.readFileSync('/root/RigPro/server/import_data/quotes/quotes_all.json', 'utf8');
  const data = JSON.parse(raw);

  let inserted = 0;
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    
    // Generate a quote number if none exists
    const qn = `RIG-IMP-${String(i+1).padStart(4, '0')}`;
    
    let client = 'Unknown';
    let jobSite = '';
    if (q.recipient) {
      if (q.recipient.company) client = q.recipient.company;
      else if (q.recipient.name) client = q.recipient.name;
      
      if (q.recipient.address) jobSite = q.recipient.address;
    }
    
    let desc = q.work_scope || '';
    if (!desc && q.scope_items && q.scope_items.length) desc = q.scope_items[0];
    
    let qdate = null;
    if (q.quote_date_iso && q.quote_date_iso.match(/^\d{4}-\d{2}-\d{2}$/)) {
      qdate = q.quote_date_iso;
    }
    
    let total = q.total_price || 0;
    
    let salesAssoc = '';
    if (q.sender && q.sender.name) {
      salesAssoc = q.sender.name;
    }

    try {
      await db.query(
        `INSERT INTO quotes (quote_number, customer_name, job_site, description, date, status, quote_type, total, sales_assoc, quote_data, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          qn,
          client.substring(0, 100),
          jobSite.substring(0, 255),
          desc,
          qdate,
          'Submitted', // default status
          'Contract', // default type
          total,
          salesAssoc.substring(0, 50),
          JSON.stringify(q),
          `Imported from ${q.source_file}`
        ]
      );
      inserted++;
    } catch (e) {
      console.error("Error inserting quote", qn, e.message);
    }
  }

  console.log(`Successfully imported ${inserted} quotes.`);
  db.end();
}

run().catch(console.error);
