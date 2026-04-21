import mysql from 'mysql2/promise';

async function run() {
  const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'rigpro',
    port: 3308
  });
  
  const [rows] = await db.query("SELECT * FROM status");
  console.log(rows);
  process.exit(0);
}
run();
