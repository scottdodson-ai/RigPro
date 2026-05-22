const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'password123',
    database: 'rigpro'
  });

  const [custCols] = await connection.query('DESCRIBE customers');
  console.log('customers columns:', custCols.map(c => c.Field).join(', '));

  const [quoteCols] = await connection.query('DESCRIBE quotes');
  console.log('quotes columns:', quoteCols.map(c => c.Field).join(', '));
  
  const [siteCols] = await connection.query('DESCRIBE sites');
  console.log('sites columns:', siteCols.map(c => c.Field).join(', '));

  await connection.end();
}

run().catch(console.error);
