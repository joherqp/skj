#!/bin/bash

if [ -f "supabase/datalama/excel/BQ.xlsx" ] && [ -f "supabase/datalama/excel/customer.xlsx" ] && [ -f "supabase/datalama/excel/employee.xlsx" ]; then
  echo "Ditemukan file Excel (BQ.xlsx, customer.xlsx, employee.xlsx). Menggunakan sumber data Excel..."
  node scripts/process_excel_to_csv.cjs
  
  if [ -f "supabase/datalama/excel/po-data.xlsx" ]; then
    echo "Ditemukan file PO data (po-data.xlsx). Mengekstrak mutasi barang..."
    node scripts/process_po_to_csv.cjs
  fi

  if [ -f "supabase/datalama/excel/Stok_akhir.xlsx" ]; then
    echo "Ditemukan file Stok akhir (Stok_akhir.xlsx). Mengekstrak data stok..."
    node scripts/process_stok_to_csv.cjs
  fi
else
  echo "Menggunakan sumber data SQL dump..."
  echo "Membuat database SQLite sementara..."
  sqlite3 temp_import.db <<EOF
  CREATE TABLE IF NOT EXISTS profile (id TEXT, name TEXT, gender TEXT, birth_place TEXT, birthdate TEXT, religion TEXT, modificated TEXT, registered TEXT);
  CREATE TABLE IF NOT EXISTS branch (id TEXT, profile_id TEXT, warehouse_id TEXT, modificated TEXT, registered TEXT);
  CREATE TABLE IF NOT EXISTS customer_view (id TEXT, profile_id TEXT, name TEXT, supplier_id TEXT, supplier_name TEXT, pic_name TEXT, status TEXT, registered TEXT, phone TEXT, email TEXT, address TEXT, village TEXT, district TEXT, city TEXT, province TEXT, postal_code TEXT, latitude TEXT, longitude TEXT, account_no TEXT, account_bank TEXT, branch_id TEXT, warehouse_id TEXT);
  CREATE TABLE IF NOT EXISTS transaction_view (id TEXT, operator_id TEXT, operator_name TEXT, source_id TEXT, source_name TEXT, beneficiary_id TEXT, beneficiary_name TEXT, branch_id TEXT, warehouse_id TEXT, type TEXT, status TEXT, amount TEXT, total_amount TEXT, payment_amount TEXT, return_amount TEXT, note TEXT, reference_id TEXT, registered TEXT);
  CREATE TABLE IF NOT EXISTS inventory_movement_view (id TEXT, transaction_id TEXT, product_id TEXT, product_name TEXT, type TEXT, qty_before TEXT, qty_after TEXT, price TEXT, qty TEXT, qty_return TEXT, unit TEXT, price_transaction TEXT, qty_transaction TEXT, unit_transaction TEXT, registered TEXT, reference_id TEXT, warehouse_id TEXT, branch_id TEXT, transaction_type TEXT);
  CREATE TABLE IF NOT EXISTS product (id TEXT, code TEXT, name TEXT, unit TEXT, price TEXT, modificated TEXT, registered TEXT, status TEXT);
  CREATE TABLE IF NOT EXISTS product_price (tier TEXT, warehouse_id TEXT, product_id TEXT, qty TEXT, price TEXT, modificated TEXT, registered TEXT);
