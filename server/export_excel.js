import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function exportAllTables() {
  let db;
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3308,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password123',
      database: process.env.DB_NAME || 'rigpro',
    });

    const [tablesResult] = await db.query('SHOW TABLES');
    const tables = tablesResult.map(r => Object.values(r)[0]);

    if (tables.length === 0) {
      console.log('No tables found in the database.');
      return;
    }

    const exportPath = path.join(process.cwd(), 'rigpro_tables_export.xlsx');
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'RigPro DB Exporter';
    workbook.lastModifiedBy = 'RigPro DB Exporter';
    workbook.created = new Date();
    workbook.modified = new Date();

    for (const table of tables) {
      console.log(`Exporting table: ${table}...`);
      const [rows] = await db.query(`SELECT * FROM ${table}`);
      
      const sheetName = table.substring(0, 31); // Excel sheet names cannot exceed 31 chars
      const worksheet = workbook.addWorksheet(sheetName);
      
      if (rows.length === 0) {
        worksheet.addRow(['No data']);
        continue;
      }
      
      const headers = Object.keys(rows[0]);
      
      // Styling the header row
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Light gray
      };
      
      // Add data rows
      for (const row of rows) {
        worksheet.addRow(Object.values(row));
      }
      
      // Auto-fit columns (basic)
      worksheet.columns.forEach(column => {
        let maxLen = 10; // min width
        column.eachCell({ includeEmpty: true }, cell => {
          const val = cell.value ? cell.value.toString() : '';
          maxLen = Math.max(maxLen, val.length + 2);
        });
        column.width = Math.min(maxLen, 50); // max width 50
      });
    }

    await workbook.xlsx.writeFile(exportPath);
    console.log(`\nExport completed successfully!`);
    console.log(`File saved to: ${exportPath}`);

  } catch (err) {
    console.error('Error during export:', err);
  } finally {
    if (db) await db.end();
  }
}

exportAllTables().catch(console.error);
