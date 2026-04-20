import mysql from 'mysql2/promise';

async function run() {
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password123',
    database: process.env.DB_NAME || 'rigpro',
    port: process.env.DB_PORT || 3306
  });
  
  const [rows] = await db.query('SELECT q.id, q.sales_assoc, u.id as u_id FROM quotes q LEFT JOIN users u ON u.first_name = q.sales_assoc OR u.username = q.sales_assoc ORDER BY q.id DESC LIMIT 10');
  console.log(rows);
  process.exit(0);
}
run();
