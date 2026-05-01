const XLSX = require('xlsx');
const path = require('path');

const files = [
  'supabase/datalama/excel/BQ.xlsx',
  'supabase/datalama/excel/customer.xlsx'
];

files.forEach(file => {
  try {
    const fullPath = path.join(process.cwd(), file);
    const workbook = XLSX.readFile(fullPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`File: ${file}`);
    console.log(`Headers: ${JSON.stringify(data[0])}`);
    console.log(`First row: ${JSON.stringify(data[1])}`);
    console.log('---');
  } catch (err) {
    console.error(`Error reading ${file}: ${err.message}`);
  }
});
