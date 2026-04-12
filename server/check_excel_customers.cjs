const xlsx = require('xlsx');

function run() {
  const wb = xlsx.readFile(__dirname + '/import_data/rigpro_tables_export (1).xlsx', { cellDates: true });
  console.log("Sheets:", wb.SheetNames);
  if (wb.SheetNames.includes('customers')) {
    const sheet = wb.Sheets['customers'];
    const rawData = xlsx.utils.sheet_to_json(sheet);
    if (rawData.length > 0) {
      console.log("Columns:", Object.keys(rawData[0]));
      console.log("First row:", rawData[0]);
    } else {
      console.log("Sheet is empty");
    }
  } else {
    console.log("No sheet named 'customers'");
  }
}
run();
