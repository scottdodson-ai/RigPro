import ExcelJS from 'exceljs';

async function checkHeaders() {
  const wb = new ExcelJS.Workbook();
  const filePath = '/Users/peterlindsay/Documents/Projects/RigPro/import_data/rigpro_tables_export.xlsx';
  try {
    await wb.xlsx.readFile(filePath);
    const ws = wb.getWorksheet('equipment');
    if (!ws) {
        console.log('Sheet equipment not found. Sheets:', wb.worksheets.map(w => w.name));
        return;
    }
    const row1 = ws.getRow(1);
    const headers = [];
    row1.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers.push({ col: colNumber, val: cell.value });
    });
    console.log('Equipment Headers:', JSON.stringify(headers, null, 2));
    
    // Sample rows 2-5
    for(let i=2; i<=5; i++) {
        const row = ws.getRow(i);
        if(!row.hasValues) continue;
        const body = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            body.push({ col: colNumber, val: cell.value });
        });
        console.log(`Row ${i}:`, JSON.stringify(body, null, 2));
    }

  } catch (err) {
    console.error('Error reading excel:', err);
  }
}

checkHeaders();
