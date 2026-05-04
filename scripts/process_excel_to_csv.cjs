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

function validatePhone(phone) {
  if (!phone) return '';
  const s = String(phone).trim();
  // Remove all non-digits
  const digits = s.replace(/[^0-9]/g, '');
  
  // Indonesian phone numbers (landline or mobile) are typically at least 9 digits
  // Some old landlines might be 8, but most are 9-13.
  // Also check for obvious junk characters
  if (digits.length < 9) return '';
  if (/[.,/@&|]/.test(s) && digits.length < 10) return '';
  
  return s;
}

function toProperCase(str) {
  if (!str) return '';
  return str.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function cleanBranchName(name) {
  if (!name) return '';
  // Remove "Gudang " or "Wilayah " prefix (case insensitive)
  return name.replace(/^(gudang|wilayah)\s+/i, '').trim();
}

function formatToDBDate(dateStr) {
  if (!dateStr) return '';
  // Convert YYYY/MM/DD or other formats to YYYY-MM-DD
  return String(dateStr).replace(/\//g, '-').split(' ')[0];
}

function formatToDBDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  // Convert YYYY/MM/DD HH:mm:ss or ISO to YYYY-MM-DD HH:mm:ss
  let s = String(dateTimeStr).replace(/\//g, '-').replace('T', ' ');
  // Remove timezone part if present (e.g. +07:00 or .000Z)
  s = s.split(/[+Z]/)[0];
  return s.trim();
}

console.log('Reading Excel files...');

try {
  // Read Employees
  let employeeMap = new Map();
  let employeeBranchMap = new Map(); // name -> branchName (to help map customers)

  if (fs.existsSync(EMPLOYEE_FILE)) {
    const employeeWb = XLSX.readFile(EMPLOYEE_FILE);
    const employeeWs = employeeWb.Sheets[employeeWb.SheetNames[0]];
    const employees = XLSX.utils.sheet_to_json(employeeWs);
    
    employees.forEach(e => {
      const normName = normalizeName(e.name);
      const normUsername = normalizeName(e.username);
      const branchName = cleanBranchName(e.branchName || e.warehouseName);
      const normBranch = normalizeName(branchName);
      
      // Full key for precise lookup
      const fullKey = `${normBranch}|${normName}`;
      employeeMap.set(fullKey, e);
      
      // Fallback keys
      if (!employeeMap.has(normName) || e.role === 'SALES') {
        employeeMap.set(normName, e);
      }
      if (normUsername) {
        employeeMap.set(normUsername, e);
      }

      // Branch lookup for customers
      if (!employeeBranchMap.has(normName) || e.role === 'SALES') {
        employeeBranchMap.set(normName, branchName);
      }
    });
    console.log(`Loaded ${employees.length} employees.`);
  }

  // Read Customers
  const customerWb = XLSX.readFile(CUSTOMER_FILE);
  const customerWs = customerWb.Sheets[customerWb.SheetNames[0]];
  const customers = XLSX.utils.sheet_to_json(customerWs);
  
  const customerMap = new Map();
  customers.forEach(c => {
    const normName = normalizeName(c.name);
    const normSupplier = normalizeName(c.supplier);
    const branchName = employeeBranchMap.get(normSupplier) || '';
    const normBranch = normalizeName(branchName);
    
    const loc = extractLatLng(c.maps);
    const customerData = {
      ...c,
      lat: loc.lat,
      long: loc.long,
      branchName: branchName
    };

    // Composite key: branch|salesman|customer
    const compositeKey = `${normBranch}|${normSupplier}|${normName}`;
    customerMap.set(compositeKey, customerData);
    
    // Also store by salesman|customer for fallback
    const salesmanKey = `${normSupplier}|${normName}`;
    if (!customerMap.has(salesmanKey)) {
      customerMap.set(salesmanKey, customerData);
    }

    // Still keep global name fallback if absolutely necessary
    if (!customerMap.has(normName)) {
      customerMap.set(normName, customerData);
    }
  });
  console.log(`Loaded ${customers.length} customers.`);

  // Read BQ (Penjualan)
  const bqWb = XLSX.readFile(BQ_FILE);
  const bqWs = bqWb.Sheets[bqWb.SheetNames[0]];
  const bqRows = XLSX.utils.sheet_to_json(bqWs);

  console.log(`Processing ${bqRows.length} transaction rows...`);

  // Phase 1: Calculate max qty per customer
  const customerMaxQty = new Map(); // normalizedName -> maxQty
  bqRows.forEach(row => {
    const normToko = normalizeName(row.toko);
    const qty = Number(row.qty) || 0;
    const currentMax = customerMaxQty.get(normToko) || 0;
    if (qty > currentMax) {
      customerMaxQty.set(normToko, qty);
    }
  });

  const getCategory = (maxQty) => {
    if (maxQty >= 800) return 'WS (Agen Besar)';
    if (maxQty >= 100) return 'SA (Agen Kecil)';
    return 'Retail';
  };

  // Phase 2: Map transactions
  const resultRows = [];
  bqRows.forEach(row => {
    const normToko = normalizeName(row.toko);
    const normSales = normalizeName(row.nama);
    const rawBranch = cleanBranchName(row.divisi);
    const normBranch = normalizeName(rawBranch);

    // Precise employee lookup
    let emp = employeeMap.get(`${normBranch}|${normSales}`);
    if (!emp) {
      emp = employeeMap.get(normSales);
    }

    // FILTER: If branchName is empty in employee.xlsx, skip transaction
    if (!emp || !emp.branchName) {
      return;
    }

    // Use branchName from employee.xlsx as the primary branch
    const empBranch = cleanBranchName(emp.branchName);
    const cabang = toProperCase(empBranch);

    // Precise lookup: branch|salesman|customer
    const compositeKey = `${normBranch}|${normSales}|${normToko}`;
    let cust = customerMap.get(compositeKey);
    
    // Fallback 1: salesman|customer
    if (!cust) {
      cust = customerMap.get(`${normSales}|${normToko}`);
    }
    
    // Fallback 2: customer name
    if (!cust) {
      cust = customerMap.get(normToko);
    }

    // Calculate customer category based on max qty
    const maxQty = customerMaxQty.get(normToko) || 0;
    const kategoriPelanggan = getCategory(maxQty);

    // Calculate total
    const qty = Number(row.qty) || 0;
    const harga = Number(row.harga) || 0;
    const diskon = Number(row.diskon) || 0;
    const total = (qty * harga) - diskon;

    // Address construction: use customer.xlsx if available, otherwise BQ.xlsx
    let alamat = '';
    let lat = '';
    let long = '';
    let telp = '';

    if (cust) {
      const parts = [
        cust.address,
        cust.village,
        cust.district,
        cust.city,
        cust.province
      ].filter(p => p && String(p).trim() !== '' && String(p) !== '0');
      alamat = parts.join(', ');
      lat = cust.lat;
      long = cust.long;
      telp = validatePhone(cust.phone);
    } else {
      alamat = `${row.alamat || ''}${row.kecamatan ? ', ' + row.kecamatan : ''}`;
      telp = validatePhone(row.telp);
    }

    resultRows.push({
      tanggal: formatToDBDateTime(row.waktu),
      created_at: formatToDBDateTime(row.waktu),
      pelanggan_created_at: formatToDBDateTime(cust ? cust.registered : ''),
      cabang: cabang,
      salesman: emp ? emp.name : row.nama,
      transaksi: row.transaksi,
      pelanggan: toProperCase(row.toko),
      kategori_pelanggan: kategoriPelanggan,
      alamat: toProperCase(alamat),
      lat: lat,
      long: long,
      telp: telp,
      note: row.catatan || '',
      produk: row.produk,
      qty: qty,
      harga: harga,
      promo: diskon,
      total: total
    });
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
