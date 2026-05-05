const XLSX = require('xlsx');
const fs = require('fs');

const PO_FILE = 'supabase/datalama/excel/po-data.xlsx';
const OUTPUT_FILE = 'import_mutasi.csv';

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeProduct(name) {
  if (!name) return '';
  let n = name.toString().toUpperCase().trim();
  n = n.replace(/\(R\)|\(B\)/g, '').trim();
  if (n === 'SKY RED') return 'SKY RED SKT';
  if (n === 'SKY KLIK') return 'SKY KLIK SKT';
  if (n === 'VANBOLD') return 'VANBOLD SKT';
  if (n === 'KOREK GAS') return 'KOREK';
  return n;
}

console.log('Reading PO data...');

try {
  if (!fs.existsSync(PO_FILE)) {
    console.error('File not found:', PO_FILE);
    process.exit(1);
  }

  const wb = XLSX.readFile(PO_FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  console.log(`Processing ${rows.length} PO rows...`);
  const resultRows = [];

  const EMPLOYEE_FILE = 'supabase/datalama/excel/employee.xlsx';
  let locationMap = {};

  if (fs.existsSync(EMPLOYEE_FILE)) {
    console.log('Reading employee mappings...');
    const empWb = XLSX.readFile(EMPLOYEE_FILE);
    const empWs = empWb.Sheets[empWb.SheetNames[0]];
    const emps = XLSX.utils.sheet_to_json(empWs);

    emps.forEach(emp => {
      // Prioritize KORLAP for Branch
      if (emp.role === 'KORLAP' && emp.branchName) {
        locationMap[emp.branchName.trim()] = emp.name.trim();
      }
      // Prioritize ADMIN_GUDANG for Warehouse
      if (emp.role === 'ADMIN_GUDANG' && emp.warehouseName) {
        // Only set if not already set by a more specific branch mapping, 
        // or if it's a warehouse-only entity.
        if (!locationMap[emp.warehouseName.trim()]) {
          locationMap[emp.warehouseName.trim()] = emp.name.trim();
        }
      }
    });

    // Manual overrides from user examples to ensure accuracy
    locationMap['Wilayah Bogor'] = 'Irfan';
    locationMap['Gudang Bogor'] = 'Nabila';
    locationMap['Wilayah Serang'] = 'Jaka Siswanta';
    
    console.log('Location to Employee mappings:', locationMap);
  }

  const mapLocationToPerson = (loc) => {
    if (!loc) return loc;
    return locationMap[loc.trim()] || loc;
  };

  rows.forEach(row => {
    let items = [];
    try {
      if (row.inventoryMovement) {
        items = JSON.parse(row.inventoryMovement);
      }
    } catch (e) {
      console.warn(`Failed to parse inventoryMovement for ID ${row.id}`);
    }

    const productMoves = new Map();

    // Map PO type to display jenis
    const poType = row.type || '';
    const note = (row.note || '').toLowerCase();
    let jenis = 'mutasi';
    if (poType === 'BPOW') jenis = 'restock';
    else if (note.includes('permintaan')) jenis = 'permintaan';
    else if (note.includes('opname')) jenis = 'opname';
    else if (poType === 'SPOB' || poType === 'SPOS') jenis = 'mutasi';

    items.forEach(item => {
      if (item.type === 'OUT' || item.type === 'IN') {
        const id = item.productId;
        if (!productMoves.has(id)) {
          productMoves.set(id, {
            name: item.productName,
            qty: Math.abs(item.qty),
            unit: item.unit
          });
        }
      }
    });

    productMoves.forEach((move, productId) => {
      resultRows.push({
        id: row.id,
        tanggal: row.registered,
        created_at: row.registered,
        operator: row.operatorName,
        cabang_asal: mapLocationToPerson(row.sourceName),
        penerima: mapLocationToPerson(row.beneficiaryName),
        jenis: jenis,
        keterangan: row.note || '',
        produk: normalizeProduct(move.name),
        qty: move.qty,
        unit: move.unit
      });
    });
  });

  // Convert to CSV
  const headers = [
    'id', 'tanggal', 'created_at', 'operator', 'cabang_asal', 'penerima', 'jenis', 'keterangan', 'produk', 'qty', 'unit'
  ];

  const csvContent = [
    headers.join(','),
    ...resultRows.map(row => 
      headers.map(h => {
        let val = row[h];
        if (val === undefined || val === null) return '';
        if (typeof val === 'string') {
          val = val.replace(/"/g, '""');
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            val = `"${val}"`;
          }
        }
        return val;
      }).join(',')
    )
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, csvContent);
  console.log(`Successfully created ${OUTPUT_FILE} with ${resultRows.length} item rows.`);

} catch (err) {
  console.error('Error processing PO file:', err);
  process.exit(1);
}
