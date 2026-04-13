import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function checkAndAlter() {
  let db;
  try {
    db = await mysql.createConnection(dbConfig);
    console.log("Connected to DB.");

    await db.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;`);
    console.log("Added reset_token column.");
    await db.query(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;`);
    console.log("Added reset_token_expires column.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Columns already exist.");
    } else {
      console.error(err);
    }
  } finally {
    if (db) await db.end();
  }
}

checkAndAlter();
