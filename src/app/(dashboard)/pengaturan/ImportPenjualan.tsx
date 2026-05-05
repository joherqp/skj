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
  // Common
  tanggal: string;
  created_at?: string;
  cabang: string;
  note: string;
  produk: string;
  qty: number;

  // Penjualan specific
  pelanggan?: string;
  salesman?: string;
  transaksi?: string;
  kategori_pelanggan?: string;
  alamat?: string;
  lat?: string | number;
  long?: string | number;
  telp?: string;
  harga?: number;
  promo?: number;
  total?: number;
  pelanggan_created_at?: string;
}

interface StokRow {
  product: string;
  holder: string;
  qty: number;
  unit: string;
}

interface SaldoRow {
  karyawan: string;
  belumDibayar: number;
}

interface MappingResult {
  existing: boolean;
  id?: string;
  name: string;
  satuanId?: string;
  kodeUnik?: string;
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


  const [files, setFiles] = useState<{
    penjualan: File | null;
    stok: File | null;
    saldo: File | null;
  }>({
    penjualan: null,
    stok: null,
    saldo: null
  });

  const [data, setData] = useState<ImportRow[]>([]);
  const [stokData, setStokData] = useState<StokRow[]>([]);
  const [saldoData, setSaldoData] = useState<SaldoRow[]>([]);
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

  const parseFile = async (file: File, type: 'penjualan' | 'stok' | 'saldo') => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (rawRows.length < 2) return [];

    const headers = rawRows[0].map(h => String(h || '').trim().toLowerCase());
    const getIdx = (keys: string[]) => headers.findIndex(h => keys.includes(h));

