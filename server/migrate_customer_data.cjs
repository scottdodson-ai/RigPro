const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'password123',
    database: 'rigpro'
  });

  console.log('Starting migration to normalize customer address data to sites table...');

  try {
    // 1. Move address data from customers to sites
    const [customers] = await db.query('SELECT id, name, street, city, state, zip FROM customers WHERE street IS NOT NULL OR city IS NOT NULL OR zip IS NOT NULL');
    console.log(`Found ${customers.length} customers with address data to migrate.`);
    
    for (const cust of customers) {
      if (cust.street || cust.city || cust.state || cust.zip) {
        // Check if site already exists
        const [existingSites] = await db.query(
          'SELECT id FROM sites WHERE customer_id = ? AND (address1 = ? OR city = ? OR zip = ?) LIMIT 1',
          [cust.id, cust.street || '', cust.city || '', cust.zip || '']
        );
        
        let siteId;
        if (existingSites.length > 0) {
          siteId = existingSites[0].id;
        } else {
          // Insert new site
          const [insertedSite] = await db.query(
            'INSERT INTO sites (customer_id, site_type, address1, city, state, zip) VALUES (?, ?, ?, ?, ?, ?)',
            [cust.id, 'Main', cust.street || '', cust.city || '', cust.state || '', cust.zip || '']
          );
          siteId = insertedSite.insertId;
          console.log(`Created new site ${siteId} for customer ${cust.id}`);
        }
        
        // Link site to customer record
        await db.query('UPDATE customers SET site_id = ?, primary_site_id = ? WHERE id = ?', [siteId, siteId, cust.id]);
        
        // Also update any quotes for this customer that don't have a site_id
        await db.query('UPDATE quotes SET site_id = ? WHERE customer_id = ? AND (site_id IS NULL OR site_id = 0)', [siteId, cust.id]);
      }
    }
    console.log('Migrated data from customers to sites.');
  } catch (e) {
    console.log('Failed to migrate from customers to sites:', e.message);
  }

  // 2. Drop legacy columns from customers
  const dropCols = ['street', 'city', 'state', 'zip'];
  for (let col of dropCols) {
    try {
      await db.query(`ALTER TABLE customers DROP COLUMN ${col}`);
      console.log(`Dropped ${col} from customers.`);
    } catch (e) {
      console.log(`Column ${col} might already be dropped or an error occurred:`, e.message);
    }
  }

  await db.end();
  console.log('Migration complete.');
}

run().catch(console.error);
