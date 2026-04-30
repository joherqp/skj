'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  FileUp, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, Database, Users, ShoppingCart, Building2, Package, Info
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useDatabase } from '@/contexts/DatabaseContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportRow {
  tanggal: string;
  created_at?: string;
  pelanggan_created_at?: string;
  cabang: string;
  salesman: string;
  transaksi: string;
  pelanggan: string;
  alamat: string;
  lat: string | number;
  long: string | number;
  telp?: string;
  note: string;
  produk: string;
  qty: number;
  harga: number;
  promo: number;
  total: number;
}

interface MappingResult {
  existing: boolean;
  id?: string;
  name: string;
  satuanId?: string;
}

// 1. Clean name for display/creation
const cleanCustomerName = (name: string): string => {
  if (!name) return '';
  let n = name.trim();

  // 1. Remove anything in parentheses (Bi), (In), (Av), etc.
  n = n.replace(/\([^)]*\)/g, '').trim();

  // 2. Remove common business and person prefixes/tags at the start
  // The user specifically mentioned "Mdr" and "Madura" as tags to remove
  const prefixes = [
    'toko', 'tk', 'pt', 'cv', 'ud', 'wr', 'warung', 'warkop', 'kedai', 'rm',
    'rumah makan', 'outlet', 'grosir', 'agen', 'madura', 'mdr', 'bpk', 'ibu',
    'pak', 'bu', 'teh', 'aa', 'kang', 'neng', 'haji', 'hajah', 'h', 'hj', 'rb'
  ];

  const prefixRegex = new RegExp(`^(${prefixes.join('|')})[\\s,.]+`, 'i');
  let prev;
  do {
    prev = n;
    n = n.replace(prefixRegex, '').trim();
  } while (n !== prev && n.length > 0);

  // If we cleaned it all the way to empty, go back to the previous state
  if (!n) n = prev;

  // 3. Remove common business and location suffixes at the end
  const suffixes = [
    'toko', 'tk', 'pt', 'cv', 'ud', 'wr', 'warung', 'warkop', 'jaya', 'makmur',
    'abadi', 'sentosa', 'motor', 'cell', 'cellular', 'com', 'computer', 'shop',
    'grosir', 'agen', 'madura', 'mdr',
    'bogor', 'sukabumi', 'rangkas', 'pandeglang', 'serang', 'banten', 'jabar',
    'jakarta', 'tangerang', 'bekasi', 'depok', 'cianjur', 'lebak'
  ];

  const suffixRegex = new RegExp(`[\\s,.-]+(${suffixes.join('|')})$`, 'i');
  do {
    prev = n;
    n = n.replace(suffixRegex, '').trim();
  } while (n !== prev && n.length > 0);

  if (!n) n = prev;

  // 4. Final clean up of extra spaces and punctuation
  return n.replace(/^[,.\-\s]+|[,.\-\s]+$/g, '').replace(/\s+/g, ' ').trim();
};

