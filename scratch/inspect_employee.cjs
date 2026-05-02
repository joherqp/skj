const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/herujohaeri/Data Local/skj/supabase/datalama/excel/employee.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows:', data.length);
console.log('Columns:', Object.keys(data[0] || {}));
console.log('Sample rows:', JSON.stringify(data.slice(0, 5), null, 2));
