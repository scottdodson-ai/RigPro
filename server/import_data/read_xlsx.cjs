const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'Final Customer List.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0]; // sheet1
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet);
console.log("Headers:", Object.keys(data[0] || {}));
console.log("First row:", data[0]);
