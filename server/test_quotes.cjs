const mysql = require('mysql2/promise');

async function test() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 3308, user: 'root', password: 'password123', database: 'rigpro' });
  
  const [quotesRows] = await db.query(`SELECT q.id, s.name as status, q.status as status_id FROM quotes q LEFT JOIN status s ON q.status = s.id LEFT JOIN customers c ON q.customer_id = c.id WHERE q.status=1`);
  
  const mappedQuotes = quotesRows.map((row) => {
      let json = {};
      return {
        ...json,
        ...row,
        id: row.id,
        status_name: row.status,
        status: row.status_id || row.STATUS_ID || json.status_id || json.status || 'Draft',
      };
  });
  console.log(mappedQuotes);
  db.end();
}
test().catch(console.error);
