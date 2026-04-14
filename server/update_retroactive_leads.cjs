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

  const [leads] = await db.query("SELECT * FROM leads WHERE estimator_id IS NOT NULL AND estimator_id != '' AND status_number != 2");
  
  if (leads.length === 0) {
    console.log("No leads to update.");
    db.end();
    return;
  }

  for (const lead of leads) {
    console.log(`Processing lead ${lead.id}...`);

    let customerName = '';
    if (lead.customer_number) {
       const [custName] = await db.query('SELECT name FROM customers WHERE id = ?', [lead.customer_number]);
       if (custName.length > 0) customerName = custName[0].name;
    } else if (lead.first_name || lead.last_name) {
       customerName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    }

    const year = String(new Date().getFullYear());
    const [seqRows] = await db.query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(job_num, '-', -1) AS UNSIGNED)) AS max_seq FROM quotes WHERE job_num REGEXP ?`,
      [`^J-${year}-[0-9]{3,}$`]
    );
    const nextSeq = Number(seqRows?.[0]?.max_seq || 0) + 1;
    const resolvedJobNum = `J-${year}-${String(nextSeq).padStart(3, '0')}`;

    const quoteDataStr = JSON.stringify({ 
        targetId: null, qn: '', client: customerName, 
        jobSiteAddress1: lead.street1 || '', jobSiteCity: lead.city || '', 
        jobSiteState: lead.state || '', jobSiteZip: lead.zip || '', 
        desc: lead.description || '', date: new Date().toISOString().split('T')[0], 
        status: 'Draft', qtype: '', salesAssoc: lead.estimator_id 
    });

    const rowValues = [
      '', // quote_number
      lead.customer_number || null,
      customerName,
      lead.street1 || '', // job_site
      lead.street1 || '',
      lead.city || '',
      lead.state || '',
      lead.zip || '',
      lead.description || '',
      new Date().toISOString().split('T')[0],
      0, // status id
      '', // quote_type
      0, 0, 0, 0, 0, 0, 0,
      lead.estimator_id,
      resolvedJobNum,
      null, null,
      0, // locked
      'Auto-created from retro-active lead assignment',
      quoteDataStr
    ];

    const [insertRes] = await db.query(
      'INSERT INTO quotes (quote_number, customer_id, customer_name, job_site, job_site_address1, job_site_city, job_site_state, job_site_zip, description, date, status, quote_type, labor, equip, hauling, travel, materials, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked, notes, quote_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      rowValues
    );

    await db.query('INSERT INTO Quote_Status_History (quote_id, status_name, changed_by, notes) VALUES (?, ?, ?, ?)', 
      [insertRes.insertId, 'Draft', null, 'Created from retroactive lead script']
    );

    await db.query('UPDATE leads SET status_number = 2 WHERE id = ?', [lead.id]);
    console.log(`Lead ${lead.id} updated and quote generated as ${resolvedJobNum}.`);
  }

  console.log("Done.");
  db.end();
}
run();
