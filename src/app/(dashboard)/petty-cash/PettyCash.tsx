'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatTanggal, cn, getUserDisplayName, toProperCase } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, History, Wallet, FileText, ArrowUp, ArrowDown, User, Calendar, Tag, Info, ExternalLink, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ImagePreviewModal } from '@/components/shared/ImagePreviewModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PettyCash as PettyCashType } from '@/types';
import { Filter, X, Search, Plus, Trash2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from "@/components/ui/switch";
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

export default function PettyCash() {
  const router = useRouter();
  const { user } = useAuth();
  const { pettyCash, users, cabang, isAdminOrOwner, isFinance, profilPerusahaan, voidPettyCash } = useDatabase();
  const isManager = user?.roles.includes('manager');
  const isLeader = user?.roles.includes('leader');
  
  const displayMode = profilPerusahaan?.config?.tampilNama || 'nama';
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
   const [selectedTransaction, setSelectedTransaction] = useState<PettyCashType | null>(null);
   const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);

  // Filter States
  const [filterBranchId, setFilterBranchId] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterShowVoid, setFilterShowVoid] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFiltersCount = 
    (filterBranchId !== 'all' ? 1 : 0) + 
    (filterCategory !== 'all' ? 1 : 0) + 
    (filterUserId !== 'all' ? 1 : 0) + 
    (filterStartDate ? 1 : 0) + 
    (filterEndDate ? 1 : 0) +
    (filterShowVoid ? 1 : 0);

  // Filter Transactions based on Role using useMemo
  const { displayedData, currentBalance } = useMemo(() => {
      // 1. Identify permissions
      const isGlobalAccess = isAdminOrOwner; 
      const isManager = user?.roles.includes('manager');
      const isBranchStaff = isFinance || isManager || user?.roles.includes('leader');
      
      // 2. Filter logic
      let filtered = isGlobalAccess 
          ? pettyCash 
          : isBranchStaff
            ? pettyCash.filter(item => {
                // Find creator
                const creator = users.find(u => u.id === item.createdBy);
                // Match branch
                return (item.cabangId || creator?.cabangId) === user?.cabangId;
              })
            : pettyCash.filter(item => item.createdBy === user?.id);

      // Apply Admin/Owner Filters
      if (isGlobalAccess) {
          if (filterBranchId !== 'all') {
              filtered = filtered.filter(item => {
                  const creator = users.find(u => u.id === item.createdBy);
                  const itemBranchId = item.cabangId || creator?.cabangId;
                  return itemBranchId === filterBranchId;
              });
          }
      }


      // Filter by User
      if (filterUserId !== 'all') {
          filtered = filtered.filter(item => item.createdBy === filterUserId || item.penggunaAnggaran === filterUserId);
      }

      // Apply Common Filters
      if (filterCategory !== 'all') {
          filtered = filtered.filter(item => item.kategori === filterCategory);
      }

      // Filter Void
      if (!filterShowVoid) {
          filtered = filtered.filter(item => !item.keterangan.startsWith('[VOID]'));
      }

      if (filterStartDate) {
          const start = new Date(filterStartDate);
          start.setHours(0,0,0,0);
          filtered = filtered.filter(item => new Date(item.tanggal) >= start);
      }

      if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23,59,59,999);
          filtered = filtered.filter(item => new Date(item.tanggal) <= end);
      }

      // 3. Sort by Date Descending
      const sorted = [...filtered].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      // 4. Calculate Balance for this specific view scope
      const balance = sorted.reduce((acc, curr) => {
          return acc + (curr.tipe === 'masuk' ? curr.jumlah : -curr.jumlah);
      }, 0);

      return { displayedData: sorted, currentBalance: balance };
  }, [pettyCash, users, user, isAdminOrOwner, isFinance, filterBranchId, filterCategory, filterUserId, filterStartDate, filterEndDate, filterShowVoid]);

  const displayedTransactions = displayedData.slice(0, visibleCount);
  const hasMore = visibleCount < displayedData.length;



  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-6">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                        <Wallet className="w-4 h-4" /> Saldo Saat Ini
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold text-blue-700">
                        {formatCurrency(currentBalance)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 h-10 text-xs sm:text-sm shadow-sm" onClick={() => router.push('/petty-cash/tambah?type=masuk')}>
                            <ArrowUpCircle className="w-4 h-4 mr-2" /> Tambah Dana
                        </Button>
                        <Button className="flex-1 bg-red-600 hover:bg-red-700 h-10 text-xs sm:text-sm shadow-sm" onClick={() => router.push('/petty-cash/tambah?type=keluar')}>
                            <ArrowDownCircle className="w-4 h-4 mr-2" /> Catat Pengeluaran
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-3 col-span-2 lg:col-span-2">
                <Card className="col-span-1 border-none shadow-sm sm:border bg-green-50/50">
                    <CardHeader className="pb-1 p-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-green-600 uppercase tracking-wider flex items-center gap-1">
                             <ArrowUp className="w-3 h-3" /> Pemasukan (Bulan Ini)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-sm sm:text-xl font-bold text-green-700 truncate">
                            +{formatCurrency(
                                displayedData
                                .filter(p => p.tipe === 'masuk' && new Date(p.tanggal).getMonth() === new Date().getMonth())
                                .reduce((acc, c) => acc + c.jumlah, 0)
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 border-none shadow-sm sm:border bg-red-50/50">
                    <CardHeader className="pb-1 p-3">
                        <CardTitle className="text-[10px] sm:text-xs font-medium text-red-600 uppercase tracking-wider flex items-center gap-1">
                            <ArrowDown className="w-3 h-3" /> Pengeluaran (Bulan Ini)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-sm sm:text-xl font-bold text-red-700 truncate">
                            -{formatCurrency(
                                displayedData
                                .filter(p => p.tipe === 'keluar' && new Date(p.tanggal).getMonth() === new Date().getMonth())
                                .reduce((acc, c) => acc + c.jumlah, 0)
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <Card className="border-none shadow-sm sm:border">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5" /> 
                        Riwayat Transaksi {isAdminOrOwner ? '(Global)' : (isFinance && user?.cabangId !== 'cab-pusat') ? '(Cabang)' : ''}
                    </div>
                    
                    {(isAdminOrOwner || isFinance) && (
                        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className={cn("h-8 gap-1.5", activeFiltersCount > 0 && "border-primary text-primary bg-primary/5")}
                                >
                                    <Filter className="w-3.5 h-3.5" />
                                    <span className="text-xs">Filter</span>
                                    {activeFiltersCount > 0 && (
                                        <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] ml-0.5">
                                            {activeFiltersCount}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="end">
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-sm">Filter Kas Kecil</h4>
                                        {activeFiltersCount > 0 && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    setFilterBranchId('all');
                                                    setFilterCategory('all');
                                                    setFilterUserId('all');
                                                    setFilterStartDate('');
                                                    setFilterEndDate('');
                                                    setFilterShowVoid(false);
                                                }}
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {/* Branch Filter */}
                                        {isAdminOrOwner && (
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Cabang</Label>
                                                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Semua Cabang" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Semua Cabang</SelectItem>
                                                        {[...cabang].sort((a, b) => a.nama.localeCompare(b.nama)).map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}


                                        {/* User Filter */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Pengguna</Label>
                                            <SearchableSelect 
                                                options={[
                                                    { label: 'Semua Pengguna', value: 'all' },
                                                    ...users.map(u => ({ 
                                                        label: getUserDisplayName(u, displayMode), 
                                                        value: u.id, 
                                                        description: `${u.roles.join(', ')}${u.cabangId ? ` • ${cabang.find(c => c.id === u.cabangId)?.nama || ''}` : ''}`
                                                    }))
                                                ]}
                                                value={filterUserId}
                                                onChange={setFilterUserId}
                                                placeholder="Pilih pengguna..."
                                                searchPlaceholder="Cari nama..."
                                                className="h-8"
                                            />
                                        </div>

                                        {/* Category Filter */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Kategori</Label>
                                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Semua Kategori" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Semua Kategori</SelectItem>
                                                    {Array.from(new Set(pettyCash.map(p => p.kategori))).sort().map(cat => (
                                                        <SelectItem key={cat} value={cat}>{toProperCase(cat)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Date Filter */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Rentang Tanggal</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input 
                                                    type="date" 
                                                    className="h-8 text-[10px] px-2" 
                                                    value={filterStartDate}
                                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                                />
                                                <Input 
                                                    type="date" 
                                                    className="h-8 text-[10px] px-2" 
                                                    value={filterEndDate}
                                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Void Filter */}
                                        <div className="flex items-center justify-between pt-2 border-t mt-4">
                                            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground cursor-pointer" htmlFor="show-void">
                                                Tampilkan Void
                                            </Label>
                                            <Switch 
                                                id="show-void"
                                                checked={filterShowVoid} 
                                                onCheckedChange={setFilterShowVoid} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {displayedTransactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p>Belum ada transaksi.</p>
                        </div>
                    ) : (
                        <>
                            {displayedTransactions.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-slate-50/80 transition-all group cursor-pointer"
                                    onClick={() => {
                                        setSelectedTransaction(item);
                                        setIsDetailOpen(true);
                                    }}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
                                            item.tipe === 'masuk' 
                                                ? 'bg-green-100 border-green-200 text-green-600' 
                                                : 'bg-red-100 border-red-200 text-red-600'
                                        }`}>
                                            {item.tipe === 'masuk' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                                        </div>
                                        
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors ${item.keterangan?.startsWith('[VOID]') ? 'line-through text-muted-foreground' : ''}`}>
                                                {item.keterangan} <span className="text-muted-foreground font-normal text-xs sm:text-sm italic">({getUserDisplayName(users.find(u => u.id === (item.penggunaAnggaran || item.createdBy)), displayMode)})</span>
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <span>{formatTanggal(item.tanggal)}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <Badge variant="secondary" className="font-normal text-[10px] h-5 px-1.5 bg-slate-100 text-slate-600 border-slate-200">
                                                    {item.kategori}
                                                </Badge>
                                                {item.keterangan?.startsWith('[VOID]') && (
                                                    <Badge className="bg-red-600 hover:bg-red-600 text-white border-red-700 h-5 px-1.5 text-[10px] font-bold">VOID</Badge>
                                                )}
                                                {(isAdminOrOwner || isFinance) && (
                                                    <Badge variant="outline" className="font-normal text-[10px] h-5 px-1.5 border-blue-200 text-blue-600 bg-blue-50">
                                                        {cabang.find(c => c.id === (item.cabangId || users.find(u => u.id === item.createdBy)?.cabangId))?.nama || 'No Branch'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-0.5 ml-3">
                                        <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                                            item.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {item.tipe === 'masuk' ? '+' : '-'}{formatCurrency(item.jumlah)}
                                        </span>
                                        {item.buktiUrl && (
                                             <ImagePreviewModal 
                                                src={item.buktiUrl} 
                                                alt="Bukti Transaksi" 
                                                title={`Bukti - ${item.keterangan}`}
                                                trigger={
                                                    <button 
                                                        onClick={(e) => e.stopPropagation()} 
                                                        className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline focus:outline-none"
                                                    >
                                                        <FileText className="w-3 h-3" /> Bukti
                                                    </button>
                                                }
                                             />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {hasMore && (
                                <Button 
                                    variant="ghost" 
                                    className="w-full mt-4 border-dashed text-muted-foreground"
                                    onClick={() => setVisibleCount(prev => prev + 10)}
                                >
                                    Lihat Lainnya
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
                <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> Detail Transaksi
                </DialogTitle>
                {!selectedTransaction?.keterangan?.startsWith('[VOID]') && (isAdminOrOwner || ((isFinance || isManager || isLeader) && (!selectedTransaction?.keterangan || !selectedTransaction?.buktiUrl || !selectedTransaction?.penggunaAnggaran || !selectedTransaction?.kategori))) && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1.5"
                        onClick={() => {
                            setIsDetailOpen(false);
                            router.push(`/petty-cash/tambah?id=${selectedTransaction?.id}&type=${selectedTransaction?.tipe === 'masuk' ? 'masuk' : 'keluar'}`);
                        }}
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                    </Button>
                )}
                {isAdminOrOwner && !selectedTransaction?.keterangan?.startsWith('[VOID]') && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setIsVoidConfirmOpen(true)}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Void</span>
                    </Button>
                )}
            </div>
            <DialogDescription>
              Detail lengkap transaksi kas kecil.
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6 py-2">
              <div className={`p-4 rounded-xl flex flex-col items-center justify-center border-2 border-dashed ${
                selectedTransaction.tipe === 'masuk' 
                  ? 'bg-green-50 border-green-100' 
                  : 'bg-red-50 border-red-100'
              }`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Jumlah {selectedTransaction.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                </span>
                <span className={`text-3xl font-bold ${
                  selectedTransaction.tipe === 'masuk' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedTransaction.tipe === 'masuk' ? '+' : '-'}{formatCurrency(selectedTransaction.jumlah)}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <History className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Keterangan</p>
                    <p className="font-medium">
                        {selectedTransaction.keterangan} <span className="text-muted-foreground font-normal text-sm italic">({getUserDisplayName(users.find(u => u.id === (selectedTransaction.penggunaAnggaran || selectedTransaction.createdBy)), displayMode)})</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tanggal</p>
                      <p className="font-medium text-sm">{formatTanggal(selectedTransaction.tanggal)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Kategori</p>
                      <Badge variant="outline" className="mt-0.5">
                        {toProperCase(selectedTransaction.kategori)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cabang</p>
                    <p className="font-medium">
                        {cabang.find(c => c.id === (selectedTransaction.cabangId || users.find(u => u.id === selectedTransaction.createdBy)?.cabangId))?.nama || 'Global / Pusat'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pengguna Anggaran</p>
                    <p className="font-medium">
                        {getUserDisplayName(users.find(u => u.id === (selectedTransaction.penggunaAnggaran || selectedTransaction.createdBy)), displayMode)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Dicatat Oleh</p>
                    <p className="font-medium">
                      {getUserDisplayName(users.find(u => u.id === selectedTransaction.createdBy), displayMode)}
                    </p>
                  </div>
                </div>

                {selectedTransaction.buktiUrl && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Bukti Transaksi
                    </p>
                    <ImagePreviewModal 
                        src={selectedTransaction.buktiUrl} 
                        alt="Bukti" 
                        title={`Bukti - ${selectedTransaction.keterangan}`} 
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isVoidConfirmOpen} onOpenChange={setIsVoidConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Konfirmasi Void
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mem-void transaksi ini? 
              <br /><br />
              <strong>Data tidak akan dihapus</strong>, tetapi nominal akan diubah menjadi <strong>Rp 0</strong> dan saldo akan dikalkulasi ulang secara otomatis. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                    if (selectedTransaction) {
                        try {
                            await voidPettyCash(selectedTransaction.id);
                            toast.success('Transaksi berhasil di-void');
                            setIsDetailOpen(false);
                        } catch (error) {
                            toast.error('Gagal mem-void transaksi');
                        }
                    }
                }}
            >
              Ya, Void Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
