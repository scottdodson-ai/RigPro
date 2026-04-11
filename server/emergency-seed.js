import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'rigpro',
    port: 3308,
    multipleStatements: true
  });
  
  try {
    const initSqlPath = path.join(__dirname, '..', 'db', 'init.sql');
    const schema = fs.readFileSync(initSqlPath, 'utf8');
    await pool.query(schema);
    console.log('Successfully recreated tables from init.sql!');
  } catch(e) {
    console.error('Seed script failed:', e.message);
  }
  process.exit();
}
run();