    if (type === 'penjualan') {
      const idxMap = {
        tanggal: getIdx(['tanggal', 'date', 'waktu']),
        created_at: getIdx(['created_at', 'registered', 'waktu']),
        cabang: getIdx(['cabang', 'branch', 'divisi', 'cabang_asal']),
        note: getIdx(['note', 'catatan', 'keterangan']),
        produk: getIdx(['produk', 'item', 'barang']),
        qty: getIdx(['qty', 'jumlah', 'quantity']),
        pelanggan_created_at: getIdx(['pelanggan_created_at', 'p_registered', 'pelanggan_create_at']),
        salesman: getIdx(['salesman', 'sales', 'nama', 'operator']),
        transaksi: getIdx(['transaksi', 'type', 'skema']),
        pelanggan: getIdx(['pelanggan', 'customer', 'toko']),
        kategori_pelanggan: getIdx(['kategori_pelanggan', 'kategori', 'category', 'status_pelanggan']),
        alamat: getIdx(['alamat', 'address']),
        lat: getIdx(['lat', 'latitude']),
        long: getIdx(['long', 'longitude', 'lng']),
        telp: getIdx(['telp', 'telepon', 'phone']),
        harga: getIdx(['harga', 'price']),
        promo: getIdx(['promo', 'diskon', 'discount']),
        total: getIdx(['total', 'subtotal']),
      };

      return rawRows.slice(1).map((row: any[]) => {
        const getVal = (idx: number) => (idx !== -1 ? row[idx] : undefined);
        const formatExcelDate = (val: any) => {
          if (val === undefined || val === null || val === '') return '';
          if (typeof val === 'number' && val > 40000) {
            const d = new Date(Math.round((val - 25569) * 86400 * 1000));
            return d.toISOString().replace('T', ' ').split('.')[0];
          }
          return String(val);
        };
        const qty = Number(getVal(idxMap.qty)) || 0;
        const harga = Number(getVal(idxMap.harga)) || 0;
        const promo = Number(getVal(idxMap.promo)) || 0;

        return {
          tanggal: formatExcelDate(getVal(idxMap.tanggal)),
          created_at: formatExcelDate(getVal(idxMap.created_at)),
          cabang: String(getVal(idxMap.cabang) || '').trim(),
          note: String(getVal(idxMap.note) || '').trim(),
          produk: String(getVal(idxMap.produk) || '').trim(),
          qty: qty,
          pelanggan_created_at: formatExcelDate(getVal(idxMap.pelanggan_created_at)),
          salesman: String(getVal(idxMap.salesman) || '').trim(),
          transaksi: String(getVal(idxMap.transaksi) || 'Cash').trim(),
          pelanggan: String(getVal(idxMap.pelanggan) || '').trim(),
          kategori_pelanggan: String(getVal(idxMap.kategori_pelanggan) || 'Personal').trim(),
          alamat: String(getVal(idxMap.alamat) || '').trim(),
          lat: getVal(idxMap.lat),
          long: getVal(idxMap.long),
          telp: String(getVal(idxMap.telp) || '').trim(),
          harga: harga,
          promo: promo,
          total: Number(getVal(idxMap.total)) || (qty * harga - promo) || 0,
        };
      });
    } else if (type === 'stok') {
      const idxMap = {
        product: getIdx(['product', 'produk', 'item', 'barang']),
        holder: getIdx(['holder', 'pemegang', 'karyawan', 'salesman', 'sales']),
        qty: getIdx(['qty', 'jumlah', 'stok']),
        unit: getIdx(['unit', 'satuan'])
      };
      return rawRows.slice(1).map((row: any[]) => ({
        product: String(row[idxMap.product] || '').trim(),
        holder: String(row[idxMap.holder] || '').trim(),
        qty: Number(row[idxMap.qty]) || 0,
        unit: String(row[idxMap.unit] || '').trim()
      }));
    } else if (type === 'saldo') {
      const idxMap = {
        karyawan: getIdx(['karyawan', 'salesman', 'sales', 'user', 'name', 'nama']),
        belumDibayar: getIdx(['belum dibayar', 'saldo', 'balance', 'hutang'])
      };
      return rawRows.slice(1).map((row: any[]) => ({
        karyawan: String(row[idxMap.karyawan] || '').trim(),
        belumDibayar: Number(row[idxMap.belumDibayar]) || 0
      }));
    }
    return [];
  };

  const handleProcessAll = async () => {
    if (!files.penjualan) {
      toast.error('File Penjualan wajib diunggah untuk inisialisasi data master');
      return;
    }

    setIsProcessing(true);
    setStatus('Menganalisa semua file...');
    setProgress(10);

    try {
      const pData = await parseFile(files.penjualan, 'penjualan') as ImportRow[];
      setProgress(40);
      const sData = files.stok ? await parseFile(files.stok, 'stok') as StokRow[] : [];
      setProgress(60);
      const salData = files.saldo ? await parseFile(files.saldo, 'saldo') as SaldoRow[] : [];
      setProgress(80);

      setData(pData);
      setStokData(sData);
      setSaldoData(salData);

      const newMappings = {
        cabang: {} as Record<string, MappingResult>,
        salesman: {} as Record<string, MappingResult>,
        pelanggan: {} as Record<string, MappingResult>,
        produk: {} as Record<string, MappingResult>,
      };

      const isSimilar = (a: string, b: string, strict = false) => {
        if (!a || !b) return false;
        const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanA === cleanB) return true;
        if (!strict && cleanA.length > 3 && cleanB.length > 3) {
          return cleanA.includes(cleanB) || cleanB.includes(cleanA);
        }
        return false;
      };

      const dbPelangganMap = new Map();
      dbPelanggan.forEach(p => {
        const key = normalizeCustomer(p.nama);
        if (!dbPelangganMap.has(key)) dbPelangganMap.set(key, p);
      });

      // 1. Map from Penjualan (Primary Source)
      pData.forEach(row => {
        const cKey = row.cabang.toLowerCase();
        if (cKey && !newMappings.cabang[cKey]) {
          const found = dbCabang.find(c => c.nama.toLowerCase() === cKey) || dbCabang.find(c => isSimilar(c.nama, cKey));
          newMappings.cabang[cKey] = { existing: !!found, id: found?.id, name: found?.nama || row.cabang };
        }
        const sKey = row.salesman.toLowerCase();
        if (sKey && !newMappings.salesman[sKey]) {
          const found = dbUsers.find(u => u.nama.toLowerCase() === sKey || (u.username && u.username.toLowerCase() === sKey)) ||
            dbUsers.find(u => isSimilar(u.nama, sKey));
          newMappings.salesman[sKey] = { existing: !!found, id: found?.id, name: found?.nama || row.salesman, kodeUnik: (found as any)?.kode_unik };
        }
        const pKey = row.produk.toLowerCase();
        if (pKey && !newMappings.produk[pKey]) {
          const found = dbBarang.find(b => b.nama.toLowerCase() === pKey || b.kode?.toLowerCase() === pKey) ||
            dbBarang.find(b => isSimilar(b.nama, pKey, true));
          newMappings.produk[pKey] = { existing: !!found, id: found?.id, name: found?.nama || row.produk, satuanId: found?.satuanId };
        }
        const custKey = normalizeCustomer(row.pelanggan);
        if (custKey && !newMappings.pelanggan[custKey]) {
          const found = dbPelanggan.find(p => p.nama.toLowerCase() === row.pelanggan.toLowerCase()) || dbPelangganMap.get(custKey);
          newMappings.pelanggan[custKey] = { existing: !!found, id: found?.id, name: found?.nama || cleanCustomerName(row.pelanggan) };
        }
      });

      // 2. Map from Stok
      sData.forEach(row => {
        const sKey = row.holder.toLowerCase();
        if (sKey && !newMappings.salesman[sKey]) {
          const found = dbUsers.find(u => u.nama.toLowerCase() === sKey) || dbUsers.find(u => isSimilar(u.nama, sKey));
          newMappings.salesman[sKey] = { existing: !!found, id: found?.id, name: found?.nama || row.holder, kodeUnik: (found as any)?.kode_unik };
        }
        const pKey = row.product.toLowerCase();
        if (pKey && !newMappings.produk[pKey]) {
          const found = dbBarang.find(b => b.nama.toLowerCase() === pKey) || dbBarang.find(b => isSimilar(b.nama, pKey, true));
          newMappings.produk[pKey] = { existing: !!found, id: found?.id, name: found?.nama || row.product, satuanId: found?.satuanId };
        }
      });

      // 3. Map from Saldo
      salData.forEach(row => {
        const sKey = row.karyawan.toLowerCase();
        if (sKey && !newMappings.salesman[sKey]) {
          const found = dbUsers.find(u => u.nama.toLowerCase() === sKey) || dbUsers.find(u => isSimilar(u.nama, sKey));
          newMappings.salesman[sKey] = { existing: !!found, id: found?.id, name: found?.nama || row.karyawan };
        }
      });

      setMappings(newMappings);
      setProgress(100);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menganalisa file');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCSVDate = (val: any) => {
    if (!val) return new Date();
    if (val instanceof Date) {
      return new Date(Date.UTC(val.getFullYear(), val.getMonth(), val.getDate()));
    }
    const dateStr = String(val).trim();
    if (!dateStr) return new Date();
    if (!isNaN(Number(dateStr)) && Number(dateStr) > 40000) {
      const excelDate = new Date((Number(dateStr) - 25569) * 86400 * 1000);
      return new Date(Date.UTC(excelDate.getFullYear(), excelDate.getMonth(), excelDate.getDate()));
    }
    const parts = dateStr.split(/[/\-.\s]/);
    if (parts.length >= 3) {
      let p0 = parseInt(parts[0], 10);
      let p1 = parseInt(parts[1], 10);
      let p2 = parseInt(parts[2], 10);
      let day, month, year;
      if (p2 > 1000) { year = p2; day = p0; month = p1 - 1; }
      else if (p0 > 1000) { year = p0; month = p1 - 1; day = p2; }
      else { year = p2 < 50 ? 2000 + p2 : 1900 + p2; day = p0; month = p1 - 1; }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12 && day > 0 && day <= 31) {
        return new Date(Date.UTC(year, month, day));
      }
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : new Date();
  };

  const createMasterData = async (currentMappings: any) => {
    const finalMappings = JSON.parse(JSON.stringify(currentMappings));
    const firstRowPerCabang: Record<string, any> = {};
    const firstRowPerSales: Record<string, any> = {};
    const firstRowPerProduk: Record<string, any> = {};
    const firstRowPerPelanggan: Record<string, any> = {};

    data.forEach(row => {
      if (row.cabang) { const k = row.cabang.toLowerCase(); if (!firstRowPerCabang[k]) firstRowPerCabang[k] = row; }
      if (row.salesman) { const k = row.salesman.toLowerCase(); if (!firstRowPerSales[k]) firstRowPerSales[k] = row; }
      if (row.produk) { const k = row.produk.toLowerCase(); if (!firstRowPerProduk[k]) firstRowPerProduk[k] = row; }
      if (row.pelanggan) { const k = normalizeCustomer(row.pelanggan); if (!firstRowPerPelanggan[k]) firstRowPerPelanggan[k] = row; }
    });
    stokData.forEach(row => {
      if (row.holder) { const k = row.holder.toLowerCase(); if (!firstRowPerSales[k]) firstRowPerSales[k] = { ...row, salesman: row.holder }; }
      if (row.product) { const k = row.product.toLowerCase(); if (!firstRowPerProduk[k]) firstRowPerProduk[k] = { ...row, produk: row.product }; }
    });
    saldoData.forEach(row => {
      if (row.karyawan) { const k = row.karyawan.toLowerCase(); if (!firstRowPerSales[k]) firstRowPerSales[k] = { ...row, salesman: row.karyawan }; }
    });

    const defaultAreaId = dbArea[0]?.id || crypto.randomUUID();
    const defaultCabangId = dbCabang[0]?.id || crypto.randomUUID();
    const defaultKategoriId = dbKategori[0]?.id || crypto.randomUUID();
    const defaultSatuanId = dbSatuan[0]?.id || crypto.randomUUID();
    const defaultSalesId = dbUsers.find(u => u.roles.includes('sales'))?.id || dbUsers[0]?.id || crypto.randomUUID();
    const defaultKategoriPelangganId = dbKategoriPelanggan[0]?.id || crypto.randomUUID();

    // 1. Cabang
    const newCabangs = Object.keys(finalMappings.cabang).filter(n => !finalMappings.cabang[n].existing);
    if (newCabangs.length > 0) {
      setStatus('Membuat data Cabang...');
      const { data: res, error } = await supabase.from('cabang').insert(newCabangs.map(n => ({ nama: n, area_id: defaultAreaId }))).select();
      if (error) throw error;
      res?.forEach(c => finalMappings.cabang[c.nama.toLowerCase()] = { existing: true, id: c.id, name: c.nama });
    }

    // 2. Salesman
    const newSales = Object.keys(finalMappings.salesman).filter(n => !finalMappings.salesman[n].existing);
    if (newSales.length > 0) {
      setStatus('Membuat data Salesman...');
      const salesPayload = newSales.map(n => {
        const row = firstRowPerSales[n];
        const cId = finalMappings.cabang[row?.cabang?.toLowerCase()]?.id || defaultCabangId;
        const username = n.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substring(2, 5);
        const kode_unik = n.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
        return { nama: finalMappings.salesman[n].name, username, email: username + '@skj.com', roles: ['sales'], cabang_id: cId, is_active: false, kode_unik };
      });
      const { data: res, error } = await supabase.from('users').insert(salesPayload).select();
      if (error) throw error;
      res?.forEach(u => finalMappings.salesman[u.nama.toLowerCase()] = { existing: true, id: u.id, name: u.nama, kodeUnik: u.kode_unik });
    }

    // 3. Produk
    const newProds = Object.keys(finalMappings.produk).filter(n => !finalMappings.produk[n].existing);
    if (newProds.length > 0) {
      setStatus('Membuat data Produk...');
      const prodPayload = newProds.map(n => ({
        nama: finalMappings.produk[n].name,
        kode: n.substring(0, 10).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase(),
        kategori_id: defaultKategoriId,
        satuan_id: defaultSatuanId,
        harga_jual: firstRowPerProduk[n]?.harga || 0,
        is_active: true
      }));
      const { data: res, error } = await supabase.from('barang').insert(prodPayload).select();
      if (error) throw error;
      res?.forEach(p => finalMappings.produk[p.nama.toLowerCase()] = { existing: true, id: p.id, name: p.nama, satuanId: p.satuan_id });
    }

    // 4. Pelanggan
    const newPels = Object.keys(finalMappings.pelanggan).filter(n => !finalMappings.pelanggan[n].existing);
    if (newPels.length > 0) {
      setStatus('Membuat data Pelanggan...');
      const chunkSize = 100;
      for (let i = 0; i < newPels.length; i += chunkSize) {
        const chunk = newPels.slice(i, i + chunkSize);
        const pelPayload = chunk.map(n => {
          const row = firstRowPerPelanggan[n];
          const cId = finalMappings.cabang[row?.cabang?.toLowerCase()]?.id || defaultCabangId;
          const sInfo = finalMappings.salesman[row?.salesman?.toLowerCase()] || {};
          const sKode = sInfo.kodeUnik || 'GEN';
          const catId = dbKategoriPelanggan.find(c => c.nama.toLowerCase() === row?.kategori_pelanggan?.toLowerCase())?.id || defaultKategoriPelangganId;
          return {
            nama: finalMappings.pelanggan[n].name,
            cabang_id: cId,
            sales_id: sInfo.id || defaultSalesId,
            kategori_id: catId,
            kode: `${sKode}-${n.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            alamat: row?.alamat || '-',
            telepon: row?.telp?.toString().replace(/\D/g, '') || '-',
            lokasi: {
              latitude: Number(row?.lat) || 0,
              longitude: Number(row?.long) || 0,
              alamat: row?.alamat || '-'
            },
            is_active: true,
            created_at: parseCSVDate(row?.pelanggan_created_at || row?.tanggal).toISOString()
          };
        });
        const { data: res, error } = await supabase.from('pelanggan').insert(pelPayload).select();
        if (error) throw error;
        res?.forEach(p => finalMappings.pelanggan[normalizeCustomer(p.nama)] = { existing: true, id: p.id, name: p.nama });
      }
    }
    return finalMappings;
  };

  const performImportPenjualan = async (m: any) => {
    setStatus('Mengimport transaksi penjualan...');
    const { data: promos } = await supabase.from('promo').select('*');
    const validRows = data.filter(r => r.pelanggan?.trim() && r.produk?.trim());
    const grouped = new Map<string, ImportRow[]>();
    validRows.forEach(r => {
      const k = `${parseCSVDate(r.tanggal).toISOString().split('T')[0]}|${normalizeCustomer(r.pelanggan!)}|${r.salesman?.toLowerCase()}|${r.cabang?.toLowerCase()}|${r.transaksi?.toLowerCase()}`;
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(r);
    });

    const keys = Array.from(grouped.keys());
    for (let i = 0; i < keys.length; i += 50) {
      const batchKeys = keys.slice(i, i + 50);
      const penjPayload: any[] = [];
      const pembPayload: any[] = [];
      batchKeys.forEach((k, idx) => {
        const rows = grouped.get(k)!;
        const first = rows[0];
        const pId = crypto.randomUUID();
        let sub = 0, disc = 0, tot = 0;
        const items = rows.map(r => {
          const subtotal = r.total || 0;
          sub += subtotal + (r.promo || 0);
          disc += r.promo || 0;
          tot += subtotal;
          return {
            id: crypto.randomUUID(),
            barangId: m.produk[r.produk.toLowerCase()]?.id,
            jumlah: r.qty,
            satuanId: m.produk[r.produk.toLowerCase()]?.satuanId || dbSatuan[0]?.id,
            harga: r.harga || 0,
            diskon: r.promo || 0,
            subtotal: subtotal,
            promoId: promos?.find(p => p.nama.toLowerCase() === r.transaksi?.toLowerCase())?.id || null
          };
        });

        const isLunas = first.transaksi?.toLowerCase() !== 'tempo';
        penjPayload.push({
          id: pId,
          tanggal: parseCSVDate(first.tanggal).toISOString(),
          pelanggan_id: m.pelanggan[normalizeCustomer(first.pelanggan!)]?.id,
          sales_id: m.salesman[first.salesman?.toLowerCase() || '']?.id,
          cabang_id: m.cabang[first.cabang?.toLowerCase() || '']?.id,
          status: isLunas ? 'lunas' : 'tempo',
          subtotal: sub, diskon: disc, total: tot, bayar: isLunas ? tot : 0,
          is_lunas: isLunas,
          metode_pembayaran: first.transaksi?.toLowerCase() === 'tunai' ? 'tunai' : (first.transaksi?.toLowerCase() === 'tempo' ? 'tempo' : 'transfer'),
          items,
          nomor_nota: `INV/${parseCSVDate(first.tanggal).toISOString().split('T')[0].replace(/-/g, '')}-${i + idx + 1}`,
          catatan: 'Import Bulk',
          lokasi: {
            latitude: Number(first.lat) || 0,
            longitude: Number(first.long) || 0,
            alamat: first.alamat || '-'
          }
        });

        if (isLunas && tot > 0) {
          pembPayload.push({
            id: crypto.randomUUID(), penjualan_id: pId, jumlah: tot, bayar: tot,
            metode_pembayaran: first.transaksi?.toLowerCase() === 'tunai' ? 'tunai' : 'transfer',
            tanggal: parseCSVDate(first.tanggal).toISOString(), catatan: 'Import Pembayaran'
          });
        }
      });
      const { error: err1 } = await supabase.from('penjualan').insert(penjPayload);
      if (err1) throw err1;
      if (pembPayload.length > 0) {
        const { error: err2 } = await supabase.from('pembayaran_penjualan').insert(pembPayload);
        if (err2) throw err2;
      }
      setProgress(30 + Math.round(((i + batchKeys.length) / keys.length) * 40));
    }
  };

  const performImportStok = async (m: any) => {
    if (stokData.length === 0) return;
    setStatus('Mengimport stok akhir...');
    for (const row of stokData) {
      const uId = m.salesman[row.holder.toLowerCase()]?.id;
      const bId = m.produk[row.product.toLowerCase()]?.id;
      if (!uId || !bId) continue;
      const { data: exist } = await supabase.from('stok_pengguna').select('id').eq('user_id', uId).eq('barang_id', bId).maybeSingle();
      if (exist) {
        await supabase.from('stok_pengguna').update({ jumlah: row.qty, updated_at: new Date().toISOString() }).eq('id', exist.id);
      } else {
        await supabase.from('stok_pengguna').insert({ user_id: uId, barang_id: bId, jumlah: row.qty, updated_at: new Date().toISOString() });
      }
    }
    setProgress(85);
  };

  const performImportSaldo = async (m: any) => {
    if (saldoData.length === 0) return;
    setStatus('Mengimport saldo akhir...');
    for (const row of saldoData) {
      const uId = m.salesman[row.karyawan.toLowerCase()]?.id;
      if (!uId) continue;
      const { data: exist } = await supabase.from('saldo_pengguna').select('id').eq('user_id', uId).maybeSingle();
      if (exist) {
        await supabase.from('saldo_pengguna').update({ saldo: row.belumDibayar, updated_at: new Date().toISOString() }).eq('id', exist.id);
      } else {
        await supabase.from('saldo_pengguna').insert({ user_id: uId, saldo: row.belumDibayar, updated_at: new Date().toISOString() });
      }
      await supabase.from('riwayat_saldo_pengguna').insert({
        user_id: uId, tipe: 'masuk', jumlah: row.belumDibayar, saldo_awal: 0, saldo_akhir: row.belumDibayar,
        keterangan: 'Import Saldo Awal', created_at: new Date().toISOString()
      });
    }
    setProgress(95);
  };

  const performImportAbsensi = async (m: any) => {
    if (data.length === 0) return;
    setStatus('Menyiapkan data absensi sales...');
    
    // Group to ensure unique combination of Salesman + Date
    const absMap = new Map<string, any>();
    data.forEach(row => {
      const uId = m.salesman[row.salesman.toLowerCase()]?.id;
      if (!uId) return;
      const d = parseCSVDate(row.tanggal).toISOString().split('T')[0];
      const key = `${uId}_${d}`;
      if (!absMap.has(key)) {
        absMap.set(key, { uId, d, lat: row.lat, long: row.long, alamat: row.alamat });
      }
    });

    const entries = Array.from(absMap.values());
    for (let i = 0; i < entries.length; i++) {
      const v = entries[i];
      setStatus(`Memverifikasi absensi: ${v.d} (${i + 1}/${entries.length})`);
      
      // Strictly one record per sales per date
      const { data: ex } = await supabase.from('absensi').select('id').eq('user_id', v.uId)
        .gte('tanggal', `${v.d}T00:00:00Z`).lte('tanggal', `${v.d}T23:59:59Z`).maybeSingle();
      
      if (!ex) {
        await supabase.from('absensi').insert({
          user_id: v.uId,
          tanggal: `${v.d}T00:00:00Z`,
          check_in: `${v.d}T08:00:00Z`,
          lokasi_check_in: { latitude: Number(v.lat) || 0, longitude: Number(v.long) || 0, alamat: v.alamat || 'Import' },
          status: 'hadir',
          keterangan: 'Import Bulk'
        });
      }
      if (i % 10 === 0) setProgress(70 + Math.round((i / entries.length) * 10));
    }
  };

  const executeBulkImport = async () => {
    setIsProcessing(true);
    setStep(3);
    setProgress(5);
    try {
      const m = await createMasterData(mappings);
      await performImportPenjualan(m);
      await performImportAbsensi(m);
      await performImportStok(m);
      await performImportSaldo(m);
      setProgress(100);
      setStatus('Inisialisasi Selesai!');
      toast.success('Inisialisasi data berhasil!');
      await refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat inisialisasi');
      setStatus('Gagal: ' + err.message);
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
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inisialisasi Data Aplikasi</h1>
          <p className="text-muted-foreground">
            Unggah data master dan transaksi untuk memulai aplikasi
          </p>
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Penjualan File */}
            <Card className={`border-2 transition-all ${files.penjualan ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-3 rounded-full ${files.penjualan ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Data Penjualan</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">import_penjualan.csv (Wajib)</p>
                </div>
                <Input
                  type="file"
                  id="file-penjualan"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={(e) => setFiles(prev => ({ ...prev, penjualan: e.target.files?.[0] || null }))}
                />
                <Button 
                  variant={files.penjualan ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => document.getElementById('file-penjualan')?.click()}
                >
                  {files.penjualan ? 'Ganti File' : 'Pilih File'}
                </Button>
              </CardContent>
            </Card>

            {/* Stok File */}
            <Card className={`border-2 transition-all ${files.stok ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-3 rounded-full ${files.stok ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Stok Akhir</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">stok-akhir.csv (Opsional)</p>
                </div>
                <Input
                  type="file"
                  id="file-stok"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={(e) => setFiles(prev => ({ ...prev, stok: e.target.files?.[0] || null }))}
                />
                <Button 
                  variant={files.stok ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => document.getElementById('file-stok')?.click()}
                >
                  {files.stok ? 'Ganti File' : 'Pilih File'}
                </Button>
              </CardContent>
            </Card>

            {/* Saldo File */}
            <Card className={`border-2 transition-all ${files.saldo ? 'border-primary bg-primary/5' : 'border-dashed'}`}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-3 rounded-full ${files.saldo ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Saldo Akhir</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">saldo-akhir.csv (Opsional)</p>
                </div>
                <Input
                  type="file"
                  id="file-saldo"
                  className="hidden"
                  accept=".csv,.xlsx"
                  onChange={(e) => setFiles(prev => ({ ...prev, saldo: e.target.files?.[0] || null }))}
                />
                <Button 
                  variant={files.saldo ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => document.getElementById('file-saldo')?.click()}
                >
                  {files.saldo ? 'Ganti File' : 'Pilih File'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={handleProcessAll} 
              disabled={!files.penjualan || isProcessing}
              className="px-12 h-12 rounded-xl text-lg shadow-lg hover:shadow-primary/20 transition-all"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Database className="w-5 h-5 mr-2" />}
              Analisa & Lanjutkan
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informasi Penting</AlertTitle>
            <AlertDescription className="text-xs">
              Sistem akan memetakan data Cabang, Salesman, Produk, dan Pelanggan dari ketiga file secara otomatis.
              Jika data master belum ada di database, sistem akan membuatnya saat proses import berlangsung.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisis Data</CardTitle>
              <CardDescription>
                Berhasil menganalisa {data.length} baris penjualan, {stokData.length} baris stok, dan {saldoData.length} baris saldo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MappingCard icon={Building2} label="Cabang" total={mappingSummary.cabang.total} newCount={mappingSummary.cabang.new} />
                <MappingCard icon={Users} label="Salesman" total={mappingSummary.salesman.total} newCount={mappingSummary.salesman.new} />
                <MappingCard icon={Users} label="Pelanggan" total={mappingSummary.pelanggan.total} newCount={mappingSummary.pelanggan.new} />
                <MappingCard icon={Package} label="Produk" total={mappingSummary.produk.total} newCount={mappingSummary.produk.new} />
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Siap Diimport</p>
                  <p className="text-xs text-primary/80">
                    Sistem akan melakukan inisialisasi database secara bulk.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isProcessing}>
              Kembali
            </Button>
            <Button onClick={executeBulkImport} disabled={isProcessing} className="px-10">
              Mulai Inisialisasi <ArrowRight className="w-4 h-4 ml-2" />
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
              <div className="flex flex-col gap-3">
                <Button onClick={() => window.location.href = '/beranda'} className="rounded-xl px-12">
                  Selesai & Ke Beranda
                </Button>
              </div>
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