const normalizeCustomer = (name: string): string => {
  // More aggressive: remove ALL non-alphanumeric to catch variations like "Toko Maju" vs "Toko-Maju"
  return cleanCustomerName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

export default function ImportPenjualan() {
  const {
    cabang: dbCabang,
    users: dbUsers,
    pelanggan: dbPelanggan,
    barang: dbBarang,
    satuan: dbSatuan,
    kategori: dbKategori,
    kategoriPelanggan: dbKategoriPelanggan,
    area: dbArea,
    refresh
  } = useDatabase();

  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportRow[]>([]);
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const [mappings, setMappings] = useState<{
    cabang: Record<string, MappingResult>;
    salesman: Record<string, MappingResult>;
    pelanggan: Record<string, MappingResult>;
    produk: Record<string, MappingResult>;
  }>({
    cabang: {},
    salesman: {},
    pelanggan: {},
    produk: {}
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);
    setStatus('Membaca file...');

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (rawRows.length < 2) {
        throw new Error('File kosong atau format tidak sesuai');
      }

      // Identify column indices from header
      const headers = rawRows[0].map(h => String(h || '').trim().toLowerCase());
      const getIdx = (keys: string[]) => headers.findIndex(h => keys.includes(h));

      const idxMap = {
        tanggal: getIdx(['tanggal', 'date']),
        created_at: getIdx(['created_at', 'registered']),
        pelanggan_created_at: getIdx(['pelanggan_created_at', 'p_registered', 'pelanggan_create_at']),
        cabang: getIdx(['cabang', 'branch']),
        salesman: getIdx(['salesman', 'sales']),
        transaksi: getIdx(['transaksi', 'type', 'skema']),
        pelanggan: getIdx(['pelanggan', 'customer']),
        alamat: getIdx(['alamat', 'address']),
        lat: getIdx(['lat', 'latitude']),
        long: getIdx(['long', 'longitude', 'lng']),
        telp: getIdx(['telp', 'telepon', 'phone', 'telepon']),
        note: getIdx(['note', 'catatan', 'keterangan']),
        produk: getIdx(['produk', 'item', 'barang']),
        qty: getIdx(['qty', 'jumlah', 'quantity']),
        harga: getIdx(['harga', 'price']),
        promo: getIdx(['promo', 'diskon', 'discount']),
        total: getIdx(['total', 'subtotal'])
      };

      const normalizedData: ImportRow[] = rawRows.slice(1).map((row: any[]) => {
        const getVal = (idx: number) => (idx !== -1 ? row[idx] : undefined);

        return {
          tanggal: String(getVal(idxMap.tanggal) || ''),
          created_at: String(getVal(idxMap.created_at) || ''),
          pelanggan_created_at: String(getVal(idxMap.pelanggan_created_at) || ''),
          cabang: String(getVal(idxMap.cabang) || '').trim(),
          salesman: String(getVal(idxMap.salesman) || '').trim(),
          transaksi: String(getVal(idxMap.transaksi) || '').trim(),
          pelanggan: String(getVal(idxMap.pelanggan) || '').trim(),
          alamat: String(getVal(idxMap.alamat) || '').trim(),
          lat: getVal(idxMap.lat),
          long: getVal(idxMap.long),
          telp: String(getVal(idxMap.telp) || '').trim(),
          note: String(getVal(idxMap.note) || '').trim(),
          produk: String(getVal(idxMap.produk) || '').trim(),
          qty: Number(getVal(idxMap.qty)) || 0,
          harga: Number(getVal(idxMap.harga)) || 0,
          promo: Number(getVal(idxMap.promo)) || 0,
          total: Number(getVal(idxMap.total)) || 0,
        };
      });

      setData(normalizedData);
      analyzeMappings(normalizedData);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membaca file');
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeMappings = (rows: ImportRow[]) => {
    const isSimilar = (a: string, b: string) => {
      if (!a || !b) return false;
      const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanA === cleanB) return true;
      if (cleanA.length > 3 && cleanB.length > 3) {
        return cleanA.includes(cleanB) || cleanB.includes(cleanA);
      }
      return false;
    };

    const newMappings = {
      cabang: {} as Record<string, MappingResult>,
      salesman: {} as Record<string, MappingResult>,
      pelanggan: {} as Record<string, MappingResult>,
      produk: {} as Record<string, MappingResult>
    };

    // Pre-normalize DB customers for faster lookup
    const dbPelangganMap = new Map();
    dbPelanggan.forEach(p => {
      const key = normalizeCustomer(p.nama);
      if (!dbPelangganMap.has(key)) dbPelangganMap.set(key, p);
    });

    rows.forEach(row => {
      // Cabang
      const cabangName = row.cabang?.trim();
      if (cabangName) {
        const lowerCabang = cabangName.toLowerCase();
        if (!newMappings.cabang[lowerCabang]) {
          const found = dbCabang.find(c => c.nama.toLowerCase() === lowerCabang) ||
            dbCabang.find(c => isSimilar(c.nama, lowerCabang));
          newMappings.cabang[lowerCabang] = {
            existing: !!found,
            id: found?.id,
            name: found?.nama || cabangName
          };
        }
      }

      // Salesman
      const salesmanName = row.salesman?.trim();
      if (salesmanName) {
        const lowerSales = salesmanName.toLowerCase();
        if (!newMappings.salesman[lowerSales]) {
          const found = dbUsers.find(u => 
            u.nama.toLowerCase() === lowerSales || 
            (u.username && u.username.toLowerCase() === lowerSales)
          ) || dbUsers.find(u => 
            isSimilar(u.nama, lowerSales) || 
            (u.username && isSimilar(u.username, lowerSales))
          );
          newMappings.salesman[lowerSales] = {
            existing: !!found,
            id: found?.id,
            name: found?.nama || salesmanName
          };
        }
      }

      // Pelanggan - Smarter mapping to prevent duplicates from CSV
      const pelangganName = row.pelanggan?.trim();
      if (pelangganName) {
        const normKey = normalizeCustomer(pelangganName);
        if (!newMappings.pelanggan[normKey]) {
          // Try exact match first, then normalized match
          const found = dbPelanggan.find(p => p.nama.toLowerCase() === pelangganName.toLowerCase()) ||
            dbPelangganMap.get(normKey);

          newMappings.pelanggan[normKey] = {
            existing: !!found,
            id: found?.id,
            name: found?.nama || cleanCustomerName(pelangganName)
          };
        }
      }

      // Produk
      const produkName = row.produk?.trim();
      if (produkName) {
        const lowerProd = produkName.toLowerCase();
        if (!newMappings.produk[lowerProd]) {
          const found = dbBarang.find(b =>
            b.nama.toLowerCase() === lowerProd ||
            b.kode?.toLowerCase() === lowerProd
          ) || dbBarang.find(b => isSimilar(b.nama, lowerProd) || (b.kode && isSimilar(b.kode, lowerProd)));

          newMappings.produk[lowerProd] = {
            existing: !!found,
            id: found?.id,
            name: found?.nama || produkName,
            satuanId: found?.satuanId
          };
        }
      }
    });

    setMappings(newMappings);
  };

  const executeImport = async () => {
    setIsProcessing(true);
    setStep(3);
    setProgress(0);
    setStatus('Menyiapkan data master...');

    try {
      // 1. Create missing master data
      const finalMappings = JSON.parse(JSON.stringify(mappings));

      // Create a lookup map for the first occurrence of each entity in CSV data
      // This avoids O(N^2) data.find() calls inside the batch loops
      const firstRowPerCabang: Record<string, any> = {};
      const firstRowPerSales: Record<string, any> = {};
      const firstRowPerProduk: Record<string, any> = {};
      const firstRowPerPelanggan: Record<string, any> = {};

      data.forEach(row => {
        if (row.cabang && !firstRowPerCabang[row.cabang]) firstRowPerCabang[row.cabang] = row;
        if (row.salesman && !firstRowPerSales[row.salesman]) firstRowPerSales[row.salesman] = row;
        if (row.produk && !firstRowPerProduk[row.produk]) firstRowPerProduk[row.produk] = row;
        if (row.pelanggan && !firstRowPerPelanggan[row.pelanggan]) firstRowPerPelanggan[row.pelanggan] = row;
      });

      // Get defaults
      const defaultSatuanId = dbSatuan[0]?.id || crypto.randomUUID();
      const defaultKategoriId = dbKategori[0]?.id || crypto.randomUUID();
      const defaultKategoriPelangganId = dbKategoriPelanggan[0]?.id || crypto.randomUUID();
      const defaultAreaId = dbArea[0]?.id || crypto.randomUUID();
      const defaultCabangId = dbCabang[0]?.id || crypto.randomUUID();
      const defaultSalesId = dbUsers.find(u => u.roles.includes('sales'))?.id || dbUsers[0]?.id || crypto.randomUUID();
      const defaultPelangganId = dbPelanggan[0]?.id || crypto.randomUUID();
      const defaultBarangId = dbBarang[0]?.id || crypto.randomUUID();

      // Progress allocation: 
      // 0-5%: Cabang, Sales, Produk
      // 5-25%: Pelanggan (can be many)
      // 25-100%: Transactions

      // ... (existing batch creation logic) ...

      // --- 1a. Create missing Cabang (Batch) ---
      setStatus('Membuat data Cabang baru...');
      setProgress(2);
      const newCabangList = Object.keys(finalMappings.cabang)
        .filter(name => !finalMappings.cabang[name].existing);

      if (newCabangList.length > 0) {
        const cabData = newCabangList.map(name => ({
          nama: name,
          alamat: '-',
          kota: '-',
          telepon: '-',
          area_id: defaultAreaId
        }));
        const { data: res, error } = await supabase.from('cabang').insert(cabData).select();
        if (error) throw error;
        res?.forEach(c => {
          finalMappings.cabang[c.nama] = { existing: true, id: c.id, name: c.nama };
        });
      }

      // --- 1b. Create missing Salesman (Batch) ---
      setStatus('Membuat data Salesman baru...');
      setProgress(3);
      const newSalesList = Object.keys(finalMappings.salesman)
        .filter(name => !finalMappings.salesman[name].existing);

      if (newSalesList.length > 0) {
        const salesData = newSalesList.map(name => {
          const salesmanRow = firstRowPerSales[finalMappings.salesman[name].name];
          const cabangId = finalMappings.cabang[salesmanRow?.cabang?.toLowerCase() || '']?.id || defaultCabangId;
          const username = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 5);
          return {
            nama: finalMappings.salesman[name].name,
            username,
            email: username + '@skj.com',
            telepon: '-',
            roles: ['sales'],
            cabang_id: cabangId,
            is_active: false
          };
        });
        const { data: res, error } = await supabase.from('users').insert(salesData).select();
        if (error) throw error;
        res?.forEach(u => {
          finalMappings.salesman[u.nama.toLowerCase()] = { existing: true, id: u.id, name: u.nama };
        });
      }

      // --- 1c. Create missing Produk (Batch) ---
      setStatus('Membuat data Produk baru...');
      setProgress(4);
      const newProdList = Object.keys(finalMappings.produk)
        .filter(name => !finalMappings.produk[name].existing);

      if (newProdList.length > 0) {
        const prodData = newProdList.map(name => ({
          nama: name,
          kode: name.substring(0, 10).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
          kategori_id: defaultKategoriId,
          satuan_id: defaultSatuanId,
          harga_beli: 0,
          harga_jual: firstRowPerProduk[name]?.harga || 0,
          is_active: false
        }));
        const { data: res, error } = await supabase.from('barang').insert(prodData).select();
        if (error) throw error;
        res?.forEach(p => {
          finalMappings.produk[p.nama.toLowerCase()] = {
            existing: true,
            id: p.id,
            name: p.nama,
            satuanId: p.satuan_id
          };
        });
      }

      // --- 1d. Create missing Pelanggan (Batch in chunks) ---
      setStatus('Membuat data Pelanggan baru...');
      const newPelList = Object.keys(finalMappings.pelanggan)
        .filter(name => !finalMappings.pelanggan[name].existing);

      if (newPelList.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < newPelList.length; i += chunkSize) {
          const chunk = newPelList.slice(i, i + chunkSize);
          const pelData = chunk.map(name => {
            const originalName = finalMappings.pelanggan[name].name;
            const row = firstRowPerPelanggan[originalName];
            const cabangId = finalMappings.cabang[row?.cabang?.toLowerCase() || '']?.id || defaultCabangId;
            const salesId = finalMappings.salesman[row?.salesman?.toLowerCase() || '']?.id || defaultSalesId;

            // Normalize phone: only digits, min 7
            let cleanPhone = row?.telp?.toString().replace(/\D/g, '') || '';
            if (cleanPhone.length < 7) cleanPhone = '-';

            // Date handling for pelanggan
            let pelCreatedAt = new Date().toISOString();
            const rawPelDate = row?.pelanggan_created_at || row?.created_at;
            if (rawPelDate) {
              const d = new Date(rawPelDate);
              if (!isNaN(d.getTime())) pelCreatedAt = d.toISOString();
            }

            return {
              nama: originalName,
              alamat: row?.alamat || '-',
              telepon: cleanPhone,
              cabang_id: cabangId,
              sales_id: salesId,
              kategori_id: defaultKategoriPelangganId,
              kode: originalName.substring(0, 5).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
              lokasi: {
                alamat: row?.alamat || '-',
                latitude: Number(row?.lat) || 0,
                longitude: Number(row?.long) || 0
              },
              is_active: true,
              sisa_kredit: 0,
              created_at: pelCreatedAt
            };
          });
          const { data: res, error } = await supabase.from('pelanggan').insert(pelData).select();
          if (error) throw error;
          res?.forEach(p => {
            const normKey = normalizeCustomer(p.nama);
            finalMappings.pelanggan[normKey] = { existing: true, id: p.id, name: p.nama };
          });

          const pelProgress = Math.min(5 + Math.round(((i + chunk.length) / newPelList.length) * 20), 25);
          setProgress(pelProgress);
          setStatus(`Membuat data Pelanggan baru (${Math.min(i + chunk.length, newPelList.length)} / ${newPelList.length})...`);
        }
      }
      setProgress(25);

      // Fetch Promos for mapping "transaksi" to "skema/promo"
      const { data: promos } = await supabase.from('promo').select('*');

      // Helper to parse DD/MM/YYYY as UTC to prevent timezone shifts
      // Helper to parse dates as UTC to prevent timezone shifts
      const parseCSVDate = (val: any) => {
        if (!val) return new Date();

        // If XLSX already parsed it as a Date object, use its components directly
        if (val instanceof Date) {
          return new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()));
        }

        const dateStr = String(val).trim();
        if (!dateStr) return new Date();

        // Handle Excel numeric dates (serial numbers)
        if (!isNaN(Number(dateStr)) && Number(dateStr) > 40000) {
          const excelDate = new Date((Number(dateStr) - 25569) * 86400 * 1000);
          return new Date(Date.UTC(excelDate.getFullYear(), excelDate.getMonth(), excelDate.getDate()));
        }

        // Handle string formats: prioritizing DD/MM/YYYY
        // Supported delimiters: / - .
        const parts = dateStr.split(/[/\-.\s]/);
        if (parts.length >= 3) {
          let p0 = parseInt(parts[0], 10);
          let p1 = parseInt(parts[1], 10);
          let p2 = parseInt(parts[2], 10);

          let day, month, year;

          if (p2 > 1000) { // Format: DD/MM/YYYY or MM/DD/YYYY
            year = p2;
            // Always assume DD/MM/YYYY for the user's data
            day = p0;
            month = p1 - 1;
          } else if (p0 > 1000) { // Format: YYYY/MM/DD
            year = p0;
            month = p1 - 1;
            day = p2;
          } else { // Format: DD/MM/YY
            year = p2 < 50 ? 2000 + p2 : 1900 + p2;
            day = p0;
            month = p1 - 1;
          }

          // Validate date components
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12 && day > 0 && day <= 31) {
            const result = new Date(Date.UTC(year, month, day));
            return result;
          }
        }

        // Final fallback: native Date parser
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        }

        console.error('Failed to parse date:', dateStr);
        return new Date();
      };

      // 2. Import Penjualan in batches
      setStatus('Mengimport transaksi penjualan...');
      const batchSize = 100;

      // Filter out rows with missing critical data to avoid crashes
      const validData = data.filter(row => row.pelanggan?.trim() && row.produk?.trim());

      for (let i = 0; i < validData.length; i += batchSize) {
        const batch = validData.slice(i, i + batchSize);
        const penjualanBatch = batch.map((row, idx) => {
          const pKey = row.produk?.trim()?.toLowerCase();
          const custKey = row.pelanggan?.trim()?.toLowerCase();
          const salesName = row.salesman?.trim();
          const cabName = row.cabang?.trim();

          // Find matching promo for "transaksi" column (Skema)
          const transaksiClean = row.transaksi?.trim()?.toLowerCase();
          const matchingPromo = promos?.find(p =>
            p.nama.toLowerCase() === transaksiClean ||
            p.kode?.toLowerCase() === transaksiClean
          );

          const items = [{
            id: crypto.randomUUID(),
            barangId: finalMappings.produk[pKey]?.id || defaultBarangId,
            jumlah: row.qty || 0,
            satuanId: finalMappings.produk[pKey]?.satuanId || defaultSatuanId,
            harga: row.harga || 0,
            diskon: row.promo || 0,
            subtotal: row.total || 0,
            promoId: matchingPromo?.id || null
          }];

          const isLunas = transaksiClean !== 'tempo';

          const normCustKey = normalizeCustomer(row.pelanggan || '');

          const rowDate = parseCSVDate(row.tanggal);
          const dateStr = rowDate.toISOString().split('T')[0].replace(/-/g, '');

          // Use created_at if available and valid, otherwise fallback to rowDate
          let createdAtDate = rowDate;
          if (row.created_at) {
            const d = new Date(row.created_at);
            if (!isNaN(d.getTime())) {
              createdAtDate = d;
            }
          }

          return {
            tanggal: rowDate.toISOString(),
            created_at: createdAtDate.toISOString(),
            pelanggan_id: finalMappings.pelanggan[normCustKey]?.id || defaultPelangganId,
            sales_id: finalMappings.salesman[row.salesman?.trim()?.toLowerCase()]?.id || defaultSalesId,
            cabang_id: finalMappings.cabang[row.cabang?.trim()?.toLowerCase()]?.id || defaultCabangId,
            status: isLunas ? 'lunas' : 'tempo',
            subtotal: (row.total || 0) + (row.promo || 0),
            diskon: row.promo || 0,
            total: row.total || 0,
            bayar: isLunas ? (row.total || 0) : 0,
            kembalian: 0,
            is_lunas: isLunas,
            metode_pembayaran: transaksiClean === 'tunai' ? 'tunai' : (transaksiClean === 'tempo' ? 'tempo' : 'transfer'),
            items: items,
            nomor_nota: `INV/${dateStr}-${i + idx + 1}`,
            catatan: row.note || (matchingPromo ? `Promo: ${matchingPromo.nama}` : 'Import data'),
            lokasi: {
              alamat: row.alamat || '-',
              latitude: Number(row.lat) || 0,
              longitude: Number(row.long) || 0
            }
          };
        });

        const { error } = await supabase.from('penjualan').insert(penjualanBatch);
        if (error) throw error;

        const currentProgress = Math.min(25 + Math.round(((i + batch.length) / validData.length) * 75), 100);
        setProgress(currentProgress);
        setStatus(`Mengimport ${Math.min(i + batch.length, validData.length)} dari ${validData.length} transaksi...`);
      }

      toast.success('Import berhasil!');
      setStatus('Import selesai!');
      await refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat import');
      setStatus('Import terhenti karena kesalahan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const mappingSummary = useMemo(() => {
    const summary = {
      cabang: { total: 0, new: 0 },
      salesman: { total: 0, new: 0 },
      pelanggan: { total: 0, new: 0 },
      produk: { total: 0, new: 0 },
    };

    // Use Set to count unique mapping objects (since multiple CSV names can map to the same entity)
    const uniqueCabang = new Set(Object.values(mappings.cabang));
    uniqueCabang.forEach(m => { summary.cabang.total++; if (!m.existing) summary.cabang.new++; });

    const uniqueSalesman = new Set(Object.values(mappings.salesman));
    uniqueSalesman.forEach(m => { summary.salesman.total++; if (!m.existing) summary.salesman.new++; });

    const uniquePelanggan = new Set(Object.values(mappings.pelanggan));
    uniquePelanggan.forEach(m => { summary.pelanggan.total++; if (!m.existing) summary.pelanggan.new++; });

    const uniqueProduk = new Set(Object.values(mappings.produk));
    uniqueProduk.forEach(m => { summary.produk.total++; if (!m.existing) summary.produk.new++; });

    return summary;
  }, [mappings]);

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-primary/10">
          <ShoppingCart className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Penjualan</h1>
          <p className="text-muted-foreground">Migrasi data transaksi penjualan dari file CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card className="border-dashed border-2">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-full bg-primary/5">
              <FileUp className="w-12 h-12 text-primary animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">Unggah File CSV</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Pastikan file memiliki kolom: tanggal, cabang, salesman, transaksi, pelanggan, alamat, lat, long, telp, produk, qty, harga, promo, total
              </p>
            </div>
            <div className="w-full max-w-xs pt-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isProcessing}
                className="w-full h-12 text-lg rounded-xl"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <FileUp className="w-5 h-5 mr-2" />
                )}
                Pilih File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisis Data</CardTitle>
              <CardDescription>
                Ditemukan {data.length} baris transaksi. Berikut adalah ringkasan pemetaan data master.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MappingCard
                  icon={Building2}
                  label="Cabang"
                  total={mappingSummary.cabang.total}
                  newCount={mappingSummary.cabang.new}
                />
                <MappingCard
                  icon={Users}
                  label="Salesman"
                  total={mappingSummary.salesman.total}
                  newCount={mappingSummary.salesman.new}
                />
                <MappingCard
                  icon={Users}
                  label="Pelanggan"
                  total={mappingSummary.pelanggan.total}
                  newCount={mappingSummary.pelanggan.new}
                />
                <MappingCard
                  icon={Package}
                  label="Produk"
                  total={mappingSummary.produk.total}
                  newCount={mappingSummary.produk.new}
                />
              </div>

              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4" />
                Pratinjau Data (5 Baris Pertama)
              </h4>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="p-3 border-b font-semibold">Tanggal</th>
                      <th className="p-3 border-b font-semibold">Nama CSV (Original)</th>
                      <th className="p-3 border-b font-semibold">Nama Sistem (Hasil Clean)</th>
                      <th className="p-3 border-b font-semibold">Produk</th>
                      <th className="p-3 border-b font-semibold text-right">Qty</th>
                      <th className="p-3 border-b font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 5).map((row, i) => {
                      const rawCust = row.pelanggan || '';
                      const cleanCust = cleanCustomerName(rawCust);
                      const normCust = normalizeCustomer(rawCust);
                      const isNewPel = !mappings.pelanggan[normCust]?.existing;
                      const isNewProd = !mappings.produk[row.produk?.toLowerCase() || '']?.existing;

                      return (
                        <tr key={i} className="hover:bg-muted/50 transition-colors">
                          <td className="p-3 border-b whitespace-nowrap">{row.tanggal}</td>
                          <td className="p-3 border-b text-muted-foreground">{rawCust}</td>
                          <td className="p-3 border-b">
                            <div className="flex flex-col min-w-[150px]">
                              <span className="font-semibold text-blue-900">{cleanCust}</span>
                              {isNewPel ? (
                                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-tight flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600" /> + Baru (Belum Terdaftar)
                                </span>
                              ) : (
                                <span className="text-[10px] text-green-600 font-bold uppercase tracking-tight flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-600" /> ✓ Sudah Terdaftar
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border-b">
                            <div className="flex flex-col min-w-[120px]">
                              <span className="line-clamp-1">{row.produk}</span>
                              {isNewProd ? (
                                <span className="text-[10px] text-amber-500 italic">Produk Baru</span>
                              ) : (
                                <span className="text-[10px] text-blue-500 italic">Produk Terdaftar</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border-b text-right font-mono font-semibold">{row.qty}</td>
                          <td className="p-3 border-b text-right font-bold text-blue-700">
                            Rp {row.total?.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {mappingSummary.pelanggan.new > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Review Pelanggan Baru (Sampling 10 dari {mappingSummary.pelanggan.new})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-muted/20 rounded-xl border border-dashed">
                    {Object.keys(mappings.pelanggan)
                      .filter(key => !mappings.pelanggan[key].existing)
                      .slice(0, 10)
                      .map((key, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border shadow-sm">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold">{mappings.pelanggan[key].name}</span>
                            <span className="text-[9px] text-muted-foreground uppercase">Key: {key}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {Object.values(mappingSummary).some(s => s.new > 0) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-900">Konfirmasi Pembuatan Data Baru</p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Terdapat data master baru yang akan dibuat otomatis. Mohon pastikan tidak ada duplikasi nama:
                      <ul className="list-disc ml-4 mt-1 space-y-0.5">
                        {mappingSummary.cabang.new > 0 && <li><strong>{mappingSummary.cabang.new}</strong> Cabang Baru</li>}
                        {mappingSummary.salesman.new > 0 && <li><strong>{mappingSummary.salesman.new}</strong> Salesman Baru</li>}
                        {mappingSummary.pelanggan.new > 0 && <li><strong>{mappingSummary.pelanggan.new}</strong> Pelanggan Baru (Gunakan tabel review di atas)</li>}
                        {mappingSummary.produk.new > 0 && <li><strong>{mappingSummary.produk.new}</strong> Produk Baru</li>}
                      </ul>
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Konfirmasi Import</p>
                  <p className="text-xs text-primary/80">
                    Sebanyak <span className="font-bold">{data.length.toLocaleString()}</span> transaksi penjualan siap untuk diimport.
                    Pastikan kolom <span className="font-bold">Tanggal</span> pada pratinjau di atas sudah terlihat benar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isProcessing}>
              Kembali
            </Button>
            <Button onClick={executeImport} disabled={isProcessing} className="px-10">
              Mulai Import <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="overflow-hidden">
          <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              {progress === 100 ? (
                <CheckCircle2 className="w-20 h-20 text-green-500 animate-in zoom-in" />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="p-6 rounded-full bg-primary/5 relative">
                    <Database className="w-12 h-12 text-primary animate-pulse" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="w-full max-w-md space-y-2 text-center">
              <div className="flex justify-between text-sm font-medium">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {progress === 100 ? (
              <Button onClick={() => window.location.href = '/penjualan'} className="rounded-xl">
                Lihat Transaksi Penjualan
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground animate-pulse">
                Mohon jangan tutup halaman ini sampai proses selesai...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MappingCard({ icon: Icon, label, total, newCount }: { icon: any, label: string, total: number, newCount: number }) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold">{total}</span>
        {newCount > 0 ? (
          <span className="text-[10px] text-amber-600 font-medium">+{newCount} baru</span>
        ) : (
          <span className="text-[10px] text-green-600 font-medium">Semua cocok</span>
        )}
      </div>
    </div>
  );
}
