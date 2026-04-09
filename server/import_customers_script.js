import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'rigpro',
  port: 3308
};

const cleanStr = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('./import_data/rigpro_cust_job_tables_export.xlsx');

    const customerWs = wb.getWorksheet('customers');
    const contactWs = wb.getWorksheet('customer_contacts');

    if (!customerWs) throw new Error('Customers worksheet not found');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE customers');
    // Not truncating contacts unless we actually import them properly, wait skip modifying contacts for now since only Customers table replacement is requested.
    // wait the prompt ONLY said "replace Customers table in database with customers sheet in server/import_dta/rigpro_cust_job_tables_export.xlsx, keep all extra columns"
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Read headers dynamically
    const headerRow = customerWs.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    let custCount = 0;

    for (let i = 2; i <= customerWs.rowCount; i++) {
        const row = customerWs.getRow(i);
        if (!row.hasValues) continue;
        
        let cols = [];
        let vals = [];
        
        for (let c = 1; c < headers.length; c++) {
            if (headers[c]) {
                cols.push(headers[c]);
                vals.push(row.getCell(c).value !== undefined ? row.getCell(c).value : null);
            }
        }
        
        if (cols.length > 0) {
            const placeholders = cols.map(() => '?').join(', ');
            try {
                await connection.query(
                    `INSERT INTO customers (${cols.join(', ')}) VALUES (${placeholders})`,
                    vals
                );
                custCount++;
            } catch (err) {
                console.error('Error inserting row', i, err.message);
            }
        }
    }

    console.log(`Final results: ${custCount} customers imported successfully.`);
  } catch (err) {
    console.error('Master Import Error:', err);
  } finally {
    await connection.end();
  }
}

run();
