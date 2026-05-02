const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/herujohaeri/Data Local/skj/supabase/datalama/excel/employee.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const mappings = data.map(row => ({
  name: row.name,
  role: row.role,
  warehouseName: row.warehouseName,
  branchName: row.branchName
}));

console.log(JSON.stringify(mappings, null, 2));
