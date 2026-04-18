
const mysql = require('mysql2/promise');

async function migrate() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'password123',
    database: 'rigpro'
  });

  console.log('Fetching leads...');
  const [leads] = await db.query('SELECT * FROM leads');
  console.log('Found ' + leads.length + ' leads.');

  let migratedCount = 0;
  let skippedCount = 0;

  for (const lead of leads) {
    const [existing] = await db.query(
      'SELECT id FROM quotes WHERE lead_id = ? OR (customer_id <=> ? AND customer_id IS NOT NULL AND (notes = ? OR description = ?))',
      [lead.id, lead.customer_id, lead.description, lead.description]
    );

    if (existing.length > 0) {
      skippedCount++;
      await db.query('UPDATE quotes SET lead_id = ? WHERE id = ? AND lead_id IS NULL', [lead.id, existing[0].id]);
      continue;
    }

    const customerName = lead.customer_name || (lead.first_name || '') + ' ' + (lead.last_name || '') || 'New Customer';
    const statusId = lead.status_number == 2 ? 2 : 1; 

    const quoteData = { 
        client: customerName, 
        street: lead.street || lead.street1 || '', 
        city: lead.city || '', 
        state: lead.state || '', 
        zipcode: lead.zipcode || lead.zip || '', 
        desc: lead.description || '', 
        date: new Date(lead.create_date || Date.now()).toISOString().split('T')[0], 
        status: statusId == 1 ? 'Lead' : 'In Progress'
    };

    await db.query(
      'INSERT INTO quotes (quote_number, customer_id, customer_name, job_site, street, city, state, zipcode, description, date, status, notes, quote_data, lead_id, first_name, last_name, contact_phone, contact_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        '', // quote_number (NOT NULL fix)
        lead.customer_id,
        customerName.substring(0, 100), // NOT NULL fix with length limit
        lead.street || lead.street1 || '',
        lead.street || lead.street1 || '',
        lead.city || '',
        lead.state || '',
        lead.zipcode || lead.zip || '',
        lead.description || '',
        new Date(lead.create_date || Date.now()).toISOString().split('T')[0],
        statusId,
        'Migrated from leads table',
        JSON.stringify(quoteData),
        lead.id,
        lead.first_name || '',
        lead.last_name || '',
        lead.contact_phone || '',
        lead.contact_email || ''
      ]
    );
    migratedCount++;
  }

  console.log('Migration complete. Migrated: ' + migratedCount + ', Skipped: ' + skippedCount);
  await db.end();
}

migrate().catch(console.error);
