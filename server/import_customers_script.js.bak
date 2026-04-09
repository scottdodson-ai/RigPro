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
    await wb.xlsx.readFile('../import_data/rigpro_tables_export.xlsx');

    const customerWs = wb.getWorksheet('customers');
    const contactWs = wb.getWorksheet('customer_contacts');

    if (!customerWs) throw new Error('Customers worksheet not found');

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE customer_contacts');
    await connection.query('TRUNCATE TABLE customers');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const nameToId = new Map();
    const cleanNameToId = new Map();
    const allCustomerNames = [];
    let custCount = 0;

    for (let i = 2; i <= customerWs.rowCount; i++) {
        const row = customerWs.getRow(i);
        if (!row.hasValues) continue;
        const excelId = row.getCell(1).value;
        const nameValue = row.getCell(2).value;
        if (!nameValue) continue;
        const name = nameValue.toString().trim();
        const [result] = await connection.query(
            'INSERT INTO customers (name, notes, billing_address, website, industry, payment_terms, account_num, customer_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, row.getCell(3).value || null, row.getCell(4).value || null, row.getCell(5).value || null, row.getCell(6).value || null, row.getCell(7).value || null, row.getCell(8).value || null, excelId || null]
        );
        const lName = name.toLowerCase();
        const cName = cleanStr(name);
        // Link by both name and this new numeric ID
        nameToId.set(lName, result.insertId);
        cleanNameToId.set(cName, result.insertId);
        allCustomerNames.push({ name: lName, clean: cName, id: result.insertId, excelId });
        custCount++;
    }

    let contactCount = 0;
    if (contactWs) {
        for (let i = 2; i <= contactWs.rowCount; i++) {
            const row = contactWs.getRow(i);
            if (!row.hasValues) continue;
            const companyValue = row.getCell(2).value?.toString().trim();
            const contactName = row.getCell(3).value?.toString().trim();
            
            if (!contactName || !companyValue) continue;

            const company = companyValue.toLowerCase();
            const cleanCompany = cleanStr(companyValue);

            let customerId = nameToId.get(company) || cleanNameToId.get(cleanCompany);
            
            // Fuzzy fallback
            if (!customerId) {
                const partial = company.replace(/^\([^)]+\)\s*/, '').replace(/^\/\s*/, '').trim();
                const cleanPartial = cleanStr(partial);
                customerId = nameToId.get(partial) || cleanNameToId.get(cleanPartial);

                if (!customerId) {
                   const found = allCustomerNames.find(c => cleanCompany.includes(c.clean) || c.clean.includes(cleanCompany));
                   if (found) customerId = found.id;
                }
            }

            if (customerId) {
                await connection.query(
                    'INSERT INTO customer_contacts (customer_id, name, title, email, mobile, phone, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        customerId, 
                        contactName, 
                        row.getCell(4).value || null,  // Title
                        row.getCell(5).value || null,  // Email
                        row.getCell(6).value || null,  // Mobile
                        row.getCell(7).value || null,  // Phone
                        row.getCell(8).value ? 1 : 0    // IsPrimary
                    ]
                );
                contactCount++;
            }
        }
    }

    console.log(`Final results: ${custCount} customers and ${contactCount} contacts imported successfully.`);
  } catch (err) {
    console.error('Master Import Error:', err);
  } finally {
    await connection.end();
  }
}

run();
