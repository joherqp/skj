const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/herujohaeri/Data Local/skj/supabase/datalama/excel/po-data.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Columns:', Object.keys(data[0] || {}));
console.log('Sample data (first 3 rows):', JSON.stringify(data.slice(0, 3), (key, value) => {
  if (key === 'inventoryMovement' && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
}, 2));

// Check unique values for potential type fields
const typeFields = ['type', 'status', 'sourceType', 'beneficiaryType'];
typeFields.forEach(field => {
  const values = [...new Set(data.map(row => row[field]))];
  console.log(`Unique values for ${field}:`, values);
});
