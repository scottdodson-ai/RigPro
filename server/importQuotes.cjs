const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const dataPath = path.join(__dirname, 'import_data', 'quotes', 'quotes_all.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const quotes = JSON.parse(rawData);

    const db = await mysql.createConnection({
      host: 'db', // matches docker-compose
      port: 3306,
      user: 'root',
      password: 'password123',
      database: 'rigpro'
    });

    console.log('Truncating quotes table...');
    await db.query('TRUNCATE TABLE quotes');
    console.log('Quotes table truncated.');

    console.log(`Importing ${quotes.length} quotes...`);
    for (const q of quotes) {
      // Extract a quote number or just use a part of the filename
      let quoteNumber = q.source_file.replace('.pdf', '').substring(0, 20);
      
      const customerName = q.recipient?.company || q.recipient?.name || 'Unknown';
      const jobSite = q.recipient?.address || '';
      const description = q.work_scope || '';
      const date = q.quote_date_iso || null;
      const status = 'Pending';
      const total = parseFloat(q.total_price) || 0;
      const salesAssoc = q.sender?.name || '';
      const notes = q.project_conditions || '';
      const quoteData = JSON.stringify(q);

      await db.query(
        'INSERT INTO quotes (quote_number, customer_name, job_site, description, date, status, total, sales_assoc, notes, quote_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [quoteNumber, customerName, jobSite, description, date, status, total, salesAssoc, notes, quoteData]
      );
    }
    
    console.log('Import successful!');
    process.exit(0);
  } catch (error) {
    console.error('Import Error:', error);
    process.exit(1);
  }
})();