EOF

  echo "Mengisi data dari file SQL dump..."
  # Mengabaikan error tabel tidak ditemukan dari tabel-tabel lainnya
  sqlite3 temp_import.db < "supabase/datalama/backup_lama.sql" > /dev/null 2>&1

  echo "Mengekstrak data penjualan ke import_penjualan.csv..."
  sqlite3 -header -csv temp_import.db "
  WITH ParsedTransactions AS (
    SELECT 
      t.id AS transaction_id,
      t.beneficiary_id,
      t.beneficiary_name,
      t.operator_name,
      t.payment_amount,
      t.total_amount,
      t.note,
      t.warehouse_id,
      t.branch_id,
      t.registered as raw_registered,
      substr(t.registered, 12, 4) || '-' || 
      CASE substr(t.registered, 5, 3)
        WHEN 'Jan' THEN '01' WHEN 'Feb' THEN '02' WHEN 'Mar' THEN '03' WHEN 'Apr' THEN '04'
        WHEN 'May' THEN '05' WHEN 'Jun' THEN '06' WHEN 'Jul' THEN '07' WHEN 'Aug' THEN '08'
        WHEN 'Sep' THEN '09' WHEN 'Oct' THEN '10' WHEN 'Nov' THEN '11' WHEN 'Dec' THEN '12'
      END || '-' || substr(t.registered, 9, 2) || ' ' || substr(t.registered, 17, 8) AS iso_registered
    FROM transaction_view t
    WHERE t.status = 'SUCCESS' AND t.type IN ('SS', 'SPOB', 'SPOS')
  ),
  CustomerFirstTransaction AS (
    SELECT 
      beneficiary_id,
      MIN(iso_registered) as first_transaction_date
    FROM ParsedTransactions
    GROUP BY beneficiary_id
  ),
  BaseData AS (
    SELECT 
      substr(t.iso_registered, 1, 10) AS tanggal,
      t.iso_registered AS created_at,
      cft.first_transaction_date AS pelanggan_created_at,
      CASE 
        WHEN p.name LIKE 'Wilayah %' THEN UPPER(SUBSTR(p.name, 9, 1)) || SUBSTR(p.name, 10)
        WHEN p.name LIKE 'wilayah %' THEN UPPER(SUBSTR(p.name, 9, 1)) || SUBSTR(p.name, 10)
        ELSE p.name 
      END AS cabang,
      t.operator_name AS salesman,
      CASE WHEN CAST(t.payment_amount AS REAL) >= CAST(t.total_amount AS REAL) THEN 'tunai' ELSE 'tempo' END AS transaksi,
      t.beneficiary_name AS pelanggan,
      COALESCE(c.address, '') || 
        CASE WHEN c.village IS NOT NULL AND c.village != '' THEN ', ' || c.village ELSE '' END || 
        CASE WHEN c.district IS NOT NULL AND c.district != '' THEN ', ' || c.district ELSE '' END || 
        CASE WHEN c.city IS NOT NULL AND c.city != '' THEN ', ' || c.city ELSE '' END || 
        CASE WHEN c.province IS NOT NULL AND c.province != '' THEN ', ' || c.province ELSE '' END AS alamat,
      CAST(NULLIF(c.latitude, '') AS REAL) AS lat,
      CAST(NULLIF(c.longitude, '') AS REAL) AS long,
      c.phone AS telp,
      t.note AS note,
      i.product_id,
      i.product_name AS produk,
      i.qty AS qty,
      CAST(i.price AS REAL) as price_orig,
      CAST(i.price_transaction AS REAL) as total_orig,
      t.warehouse_id
    FROM ParsedTransactions t
    JOIN inventory_movement_view i ON t.transaction_id = i.transaction_id
    LEFT JOIN customer_view c ON t.beneficiary_id = c.id
    LEFT JOIN CustomerFirstTransaction cft ON t.beneficiary_id = cft.beneficiary_id
    LEFT JOIN branch b ON t.branch_id = b.id
    LEFT JOIN profile p ON b.profile_id = p.id
    WHERE i.type = 'OUT'
  )
  SELECT 
    tanggal, 
    created_at, 
    pelanggan_created_at, 
    cabang, 
    salesman, 
    transaksi, 
    pelanggan, 
    alamat, 
    lat, 
    long, 
    telp, 
    note, 
    produk, 
    qty,
    CASE 
      WHEN price_orig > 0 THEN price_orig
      WHEN total_orig > 0 AND CAST(qty AS REAL) > 0 THEN ROUND(total_orig / CAST(qty AS REAL), 2)
      ELSE COALESCE(
        (SELECT CAST(price AS REAL) FROM product WHERE product.id = BaseData.product_id AND CAST(price AS REAL) > 0 LIMIT 1),
        (SELECT CAST(price AS REAL) FROM product_price WHERE product_price.product_id = BaseData.product_id AND product_price.warehouse_id = BaseData.warehouse_id AND CAST(price AS REAL) > 0 ORDER BY CAST(qty AS REAL) ASC LIMIT 1),
        (SELECT CAST(price AS REAL) FROM inventory_movement_view WHERE product_id = BaseData.product_id AND CAST(price AS REAL) > 0 ORDER BY registered DESC LIMIT 1),
        (SELECT CAST(price AS REAL) FROM product_price WHERE product_price.product_id = BaseData.product_id AND CAST(price AS REAL) > 0 ORDER BY CAST(qty AS REAL) ASC LIMIT 1),
        CASE 
          WHEN LOWER(produk) LIKE '%asbak%' OR LOWER(produk) LIKE '%korek%' THEN 1
          ELSE 0 
        END
      )
    END AS harga,
    0 AS promo,
    CASE 
      WHEN total_orig > 0 THEN total_orig
      ELSE ROUND(COALESCE(
        (SELECT CAST(price AS REAL) FROM product WHERE product.id = BaseData.product_id AND CAST(price AS REAL) > 0 LIMIT 1),
        (SELECT CAST(price AS REAL) FROM product_price WHERE product_price.product_id = BaseData.product_id AND product_price.warehouse_id = BaseData.warehouse_id AND CAST(price AS REAL) > 0 ORDER BY CAST(qty AS REAL) ASC LIMIT 1),
        (SELECT CAST(price AS REAL) FROM inventory_movement_view WHERE product_id = BaseData.product_id AND CAST(price AS REAL) > 0 ORDER BY registered DESC LIMIT 1),
        (SELECT CAST(price AS REAL) FROM product_price WHERE product_price.product_id = BaseData.product_id AND CAST(price AS REAL) > 0 ORDER BY CAST(qty AS REAL) ASC LIMIT 1),
        CASE 
          WHEN LOWER(produk) LIKE '%asbak%' OR LOWER(produk) LIKE '%korek%' THEN 1
          ELSE 0 
        END
      ) * CAST(qty AS REAL), 2)
    END AS total
  FROM BaseData
  ORDER BY created_at ASC;" > import_penjualan.csv

  echo "Pembersihan..."
  # rm temp_import.db
fi

echo "Selesai! File CSV berikut siap digunakan:"
echo "- import_penjualan.csv"
echo "- import_mutasi.csv"
echo "- stok-akhir.csv"
