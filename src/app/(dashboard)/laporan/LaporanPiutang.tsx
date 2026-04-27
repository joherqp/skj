'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, TrendingUp, FileSpreadsheet, Search, ArrowUpDown, AlertTriangle, MessageCircle, Phone, Share2, Building } from 'lucide-react';
import { formatRupiah, formatWhatsAppNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Penjualan } from '@/types';
import { ScopeFilters } from '@/components/shared/ScopeFilters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

type SortOption = 'highest' | 'lowest' | 'name-asc' | 'name-desc';

export default function LaporanPiutang() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const {
    penjualan, users, pelanggan, profilPerusahaan, cabang, kategoriPelanggan
  } = useDatabase();

  const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
  const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
  
  // Sync selectedCabangIds with currentUser on load
  useEffect(() => {
    if (currentUser && !isAdminOrOwner && selectedCabangIds.length === 0) {
      if (currentUser.cabangId) {
        setSelectedCabangIds([currentUser.cabangId]);
      }
    }
  }, [currentUser, isAdminOrOwner]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('highest');

  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [unpaidDebtsForDialog, setUnpaidDebtsForDialog] = useState<Penjualan[]>([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  // Auto-select "Cati" if exists
  useEffect(() => {
    if (users.length > 0 && selectedUserIds.length === 0) {
      const cati = users.find(u => u.nama.toLowerCase() === 'cati');
      if (cati) {
        setSelectedUserIds([cati.id]);
      }
    }
  }, [users, selectedUserIds.length]);

  const handlePayClick = (customerId: string, customerName: string) => {
      const debts = penjualan.filter(p => 
          p.pelangganId === customerId && 
          p.metodePembayaran === 'tempo' && 
          p.status === 'lunas' && 
          !p.isLunas &&
          (p.bayar || 0) < p.total
      );

      setUnpaidDebtsForDialog(debts);
      setSelectedCustomerName(customerName);
      setIsDebtDialogOpen(true);
  };


  // Use Global Limit Config
  const useGlobal = profilPerusahaan?.config?.useGlobalLimit;
  const globalMax = profilPerusahaan?.config?.globalLimitAmount || 0;

  // 1. Calculate Available IDs based on Debt
  const { availableCabangIds, availableUserIds } = useMemo(() => {
      const cabs = new Set<string>();
      const usrs = new Set<string>();
      
      pelanggan.forEach(p => {
          if ((p.sisaKredit || 0) > 0) {
              if (p.cabangId) cabs.add(p.cabangId);
              if (p.salesId) usrs.add(p.salesId);
          }
      });
      
      return {
          availableCabangIds: Array.from(cabs),
          availableUserIds: Array.from(usrs)
      };
  }, [pelanggan]);

  const effectiveCabangIds = (selectedCabangIds.length === 0 && !isAdminOrOwner && currentUser?.cabangId)
      ? [currentUser.cabangId]
      : selectedCabangIds;

  // 2. Filter Customers by Branch AND Multi-Sales User
  const filteredPelanggan = pelanggan.filter(p => {
      // Branch Filter
      const isGlobalView = isAdminOrOwner && effectiveCabangIds.length === 0;
      if (!isGlobalView && !effectiveCabangIds.includes(p.cabangId || '')) return false;

      // User/Sales Filter (Multi-Select)
      if (selectedUserIds.length > 0) {
          if (!selectedUserIds.includes(p.salesId)) return false;
      }

      return true;
  });

  // 3. Prepare Data with Calculated Debt & Global Limit Logic
  const calculatedData = filteredPelanggan.map(p => {
      // Source of truth for debt is now p.sisaKredit
      const totalHutang = p.sisaKredit || 0;
      
      // Ceiling calculations matching model
      const limitMax = useGlobal ? globalMax : (p.limitKredit + (p.sisaKredit || 0));
      const sisaPlafon = useGlobal ? (globalMax - totalHutang) : (p.limitKredit || 0);

      const unpaidSales = penjualan.filter(s => 
          s.pelangganId === p.id && 
          s.metodePembayaran === 'tempo' && 
          s.status === 'lunas' && 
          (s.isLunas === false || ((s.bayar || 0) < s.total))
      );

      // Calculate Overdue
      const overdueInvoices = unpaidSales.filter(s => 
          s.jatuhTempo && new Date(s.jatuhTempo) < new Date()
      ).length;

      return {
          ...p,
          totalHutang,
          limitMax,
          sisaPlafon,
          overdueInvoices,
          unpaidSales // Still useful for dialog
      };
  });

  // 3. Filter by having Debt & Search Query
  const piutangList = calculatedData.filter(p => {
      if (p.totalHutang <= 0) return false;

      const q = searchQuery.toLowerCase();
      return p.nama.toLowerCase().includes(q) || 
             p.kode.toLowerCase().includes(q);
  });

  // 4. Sort
  const sortedList = [...piutangList].sort((a, b) => {
      switch (sortBy) {
          case 'highest': return b.totalHutang - a.totalHutang;
          case 'lowest': return a.totalHutang - b.totalHutang;
          case 'name-asc': return a.nama.localeCompare(b.nama);
          case 'name-desc': return b.nama.localeCompare(a.nama);
          default: return 0;
      }
  });

  const totalPiutang = sortedList.reduce((sum, p) => sum + p.totalHutang, 0);

  const handleShare = async (customer: any) => {
    const shareText = `📄 *INFORMASI PIUTANG PELANGGAN*
━━━━━━━━━━━━━━━━━━
👤 Pelanggan: ${customer.nama}
💰 Total Hutang: ${formatRupiah(customer.totalHutang)}
⚠️ Jatuh Tempo: ${customer.overdueInvoices} Nota

Mohon segera melakukan penyelesaian pembayaran. Terima kasih.
━━━━━━━━━━━━━━━━━━
${profilPerusahaan.nama}`;

    if (customer.telepon && customer.telepon !== '-') {
      const waUrl = `https://wa.me/${formatWhatsAppNumber(customer.telepon)}?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Piutang ${customer.nama}`,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Teks disalin ke clipboard');
      } catch (err) {
        toast.error('Gagal menyalin teks');
      }
    }
  };

  const handleExportExcel = () => {
    if (sortedList.length === 0) {
        toast.error("Tidak ada data piutang untuk diexport");
        return;
    }
    try {
        const data = sortedList.map(item => {
            const kategori = kategoriPelanggan.find(k => k.id === item.kategoriId);
            const userSales = users.find(u => u.id === item.salesId);
            return {
                "Sales": userSales?.nama || '-',
                "Kategori": kategori?.nama || '-',
                "Nama Pelanggan": item.nama,
                "Limit Kredit": item.limitMax,
                "Sisa Plafon": item.sisaPlafon,
                "Total Hutang": item.totalHutang
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        
        ws['!cols'] = [
            { wch: 15 }, // Sales
            { wch: 15 }, // Kategori
            { wch: 30 }, // Nama
            { wch: 15 }, // Limit
            { wch: 15 }, // Sisa
            { wch: 15 }  // Hutang
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Laporan Piutang");
        XLSX.writeFile(wb, `Laporan_Piutang_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success("Excel piutang berhasil diunduh");
    } catch (err) {
        console.error("Export Error: ", err);
        toast.error("Gagal export Excel");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
            <Button variant="ghost" onClick={() => router.push('/laporan')} className="pl-0 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            
            <div className="flex flex-wrap gap-4 items-end w-full md:w-auto">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-primary font-medium ml-1">
                        <Building className="w-3.5 h-3.5" />
                        <span className="text-[10px] uppercase tracking-wider">Filter Cabang & Sales</span>
                    </div>
                    <ScopeFilters
                        selectedCabangIds={selectedCabangIds}
                        setSelectedCabangIds={setSelectedCabangIds}
                        selectedUserIds={selectedUserIds}
                        setSelectedUserIds={setSelectedUserIds}
                        availableCabangIds={availableCabangIds}
                        availableUserIds={availableUserIds}
                        className="!space-y-0 flex flex-row items-center gap-2"
                    />
                </div>
                 
                <div className="relative flex-1 md:w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama / kode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs w-full"
                    />
                </div>

                <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 bg-white border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </Button>
            </div>
        </div>

        {/* Total Summary */}
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200 shadow-sm">
             <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-full shadow-inner">
                        <TrendingUp className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Piutang Berjalan</p>
                        <h2 className="text-2xl sm:text-3xl font-bold text-red-700 mt-1">{formatRupiah(totalPiutang)}</h2>
                    </div>
                </div>
             </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-none shadow-md overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    Rincian Piutang
                    <Badge variant="secondary" className="font-normal text-xs">{sortedList.length} Pelanggan</Badge>
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Urutkan:</span>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="highest">Termiskin (Hutang Tertinggi)</SelectItem>
                            <SelectItem value="lowest">Terkaya (Hutang Terendah)</SelectItem>
                            <SelectItem value="name-asc">Nama (A-Z)</SelectItem>
                            <SelectItem value="name-desc">Nama (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[120px]">Sales</TableHead>
                            <TableHead className="w-[120px]">Kategori</TableHead>
                            <TableHead>Pelanggan</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Limit Kredit</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Sisa Plafon</TableHead>
                            <TableHead className="text-right font-bold text-red-600">Total Hutang</TableHead>
                            <TableHead className="w-[80px]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                    Tidak ada data piutang ditemukan
                                </TableCell>
                            </TableRow>
                        ) : (() => {
                            // Logic Grouping & Subtotal
                            const rows: React.ReactNode[] = [];
                            const groups: { [key: string]: typeof sortedList } = {};

                            sortedList.forEach(item => {
                                if (!groups[item.salesId]) groups[item.salesId] = [];
                                groups[item.salesId].push(item);
                            });

                            const isMultiSales = Object.keys(groups).length > 1;

                            Object.keys(groups).forEach(salesId => {
                                const groupItems = groups[salesId];
                                const salesName = users.find(u => u.id === salesId)?.nama || 'Tanpa Sales';
                                let subtotal = 0;

                                groupItems.forEach(item => {
                                    subtotal += item.totalHutang;
                                    const kategori = kategoriPelanggan.find(k => k.id === item.kategoriId);

                                    rows.push(
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                                {salesName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">
                                                    {kategori?.nama || '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{item.nama}</div>
                                            </TableCell>
                                            <TableCell className="text-right hidden sm:table-cell text-muted-foreground text-xs">
                                                {formatRupiah(item.limitMax)}
                                            </TableCell>
                                            <TableCell className="text-right hidden sm:table-cell text-muted-foreground text-xs">
                                                {formatRupiah(item.sisaPlafon)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatRupiah(item.totalHutang)}
                                                {item.overdueInvoices > 0 && (
                                                    <div className="text-[10px] text-red-500 font-normal">
                                                        {item.overdueInvoices} Nota Jatuh Tempo
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="default" 
                                                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={() => handlePayClick(item.id, item.nama)}
                                                    >
                                                        Bayar
                                                    </Button>
                                                    {item.telepon && item.telepon !== '-' && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-full border-green-200 text-green-600 hover:bg-green-50"
                                                                onClick={() => window.open(`https://wa.me/${formatWhatsAppNumber(item.telepon)}`, '_blank')}
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50"
                                                                onClick={() => window.open(`tel:${item.telepon}`, '_self')}
                                                            >
                                                                <Phone className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-7 w-7 rounded-full border-muted-foreground/20 text-muted-foreground hover:bg-muted/50"
                                                                onClick={() => handleShare(item)}
                                                            >
                                                                <Share2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                });

                                // Add Subtotal row if multi-sales
                                if (isMultiSales) {
                                    rows.push(
                                        <TableRow key={`subtotal-${salesId}`} className="bg-muted/50 border-t-2 font-bold">
                                            <TableCell colSpan={5} className="text-right py-2 italic text-xs">
                                                Subtotal {salesName}
                                            </TableCell>
                                            <TableCell className="text-right text-red-700 py-2">
                                                {formatRupiah(subtotal)}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    );
                                }
                            });

                            return rows;
                        })()}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={5} className="text-right font-bold">Grand Total Hutang</TableCell>
                             <TableCell className="text-right font-bold text-red-600">
                                {formatRupiah(totalPiutang)}
                             </TableCell>
                             <TableCell colSpan={2}></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </Card>

        {/* Debt Selection Dialog */}
        <AlertDialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Pilih Transaksi untuk Dibayar
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-left">
                        <div className="mb-4">
                            Daftar hutang untuk pelanggan <span className="font-bold text-foreground">{selectedCustomerName}</span>.
                            <br/>Klik "Lihat Detail" untuk memproses pembayaran per nota.
                        </div>
                        
                        <div className="border rounded-md max-h-[300px] overflow-y-auto bg-muted/20">
                            {unpaidDebtsForDialog.map((debt, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-muted/50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="font-semibold text-xs text-foreground">{debt.nomorNota}</p>
                                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                                            <span>{new Date(debt.tanggal).toLocaleDateString('id-ID')}</span>
                                            {debt.jatuhTempo && (
                                                <span className={new Date(debt.jatuhTempo) < new Date() ? "text-red-500 font-bold" : ""}>
                                                    Jatuh Tempo: {new Date(debt.jatuhTempo).toLocaleDateString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600 text-xs">
                                            {formatRupiah(debt.total - (debt.bayar || 0))}
                                        </p>
                                        <Button 
                                            variant="link" 
                                            size="sm" 
                                            className="h-auto p-0 text-[10px] text-primary"
                                            onClick={() => router.push(`/penjualan/${debt.id}`)}
                                        >
                                            Lihat Detail &rarr;
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsDebtDialogOpen(false)}>
                        Tutup
                    </AlertDialogCancel>
                    {/* Optional: Add a button to go to Customer Detail if they want to see everything
                    <AlertDialogAction onClick={() => {
                         // Find ID logic needed or pass ID to state?
                         // For now, list navigation is efficient. 
                    }}>
                        Lihat Semua
                    </AlertDialogAction> */}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
