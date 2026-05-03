const mysql = require('mysql2/promise');
async function test() {
  const db = await mysql.createConnection({ user: 'root', password: 'password123', database: 'rigpro' });
  const [rows] = await db.query("SELECT quote_data FROM quotes WHERE quote_data IS NOT NULL LIMIT 5");
  rows.forEach(r => {
    let q = JSON.parse(r.quote_data);
    console.log("type of laborRows:", typeof q.laborRows);
    if (typeof q.laborRows === 'string') console.log("value:", q.laborRows.slice(0, 50));
  });
  db.end();
}
test();
