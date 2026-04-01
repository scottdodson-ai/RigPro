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

    const jobWs = wb.getWorksheet('Master Job List');
    if (!jobWs) throw new Error('Master Job List worksheet not found');

    // Load normalization map: cleanerName -> customer_num and realName
    const nameToData = new Map();
    const [custRows] = await connection.query('SELECT name, customer_num FROM customers');
    custRows.forEach(r => {
        nameToData.set(cleanStr(r.name), { num: r.customer_num, name: r.name });
    });

    const customerNames = custRows.map(r => r.name);

    console.log(`Clearing existing master_jobs table...`);
    await connection.query('TRUNCATE TABLE master_jobs');

    let importCount = 0;
    let skippedCount = 0;

    for (let i = 2; i <= jobWs.rowCount; i++) {
        const row = jobWs.getRow(i);
        if (!row.hasValues) continue;

        const rawCustomer = row.getCell(1).value?.toString().trim();
        const jobNumber = row.getCell(2).value?.toString().trim();
        if (!rawCustomer || !jobNumber) {
            skippedCount++;
            continue;
        }

        // Fuzzy match customer name to get the numeric customer_num
        const cleanRaw = cleanStr(rawCustomer);
        let matched = nameToData.get(cleanRaw);
        
        if (!matched) {
            const foundName = customerNames.find(c => cleanStr(c).includes(cleanRaw) || cleanRaw.includes(cleanStr(c)));
            if (foundName) matched = nameToData.get(cleanStr(foundName));
        }

        const customerName = matched ? matched.name : rawCustomer;
        const customerNum = matched ? matched.num : null;

        const parseNum = (val) => {
            if (!val) return 0;
            const s = val.toString().replace(/[^0-9.-]/g, '');
            return parseFloat(s) || 0;
        };

        const parseDate = (val) => (val instanceof Date) ? val : null;

        await connection.query(
            `INSERT INTO master_jobs (
                customer_num, customer_name, job_number,
                total_billings, total_expense, total_hours,
                job_description, month_closed, start_date, end_date,
                out_of_town, job_location, job_type, type_of_work,
                reoccuring, contract_type, employees_embedded, utilized_subcontracted_labor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerNum,
                customerName,
                jobNumber,
                parseNum(row.getCell(3).value),
                parseNum(row.getCell(4).value),
                parseNum(row.getCell(5).value),
                row.getCell(6).value || '',
                parseDate(row.getCell(7).value),
                parseDate(row.getCell(8).value),
                parseDate(row.getCell(9).value),
                row.getCell(10).value?.toString() || '',
                row.getCell(11).value?.toString() || '',
                row.getCell(12).value?.toString() || '',
                row.getCell(13).value?.toString() || '',
                row.getCell(14).value?.toString() || '',
                row.getCell(15).value?.toString() || '',
                row.getCell(16).value?.toString() || '',
                row.getCell(17).value?.toString() || ''
            ]
        );
        importCount++;
    }

    console.log(`Successfully imported ${importCount} literal master jobs. Skipped ${skippedCount} items.`);
  } catch (err) {
    console.error('Master Job Import Error:', err);
  } finally {
    await connection.end();
  }
}

run();
