const db = require('./db.js');

async function go() {
  const [contacts] = await db.query('SELECT * FROM customer_contacts LIMIT 2');
  console.log("CONTACTS:");
  console.log(contacts);

  const [cust] = await db.query('SELECT id, customer_num, name FROM customers LIMIT 2');
  console.log("CUST:");
  console.log(cust);
  
  process.exit(0);
}
go();
