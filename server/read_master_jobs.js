import ExcelJS from 'exceljs';

async function run() {
  const wb = new ExcelJS.Workbook();
  try {
    console.log('Reading workbook...');
    await wb.xlsx.readFile('../import_data/rigpro_tables_export.xlsx');
    console.log('Sheet names:', wb.worksheets.map(w => w.name));
    
    for (const sname of ['customers', 'Master Job List']) {
      const ws = wb.getWorksheet(sname);
      if (!ws) { console.log(`Sheet [${sname}] not found`); continue; }
      console.log(`\n--- ${sname} Column Header Scan ---`);
      const hrow = ws.getRow(1);
      for (let c = 1; c <= 25; c++) {
          console.log(`Column ${c}:`, hrow.getCell(c).value);
      }
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
