const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'password123',
    database: 'rigpro'
  });

  console.log('Starting migration...');

  // 1. Add columns back to customers if missing
  try {
    await db.query('ALTER TABLE customers ADD COLUMN street VARCHAR(255)');
    await db.query('ALTER TABLE customers ADD COLUMN city VARCHAR(100)');
    await db.query('ALTER TABLE customers ADD COLUMN state VARCHAR(50)');
    await db.query('ALTER TABLE customers ADD COLUMN zip VARCHAR(20)');
    console.log('Added address columns to customers.');
  } catch (e) {
    console.log('Address columns might already exist in customers.', e.message);
  }

  // 2. Move data from sites (primary site) to customers
  try {
    await db.query(`
      UPDATE customers c 
      JOIN sites s ON c.primary_site_id = s.id 
      SET c.street = s.address1, c.city = s.city, c.state = s.state, c.zip = s.zip
    `);
    console.log('Migrated data from sites to customers.');
  } catch (e) {
    console.log('Failed to migrate from sites:', e.message);
  }

  // 3. Move data from quotes to customers where customer address is empty
  try {
    await db.query(`
      UPDATE customers c 
      JOIN quotes q ON c.id = q.customer_id 
      SET c.street = COALESCE(NULLIF(c.street, ''), q.street),
          c.city = COALESCE(NULLIF(c.city, ''), q.city),
          c.state = COALESCE(NULLIF(c.state, ''), q.state),
          c.zip = COALESCE(NULLIF(c.zip, ''), q.zipcode)
    `);
    console.log('Migrated data from quotes to customers.');
  } catch (e) {
    console.log('Failed to migrate from quotes:', e.message);
  }

  // 4. Drop customer_num from customers
  try {
    await db.query('ALTER TABLE customers DROP COLUMN customer_num');
    console.log('Dropped customer_num from customers.');
  } catch (e) {
    console.log('Failed to drop customer_num:', e.message);
  }

  // 5. Drop customer columns from quotes
  const dropQuoteCols = [
    'customer_name', 'street', 'city', 'state', 'zipcode', 
    'first_name', 'last_name', 'contact_phone', 'contact_email'
  ];

  for (let col of dropQuoteCols) {
    try {
      await db.query(`ALTER TABLE quotes DROP COLUMN ${col}`);
      console.log(`Dropped ${col} from quotes.`);
    } catch (e) {
      console.log(`Failed to drop ${col} from quotes:`, e.message);
    }
  }

  await db.end();
  console.log('Migration complete.');
}

run().catch(console.error);
