const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Final Customer List.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet);

let sql = `DROP TABLE IF EXISTS customers;
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    notes TEXT,
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(50),
    billing_zip VARCHAR(20),
    website VARCHAR(100),
    industry VARCHAR(100),
    payment_terms VARCHAR(50),
    account_num VARCHAR(50),
    tombstone TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

`;

for (let row of data) {
    let name = (row.name || '').replace(/'/g, "''");
    let street = (row.address1 || '').replace(/'/g, "''"); // Using address1 for street
    let city = (row.city || '').replace(/'/g, "''");
    let state = (row.state || '').replace(/'/g, "''");
    let zip = (row.zip || '').toString().replace(/'/g, "''");
    let tombstone = row.tombstone ? 1 : 0;
    
    // Ignore billing_address from excel. Use customer address fields tracking.
    let billing_street = street;
    let billing_city = city;
    let billing_state = state;
    let billing_zip = zip;
    
    // Format dates correctly from Excel
    let created_at = row.created_at ? new Date(row.created_at).toISOString().slice(0,19).replace('T', ' ') : new Date().toISOString().slice(0,19).replace('T', ' ');
    let updated_at = row.updated_at ? new Date(row.updated_at).toISOString().slice(0,19).replace('T', ' ') : new Date().toISOString().slice(0,19).replace('T', ' ');

    sql += `INSERT INTO customers (id, name, street, city, state, zip, billing_street, billing_city, billing_state, billing_zip, tombstone, created_at, updated_at) VALUES (${row.id}, '${name}', '${street}', '${city}', '${state}', '${zip}', '${billing_street}', '${billing_city}', '${billing_state}', '${billing_zip}', ${tombstone}, '${created_at}', '${updated_at}');\n`;
}

fs.writeFileSync(path.join(__dirname, 'customers_inserts.sql'), sql);
console.log('Saved to customers_inserts.sql');
