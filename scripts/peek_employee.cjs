const XLSX = require('xlsx');
const path = require('path');

const file = 'supabase/datalama/excel/employee.xlsx';

console.log(`\nFile: ${file}`);
try {
  const workbook = XLSX.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
  console.log('Headers:', headers);
  const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[1];
  console.log('First Row Sample:', firstRow);
} catch (err) {
  console.error(`Error reading ${file}:`, err.message);
}
