'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload, Users, ShoppingCart, FileSpreadsheet, CheckSquare, Square, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useRouter } from 'next/navigation';
import { toCamelCase, toSnakeCase } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Helper to convert snake_case to camelCase (for consistency if needed, though mostly we use context)
// Context data is already camelCase.

export default function Backup() {
  const router = useRouter();
  const { dbMode, ...dbContext } = useDatabase();
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'excel'>('excel');
  const [pendingImportData, setPendingImportData] = useState<Record<string, unknown[]> | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Reset functionality states
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  
  // Tables categorization
  const masterTables = {
    profilPerusahaan: "Profil Perusahaan",
    cabang: "Cabang",
    users: "Data Users",
    area: "Area / Wilayah",
    kategori: "Kategori Produk",
    satuan: "Satuan Unit",
    barang: "Data Barang",
    harga: "Harga",
    promo: "Data Promo",
    rekeningBank: "Rekening Bank",
    kategoriPelanggan: "Kategori Pelanggan",
    targets: "Target Penjualan",
    pelanggan: "Data Pelanggan", // Moving here because it's usually master data
  };

  const transactionTables = {
    penjualan: "Penjualan",
    pembayaranPenjualan: "Pembayaran Penjualan",
    setoran: "Setoran",
    absensi: "Absensi",
    kunjungan: "Kunjungan Sales",
    riwayatPelanggan: "Riwayat Pelanggan",
    permintaanBarang: "Permintaan Barang",
    mutasiBarang: "Mutasi Barang",
    penyesuaianStok: "Penyesuaian Stok",
    restock: "Barang Masuk / Restock",
    stokPengguna: "Stok Pengguna (Mobile)",
    stokHarian: "Stok Harian",
    stokLog: "Log Stok",
    saldoPengguna: "Saldo Pengguna",
    pettyCash: "Kas Kecil (Petty Cash)",
    reimburse: "Reimbursement",
    notifikasi: "Notifikasi",
    persetujuan: "Log Persetujuan",
    userLocations: "Log Lokasi User",
    pushSubscriptions: "Push Notification Subscriptions",
    salesTargetHistory: "Riwayat Target Sales",
    stokSnapshot: "Snapshot Stok",
  };

  const availableTables = { ...masterTables, ...transactionTables };

  const [selectedTables, setSelectedTables] = useState<Record<string, boolean>>(
    Object.keys(availableTables).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const toggleSelectAll = () => {
    const allSelected = Object.values(selectedTables).every(Boolean);
    const newState = Object.keys(availableTables).reduce((acc, key) => ({ ...acc, [key]: !allSelected }), {});
    setSelectedTables(newState);
  };

  const handleTableToggle = (key: string) => {
    setSelectedTables(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to determine schema for a table (replicated from DatabaseContext)
  const getTableSchema = (tableName: string) => {
    const publicOnlyTables = ['profil_perusahaan', 'cabang', 'users', 'stok_log', 'stok_harian', 'stok_snapshot', 'push_subscriptions'];
    return publicOnlyTables.includes(tableName) ? 'public' : dbMode;
  };

  // --- EXPORT LOGIC ---
  const handleAdvancedExport = async () => {
    setIsExporting(true);
    try {
      const tablesToExport = Object.keys(selectedTables).filter(key => selectedTables[key]);
      
      if (tablesToExport.length === 0) {
        toast.error('Pilih setidaknya satu tabel untuk diekspor');
        setIsExporting(false);
        return;
      }

      toast.info(`Mengekspor ${tablesToExport.length} tabel dari schema ${dbMode}...`);

      const dataMap: Record<string, any[]> = {};
      const exportSummary: Record<string, number> = {};

      for (const key of tablesToExport) {
        let dbTableName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (key === 'targets') dbTableName = 'sales_targets';

        const schema = getTableSchema(dbTableName);
        
        const { data, error } = await supabase
            .schema(schema)
            .from(dbTableName)
            .select('*')
            .limit(20000);
        
        if (error) {
          console.warn(`Gagal mengambil data for ${key} (schema: ${schema}):`, error);
        }
        
        dataMap[key] = toCamelCase(data || []);
        exportSummary[key] = (data || []).length;
      }

      const emptyTables = Object.entries(exportSummary).filter(([_, count]) => count === 0);
      if (emptyTables.length > 0 && emptyTables.length < tablesToExport.length) {
          toast.warning(`${emptyTables.length} tabel kosong (${emptyTables.map(t => availableTables[t[0] as keyof typeof availableTables] || t[0]).join(', ')})`, { duration: 5000 });
      } else if (emptyTables.length === tablesToExport.length) {
          toast.error("Seluruh tabel yang dipilih kosong di database");
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fileNameBase = `cvskj_export_${timestamp}`;

      if (selectedFormat === 'json') {
        const backupData = { version: "1.0", timestamp: new Date().toISOString(), tables: dataMap };
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `${fileNameBase}.json`);
        linkElement.click();
      } else if (selectedFormat === 'excel') {
        const wb = XLSX.utils.book_new();
        tablesToExport.forEach(key => {
          const data = dataMap[key] as Record<string, unknown>[];
          const sheetName = key.length > 30 ? key.substring(0, 30) : key;
          const ws = XLSX.utils.json_to_sheet(data.map((item: any) => {
             const clean = { ...item };
             Object.keys(clean).forEach(k => { if(typeof clean[k] === 'object') clean[k] = JSON.stringify(clean[k]); });
             return clean;
          }));
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
        XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
      }
      toast.success('Export berhasil!');
    } catch (error) {
      toast.error('Gagal melakukan export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
        const text = await file.text();
        const json = JSON.parse(text);
        setPendingImportData(json.tables);
        setIsConfirmOpen(true);
    } catch (e) {
        toast.error("Format file tidak valid");
    } finally {
        setIsLoading(false);
    }
  };

  const executeRestore = async () => {
    if (!pendingImportData) return;
    setIsLoading(true);
    try {
        for (const [tableName, data] of Object.entries(pendingImportData)) {
            let dbTableName = tableName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (tableName === 'targets') dbTableName = 'sales_targets';
            await supabase.schema(getTableSchema(dbTableName)).from(dbTableName).upsert(toSnakeCase(data));
        }
        toast.success("Restore berhasil");
        window.location.reload();
    } catch (e) {
        toast.error("Restore gagal");
    } finally {
        setIsLoading(false);
        setIsConfirmOpen(false);
    }
  };

  const handleOpenReset = () => {
    setResetCode(Math.floor(100000 + Math.random() * 900000).toString());
    setIsResetDialogOpen(true);
  };

  const executeReset = async () => {
    if (userInputCode !== resetCode) return toast.error("Kode salah");
    setIsResetting(true);
    const tablesToDelete = [
      'penjualan', 
      'pembayaran_penjualan', 
      'setoran', 
      'absensi', 
      'kunjungan', 
      'riwayat_pelanggan', 
      'permintaan_barang', 
      'mutasi_barang', 
      'penyesuaian_stok', 
      'restock', 
      'stok_pengguna', 
      'stok_harian', 
      'stok_log', 
      'saldo_pengguna', 
      'petty_cash', 
      'reimburse', 
      'notifikasi', 
      'persetujuan', 
      'user_locations', 
      'push_subscriptions', 
      'sales_target_history', 
      'stok_snapshot',
      'pelanggan'
    ];
    try {
        for (const table of tablesToDelete) {
            await supabase.schema(getTableSchema(table)).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        toast.success("Database berhasil direset (Transaksi & Pelanggan dihapus)");
        window.location.reload();
    } catch (e) {
        toast.error("Gagal reset");
    } finally {
        setIsResetting(false);
        setIsResetDialogOpen(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/pengaturan')} className="pl-0">← Kembali ke Pengaturan</Button>
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card elevated>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Download className="w-5 h-5" /> Export & Backup
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cadangkan data Anda ke format JSON atau Excel. Schema saat ini: <span className="font-semibold uppercase text-primary">{dbMode}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleOpenReset} disabled={!dbContext.isInitialized || isExporting || isResetting} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 mr-2" /> Reset Data
                        </Button>
                        <Button variant="outline" size="sm" onClick={toggleSelectAll} disabled={!dbContext.isInitialized || isExporting}>
                            {Object.values(selectedTables).every(Boolean) ? 'Unselect All' : 'Select All'}
                        </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                            <Database className="w-4 h-4" /> Data Master
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(masterTables).map(([key, label]) => (
                                <div key={key} className="flex items-center space-x-2 border p-2 rounded-md">
                                    <Checkbox id={key} checked={selectedTables[key]} onCheckedChange={() => handleTableToggle(key)} />
                                    <Label htmlFor={key} className="cursor-pointer text-xs">{label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-primary flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" /> Data Transaksi & Log
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(transactionTables).map(([key, label]) => (
                                <div key={key} className="flex items-center space-x-2 border p-2 rounded-md">
                                    <Checkbox id={key} checked={selectedTables[key]} onCheckedChange={() => handleTableToggle(key)} />
                                    <Label htmlFor={key} className="cursor-pointer text-xs">{label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card elevated>
                    <CardHeader><CardTitle className="text-base">Format & Aksi</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <RadioGroup value={selectedFormat} onValueChange={(v: any) => setSelectedFormat(v)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="excel" id="fmt-excel" /><Label htmlFor="fmt-excel">Excel Multipel Sheet</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="json" id="fmt-json" /><Label htmlFor="fmt-json">JSON</Label></div>
                        </RadioGroup>
                        <Button className="w-full" size="lg" onClick={handleAdvancedExport} disabled={!dbContext.isInitialized || isExporting}>
                            <Download className="w-4 h-4 mr-2" /> Export Data
                        </Button>
                    </CardContent>
                </Card>
                <Card elevated className="border-dashed border-2 bg-muted/10">
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" /> Import / Restore</CardTitle></CardHeader>
                    <CardContent>
                        <input type="file" id="adv-import" accept=".json" className="hidden" onChange={handleFileSelect} />
                        <Button variant="outline" className="w-full" onClick={() => document.getElementById('adv-import')?.click()} disabled={!dbContext.isInitialized}>Pilih File Backup</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Restore Data</AlertDialogTitle>
                <AlertDialogDescription>
                    Apakah Anda yakin ingin melakukan restore data dari file backup ini? 
                    Data yang ada saat ini akan diperbarui (upsert) berdasarkan ID.
                    <br/><br/>
                    Tabel yang akan di-restore: {pendingImportData ? Object.keys(pendingImportData).join(', ') : '-'}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={executeRestore} className="bg-red-600 hover:bg-red-700">
                    Lanjutkan Restore
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Database Dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent className="border-red-200">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" /> Reset Database Transaksi
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini akan <span className="font-bold text-red-600 uppercase">menghapus secara permanen</span> seluruh data transaksi (Penjualan, Stok, Absensi, Log, dll).
                    <br/><br/>
                    Data master (User, Barang, Kategori, Cabang, dll) akan tetap aman.
                </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4 space-y-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">Ketik kode konfirmasi berikut:</p>
                    <p className="text-3xl font-mono font-bold tracking-widest text-primary select-none">{resetCode}</p>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="reset-input">Masukkan 6 Digit Angka</Label>
                    <Input 
                        id="reset-input"
                        placeholder="______"
                        value={userInputCode}
                        onChange={(e) => setUserInputCode(e.target.value)}
                        className="text-center text-lg font-mono tracking-widest"
                        maxLength={6}
                        autoComplete="off"
                    />
                </div>
            </div>

            <AlertDialogFooter>
                <AlertDialogCancel disabled={isResetting}>Batal</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={(e) => {
                        e.preventDefault();
                        executeReset();
                    }}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isResetting || userInputCode !== resetCode}
                >
                    {isResetting ? 'Mereset...' : 'Ya, Hapus Semua Transaksi'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
