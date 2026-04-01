import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro',
  port: 3308
};

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const wb = new ExcelJS.Workbook();
    const filePath = path.join(__dirname, '../import_data/rigpro_tables_export.xlsx');
    await wb.xlsx.readFile(filePath);

    const ws = wb.getWorksheet('equipment');
    if (!ws) throw new Error('Sheet equipment not found');

    console.log(`Clearing existing equipment table...`);
    await connection.query('DELETE FROM equipment');

    let importCount = 0;
    
    const parseNum = (val) => {
        if (!val) return 0;
        const s = val.toString().replace(/[^0-9.-]/g, '');
        return parseFloat(s) || 0;
    };

    for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        if (!row.hasValues) continue;

        const code = row.getCell(1).value?.toString().trim();
        const category = row.getCell(2).value?.toString().trim();
        const name = row.getCell(3).value?.toString().trim();
        
        if (!code || !name) continue;

        await connection.query(
            `INSERT INTO equipment (
                code, category, name, capacity, daily_rate, daily_cost
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                code,
                category || 'N/A',
                name,
                row.getCell(4).value?.toString().trim() || '',
                parseNum(row.getCell(5).value),
                parseNum(row.getCell(6).value)
            ]
        );
        importCount++;
    }

    console.log(`Successfully imported ${importCount} equipment records.`);
  } catch (err) {
    console.error('Equipment Import Error:', err);
  } finally {
    await connection.end();
  }
}

run();
