const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rigpro123!',
  database: process.env.DB_NAME || 'rigpro_db'
};

async function run() {
  const db = await mysql.createConnection(DB_CONFIG);
  
  console.log("Removing existing database (quotes, rfqs, customer_contacts)...");
  await db.query("SET FOREIGN_KEY_CHECKS = 0");
  await db.query("TRUNCATE TABLE quotes");
  await db.query("TRUNCATE TABLE rfqs");
  await db.query("TRUNCATE TABLE customer_contacts");
  await db.query("TRUNCATE TABLE job_folders");
  // We won't truncate customers, we will just sync them
  await db.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log("Loading quotes_all.json...");
  const rawData = fs.readFileSync(path.join(__dirname, 'quotes_all.json'), 'utf8');
  const items = JSON.parse(rawData);

  // Group by year to maintain sequences
  const seqs = { qn: {}, rn: {} };

  function getNext(type, dateIso) {
    const year = dateIso ? dateIso.substring(0, 4) : String(new Date().getFullYear());
    if (!seqs[type][year]) seqs[type][year] = 100;
    seqs[type][year]++;
    const prefix = type === 'qn' ? 'RIG' : 'REQ';
    return `${prefix}-${year}-${String(seqs[type][year]).padStart(3, '0')}`;
  }

  let added = 0;
  for (const q of items) {
    const client = (q.recipient && q.recipient.company) ? q.recipient.company : 'Unknown';
    let dateStr = q.quote_date_iso || new Date().toISOString().slice(0, 10);
    if (dateStr.length > 10) dateStr = dateStr.slice(0, 10);
    
    let total = 0;
    if (typeof q.total_price === 'number') total = q.total_price;
    else if (q.total_price_raw) {
       let parsed = parseFloat(q.total_price_raw.replace(/[^0-9.-]+/g,""));
       if (!isNaN(parsed)) total = parsed;
    }

    const desc = q.work_scope || '';
    const site = (q.recipient && q.recipient.address) ? q.recipient.address : '';
    const reqName = (q.recipient && q.recipient.name) ? q.recipient.name : '';
    const email = (q.recipient && q.recipient.email) ? q.recipient.email : '';
    const phone = (q.recipient && q.recipient.phone) ? q.recipient.phone : '';
    const sender = (q.sender && q.sender.name) ? q.sender.name : 'Unknown';

    // Get or Create Customer
    let customerId = null;
    const [cRows] = await db.query('SELECT id FROM customers WHERE name = ? LIMIT 1', [client]);
    if (cRows.length > 0) {
      customerId = cRows[0].id;
    } else {
      const [insertC] = await db.query('INSERT INTO customers (name) VALUES (?)', [client]);
      customerId = insertC.insertId;
    }
    
    // Add primary contact if doesn't exist
    if (reqName) {
      const [contactRows] = await db.query('SELECT id FROM customer_contacts WHERE customer_id = ? AND name = ?', [customerId, reqName]);
      if (contactRows.length === 0) {
        await db.query('INSERT INTO customer_contacts (customer_id, name, email, phone, is_primary) VALUES (?, ?, ?, ?, ?)', [customerId, reqName, email, phone, 1]);
      }
    }

    const rfqNum = getNext('rn', dateStr);
    const quoteNum = getNext('qn', dateStr);

    // INSERT RFQ
    const [rfqRes] = await db.query(
      `INSERT INTO rfqs 
       (rfq_number, customer_id, requester, email, phone, job_site, description, date, status, sales_assoc) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rfqNum, customerId, reqName, email, phone, site, desc, dateStr, 'Quoted', sender]
    );
    const rfqId = rfqRes.insertId;

    // INSERT QUOTE
    // Embed fromReqId in quote_data so the frontend maps it to the RFQ
    const quoteDataObj = { ...q, fromReqId: rfqId };
    const fullJson = JSON.stringify(quoteDataObj);
    
    await db.query(
      `INSERT INTO quotes 
       (quote_number, customer_name, job_site, description, date, status, total, sales_assoc, quote_data) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [quoteNum, client, site, desc, dateStr, 'Submitted', total, sender, fullJson]
    );
    added++;
  }

  console.log(`Successfully imported ${added} records with autoincremented RN and QN values!`);
  await db.end();
}

run().catch(console.error);
