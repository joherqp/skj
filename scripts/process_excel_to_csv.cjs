const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BQ_FILE = 'supabase/datalama/excel/BQ.xlsx';
const CUSTOMER_FILE = 'supabase/datalama/excel/customer.xlsx';
const EMPLOYEE_FILE = 'supabase/datalama/excel/employee.xlsx';
const OUTPUT_FILE = 'import_penjualan.csv';

function extractLatLng(mapsUrl) {
  if (!mapsUrl) return { lat: '', long: '' };
  const match = mapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: match[1], long: match[2] };
  }
  return { lat: '', long: '' };
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanBranchName(name) {
  if (!name) return '';
  // Remove "Gudang " or "Wilayah " prefix (case insensitive)
  return name.replace(/^(gudang|wilayah)\s+/i, '').trim();
}

console.log('Reading Excel files...');

try {
  // Read Employees
  let employeeMap = new Map();
  if (fs.existsSync(EMPLOYEE_FILE)) {
    const employeeWb = XLSX.readFile(EMPLOYEE_FILE);
    const employeeWs = employeeWb.Sheets[employeeWb.SheetNames[0]];
    const employees = XLSX.utils.sheet_to_json(employeeWs);
    employees.forEach(e => {
      const normName = normalizeName(e.name);
      const normUsername = normalizeName(e.username);
      employeeMap.set(normName, e);
      employeeMap.set(normUsername, e);
    });
    console.log(`Loaded ${employeeMap.size} employee mappings.`);
  }

  // Read Customers
  const customerWb = XLSX.readFile(CUSTOMER_FILE);
  const customerWs = customerWb.Sheets[customerWb.SheetNames[0]];
  const customers = XLSX.utils.sheet_to_json(customerWs);
  
  const customerMap = new Map();
  customers.forEach(c => {
    const normName = normalizeName(c.name);
    const loc = extractLatLng(c.maps);
    customerMap.set(normName, {
      ...c,
      lat: loc.lat,
      long: loc.long
    });
  });

  // Read BQ (Penjualan)
  const bqWb = XLSX.readFile(BQ_FILE);
  const bqWs = bqWb.Sheets[bqWb.SheetNames[0]];
  const bqRows = XLSX.utils.sheet_to_json(bqWs);

  console.log(`Processing ${bqRows.length} transaction rows...`);

  // Phase 1: Calculate average qty per customer
  const customerStats = new Map(); // normalizedName -> { totalQty: number, count: number }
  bqRows.forEach(row => {
    const normToko = normalizeName(row.toko);
    const qty = Number(row.qty) || 0;
    if (!customerStats.has(normToko)) {
      customerStats.set(normToko, { totalQty: 0, count: 0 });
    }
    const stats = customerStats.get(normToko);
    stats.totalQty += qty;
    stats.count += 1;
  });

  const getCategory = (avgQty) => {
    if (avgQty >= 800) return 'WS (Agen Besar)';
    if (avgQty >= 100) return 'SA (Agen Kecil)';
    return 'Retail';
  };

  // Phase 2: Map transactions
  const resultRows = bqRows.map(row => {
    const normToko = normalizeName(row.toko);
    const cust = customerMap.get(normToko);

    const normSales = normalizeName(row.nama);
    const emp = employeeMap.get(normSales);

    // USER REQUEST: Prioritize branch from employee.xlsx wilayah (branchName)
    const empBranchRaw = emp ? (emp.branchName || emp.warehouseName) : '';
    const rawBranch = empBranchRaw || row.divisi;
    const cabang = cleanBranchName(rawBranch);

    // Calculate customer category based on average qty
    const stats = customerStats.get(normToko);
    const avgQty = stats ? (stats.totalQty / stats.count) : 0;
    const kategoriPelanggan = getCategory(avgQty);

    // Calculate total
    const qty = Number(row.qty) || 0;
    const harga = Number(row.harga) || 0;
    const diskon = Number(row.diskon) || 0;
    const total = (qty * harga) - diskon;

    const alamat = row.alamat || (cust ? cust.address : '');
    const kecamatan = row.kecamatan || (cust ? cust.district : '');
    const telp = row.telp || (cust ? cust.phone : '');

    return {
      tanggal: row.tanggal,
      created_at: row.waktu,
      pelanggan_created_at: cust ? cust.registered : '',
      cabang: cabang,
      salesman: emp ? emp.name : row.nama,
      transaksi: row.transaksi,
      pelanggan: row.toko,
      kategori_pelanggan: kategoriPelanggan,
      alamat: `${alamat}${kecamatan ? ', ' + kecamatan : ''}`,
      lat: cust ? cust.lat : '',
      long: cust ? cust.long : '',
      telp: telp,
      note: row.catatan || '',
      produk: row.produk,
      qty: qty,
      harga: harga,
      promo: diskon,
      total: total
    };
  });

  // Convert to CSV
  const headers = [
    'tanggal', 'created_at', 'pelanggan_created_at', 'cabang', 'salesman', 
    'transaksi', 'pelanggan', 'kategori_pelanggan', 'alamat', 'lat', 'long', 'telp', 'note', 
    'produk', 'qty', 'harga', 'promo', 'total'
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
  console.log(`Successfully created ${OUTPUT_FILE} with ${resultRows.length} rows.`);

} catch (err) {
  console.error('Error processing files:', err);
  process.exit(1);
}
