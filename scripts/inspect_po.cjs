const XLSX = require('xlsx');
const fs = require('fs');

const PO_FILE = 'supabase/datalama/excel/po-data.xlsx';

if (fs.existsSync(PO_FILE)) {
  const wb = XLSX.readFile(PO_FILE);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws);
  console.log('Total rows:', data.length);
  console.log('Columns:', Object.keys(data[0] || {}));
  console.log('First row:', JSON.stringify(data[0], null, 2));
} else {
  console.log('File not found:', PO_FILE);
}
