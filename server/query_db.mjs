import mysql from 'mysql2/promise';

async function run() {
  const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'password123',
    database: 'rigpro',
  });
  
  const [rows] = await db.query('SELECT id, first_name, last_name, username FROM users');
  console.log(rows);
  process.exit(0);
}
run();
