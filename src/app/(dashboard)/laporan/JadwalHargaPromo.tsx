'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock, Tag, Percent, Clock, CheckCircle, Info, Building2, Users, FileSpreadsheet, ArrowLeft, Search, Filter, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/utils';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ScopeFilters } from '@/components/shared/ScopeFilters';
import { Input } from '@/components/ui/input';

import { Barang as BarangType, Satuan, Kategori, Harga, Promo, PersetujuanPayload } from '@/types';

interface ScheduleItemBase {
    id: string;
    date: Date;
    title: string;
    subtitle?: string;
    status: 'pending' | 'active' | 'expired' | 'rejected';
    value: string;
    oldValue?: string;
    cabangId?: string;
    cabangIds?: string[];
    userId?: string;
}

interface ScheduleItemHarga extends ScheduleItemBase {
    type: 'harga';
    details: PersetujuanPayload | Harga;
}

interface ScheduleItemPromo extends ScheduleItemBase {
    type: 'promo';
    details: PersetujuanPayload | Promo;
}

type ScheduleItem = ScheduleItemHarga | ScheduleItemPromo;


export default function JadwalHargaPromo() {
    const router = useRouter();
    const { user } = useAuth();
    const { harga, promo, persetujuan, barang, satuan, cabang, kategoriPelanggan, users } = useDatabase();
    const [activeTab, setActiveTab] = useState('aktif');
    const [selectedItem, setSelectedItem] = useState<ScheduleItem | null>(null);
    const [displayLimit, setDisplayLimit] = useState(20);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        // Strict branch isolation: auto-select user's branch for non-admins
        const isAdminOrOwner = user?.roles.some(r => ['admin', 'owner'].includes(r));
        if (!isAdminOrOwner && user?.cabangId && selectedCabangIds.length === 0) {
            setSelectedCabangIds([user.cabangId]);
        }
    }, [user, selectedCabangIds.length]);

    useEffect(() => {
        setDisplayLimit(20);
    }, [activeTab]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'pending': return 'warning';
            case 'rejected': return 'destructive';
            case 'expired': return 'secondary';
            default: return 'outline';
        }
    };

    const getItems = (): ScheduleItem[] => {
        const items: ScheduleItem[] = [];
        const isGlobal = user?.roles.some(r => ['admin', 'owner'].includes(r));
        const userBranch = user?.cabangId;

        // 1. Pending Approvals (Future Schedule)
        persetujuan.filter(p => {
            if (p.status !== 'pending') return false;
            if (isGlobal) return true;
            
            const pData = p.data as PersetujuanPayload;
            const targetBranches = pData?.cabangIds || [];
            
            // Check singular target
            if (p.targetCabangId && p.targetCabangId === userBranch) return true;
            
            // Check multi-branch target
            if (targetBranches.length > 0) return targetBranches.includes(userBranch!);
            
            // If it's truly global (no specific target), visible to everyone
            return !p.targetCabangId && targetBranches.length === 0;
        }).forEach(p => {
            const pData = p.data as PersetujuanPayload;
            if (p.jenis === 'perubahan_harga' && pData) {
                const product = barang.find(b => b.id === pData.barangId);
                const unit = satuan.find(s => s.id === pData.satuanId);
                const dateRaw = pData.tanggalEfektif || p.tanggalPengajuan;
                let date = dateRaw ? new Date(dateRaw) : new Date();
                if (isNaN(date.getTime())) date = new Date();

                items.push({
                    id: p.id,
                    date: date,
                    type: 'harga',
                    title: product ? product.nama : 'Unknown Product',
                    subtitle: `Satuan: ${unit?.nama || '-'}`,
                    status: 'pending',
                    value: formatRupiah(pData.hargaBaru),
                    oldValue: pData.hargaLama ? formatRupiah(pData.hargaLama) : undefined,
                    details: pData,
                    cabangIds: pData.cabangIds || (p.targetCabangId ? [p.targetCabangId] : []),
                    userId: p.diajukanOleh
                });
            } else if (p.jenis === 'promo' && pData) {
                // Handle aliases for promo date in JSON payload
                const dateRaw = (pData.tanggalMulai || (pData as Record<string, unknown>).berlakuMulai || (pData as Record<string, unknown>).berlaku_mulai || p.tanggalPengajuan) as any;
                let date = dateRaw ? new Date(dateRaw) : new Date();
                if (isNaN(date.getTime())) date = new Date();

                items.push({
                    id: p.id,
                    date: date,
                    type: 'promo',
                    title: pData.nama,
                    subtitle: pData.kode,
                    status: 'pending',
                    value: pData.tipe === 'persen' ? `${pData.nilai}%` : (pData.tipe === 'produk' ? 'Free Item' : formatRupiah(pData.nilai)),
                    details: pData,
                    cabangIds: pData.cabangIds || (p.targetCabangId ? [p.targetCabangId] : []),
                    userId: p.diajukanOleh
                });
            }
        });

        // 2. Active / Approved Logic with Replacement
        const now = new Date();
        const groupedHarga: Record<string, typeof harga> = {};

        // Grouping for harga to find latest active and expired
        harga.filter(h => {
            if (h.status === 'ditolak') return false;
            if (isGlobal) return true;
            
            // Match singular branch
            if (h.cabangId && h.cabangId === userBranch) return true;
            
            // Match multi-branch array
            if (h.cabangIds && h.cabangIds.includes(userBranch!)) return true;
            
            // Global price (no branch restriction)
            return !h.cabangId && (!h.cabangIds || h.cabangIds.length === 0);
        }).forEach(h => {
            // Unique key for product pricing context: product + unit + minQty + branch + categories
            const key = `${h.barangId}-${h.satuanId}-${h.minQty || 0}-${h.cabangId || 'global'}-${(h.kategoriPelangganIds || []).sort().join(',')}`;
            if (!groupedHarga[key]) groupedHarga[key] = [];
            groupedHarga[key].push(h);
        });

        // Process each group to determine status
        Object.values(groupedHarga).forEach(group => {
            // Sort by effective date descending
            const sorted = group.sort((a, b) => {
                const dateA = new Date(a.tanggalEfektif || (a as { createdAt?: string }).createdAt || 0).getTime();
                const dateB = new Date(b.tanggalEfektif || (b as { createdAt?: string }).createdAt || 0).getTime();
                return dateB - dateA;
            });

            let foundActive = false;
            sorted.forEach(h => {
                const product = barang.find(b => b.id === h.barangId);
                const unit = satuan.find(s => s.id === h.satuanId);
                const dateStr = h.tanggalEfektif || (h as { createdAt?: string }).createdAt;
                let hDate = dateStr ? new Date(dateStr) : new Date();
                if (isNaN(hDate.getTime())) hDate = new Date();

                let status: 'active' | 'pending' | 'expired' = 'active';

                // If explicitly pending in DB, it's pending regardless of date
                if (h.status === 'pending' || hDate > now) {
                    status = 'pending';
                } else if (!foundActive && h.status === 'disetujui') {
                    status = 'active';
                    foundActive = true;
                } else {
                    status = 'expired';
                }

                items.push({
                    id: h.id,
                    date: hDate,
                    type: 'harga',
                    title: product ? product.nama : 'Unknown Product',
                    subtitle: `Satuan: ${unit?.nama || '-'} ${h.minQty ? `(Min: ${h.minQty})` : ''}`,
                    status: status,
                    value: formatRupiah(h.harga),
                    details: h,
                    cabangIds: h.cabangIds || (h.cabangId ? [h.cabangId] : []),
                    userId: h.disetujuiOleh
                });
            });
        });

        // Promo
        promo.filter(p => {
            if (isGlobal) return true;
            
            // Match singular branch
            if (p.cabangId && p.cabangId === userBranch) return true;
            
            // Match multi-branch array
            if (p.cabangIds && p.cabangIds.includes(userBranch!)) return true;
            
            // Global promo
            return !p.cabangId && (!p.cabangIds || p.cabangIds.length === 0);
        }).forEach(p => {
            const now = new Date();
            // Handle property name mismatch (DB: berlaku_mulai -> Camel: berlakuMulai vs Frontend: tanggalMulai)
            const startDateRaw = (p.tanggalMulai || (p as any).berlakuMulai || (p as any).berlaku_mulai) as any;
            let start = startDateRaw ? new Date(startDateRaw) : new Date();
            if (isNaN(start.getTime())) start = new Date();

            const endDateRaw = (p.tanggalBerakhir || (p as any).berlakuSampai || (p as any).berlaku_sampai) as any;
            let end = endDateRaw ? new Date(endDateRaw) : null;
            if (end && isNaN(end.getTime())) end = null;

            let status: 'active' | 'expired' | 'pending' = 'active';

            // Check for invalid dates
            if (isNaN(start.getTime())) {
                console.warn("Invalid start date for promo:", p);
            }

            if (!p.isActive && !(p as any).aktif) status = 'expired'; // Or inactive (check both keys)
            else if (end && end < now) status = 'expired';
            else if (start > now) status = 'pending'; // Future active

            items.push({
                id: p.id,
                date: start,
                type: 'promo',
                title: p.nama,
                subtitle: p.kode,
                status: status,
                value: p.tipe === 'persen' ? `${p.nilai}%` : (p.tipe === 'produk' ? 'Free Item' : formatRupiah(p.nilai)),
                details: p,
                cabangIds: p.cabangIds || (p.cabangId ? [p.cabangId] : [])
            });
        });

        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    };

    const allItems = getItems();

    const availableCabangIds = useMemo(() => {
        const cabs = new Set<string>();
        allItems.forEach(item => {
            if (item.cabangIds && item.cabangIds.length > 0) {
                item.cabangIds.forEach(id => cabs.add(id));
            }
        });
        return Array.from(cabs);
    }, [allItems]);

    // Custom sorting: Active first, then by date desc
    const sortedItems = [...allItems].sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return b.date.getTime() - a.date.getTime();
    });

    const filteredItems = sortedItems.filter(item => {
        // Tab filter
        if (activeTab === 'aktif' && item.status !== 'active') return false;
        if (activeTab !== 'aktif' && item.type !== activeTab) return false;

        // Search filter
        if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) && !item.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }

        // Branch filter
        if (selectedCabangIds.length > 0) {
            const itemBranchIds = item.cabangIds || [];
            if (itemBranchIds.length === 0) return true; // Global matches everything
            if (!itemBranchIds.some(id => selectedCabangIds.includes(id))) return false;
        }

        return true;
    });



    const handleExportExcel = () => {
        if (allItems.length === 0) {
            toast.error("Tidak ada data untuk diexport");
            return;
        }
        try {
            const wb = XLSX.utils.book_new();

            // Separate by type for cleaner sheets
            const hargaItems = allItems.filter(i => i.type === 'harga') as ScheduleItemHarga[];
            const promoItems = allItems.filter(i => i.type === 'promo') as ScheduleItemPromo[];

            if (hargaItems.length > 0) {
                const hargaData = hargaItems.map(item => ({
                    "Tanggal": format(item.date, 'yyyy-MM-dd'),
                    "Nama Barang": item.title,
                    "Detail": item.subtitle,
                    "Harga Baru": item.value,
                    "Status": item.status,
                    "Target Pelanggan": item.details.kategoriPelangganIds ? item.details.kategoriPelangganIds.length + " Kategori" : "Semua"
                }));
                const wsHarga = XLSX.utils.json_to_sheet(hargaData);
                wsHarga['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, wsHarga, "Riwayat Harga");
            }

            if (promoItems.length > 0) {
                const promoData = promoItems.map(item => ({
                    "Mulai": format(item.date, 'yyyy-MM-dd'),
                    "Nama Promo": item.title,
                    "Kode": item.subtitle,
                    "Nilai": item.value,
                    "Status": item.status,
                    "Scope": item.details.scope === 'all' ? 'Semua Produk' : 'Produk Terpilih',
                    "Berakhir": item.details.tanggalBerakhir ? format(new Date(item.details.tanggalBerakhir), 'yyyy-MM-dd') : 'Seterusnya'
                }));
                const wsPromo = XLSX.utils.json_to_sheet(promoData);
                wsPromo['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 12 }];
                XLSX.utils.book_append_sheet(wb, wsPromo, "Daftar Promo");
            }

            XLSX.writeFile(wb, `Jadwal_HargaPromo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            toast.success("Excel jadwal berhasil diunduh");

        } catch (err) {
            console.error("Export Error:", err);
            toast.error("Gagal export Excel");
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                    <Button variant="ghost" onClick={() => router.push('/laporan')} className="pl-0">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                    </Button>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight">Jadwal Harga & Promo</h1>
                        <p className="text-xs md:text-base text-muted-foreground">Monitor perubahan harga dan promo.</p>
                    </div>
                    <div className="grid grid-cols-2 md:flex md:items-center gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-auto py-2 bg-white border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 md:mr-2 col-span-2 md:col-span-1">
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
                        </Button>

                        <Card className="bg-blue-50 border-blue-100 p-2 md:p-3 flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3 shadow-none">
                            <Clock className="text-blue-600 w-4 h-4 md:w-5 md:h-5 mb-1 md:mb-0" />
                            <div>
                                <p className="text-[10px] md:text-xs text-blue-600 font-bold uppercase">Menunggu</p>
                                <p className="font-bold text-base md:text-xl text-blue-800 leading-none">{allItems.filter(i => i.status === 'pending').length}</p>
                            </div>
                        </Card>
                        <Card className="bg-green-50 border-green-100 p-2 md:p-3 flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-3 shadow-none">
                            <CheckCircle className="text-green-600 w-4 h-4 md:w-5 md:h-5 mb-1 md:mb-0" />
                            <div>
                                <p className="text-[10px] md:text-xs text-green-600 font-bold uppercase">Aktif</p>
                                <p className="font-bold text-base md:text-xl text-green-800 leading-none">{allItems.filter(i => i.status === 'active').length}</p>
                            </div>
                        </Card>
                    </div>
                </div>

                <Tabs defaultValue="aktif" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/50">
                        <TabsTrigger value="aktif" className="text-[10px] md:text-sm py-1.5 md:py-2">Aktif</TabsTrigger>
                        <TabsTrigger value="harga" className="text-[10px] md:text-sm py-1.5 md:py-2">Harga</TabsTrigger>
                        <TabsTrigger value="promo" className="text-[10px] md:text-sm py-1.5 md:py-2">Promo</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 flex flex-col md:flex-row gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari produk atau promo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-10"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="h-10 gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            {showFilters ? 'Tutup Filter' : 'Filter Lanjut'}
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="mt-2 p-4 border rounded-lg bg-slate-50/50 animate-in slide-in-from-top-2 duration-300">
                            <ScopeFilters
                                selectedCabangIds={selectedCabangIds}
                                setSelectedCabangIds={setSelectedCabangIds}
                                selectedUserIds={[]}
                                setSelectedUserIds={() => {}}
                                availableCabangIds={availableCabangIds}
                                showUserFilter={false}
                            />
                        </div>
                    )}

                    <TabsContent value={activeTab} className="mt-3 md:mt-4 space-y-2 md:space-y-4">
                        {filteredItems.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed text-xs md:text-sm">
                                Tidak ada data jadwal.
                            </div>
                        ) : (
                            <>
                                {filteredItems.slice(0, displayLimit).map(item => (
                                    <Card
                                        key={`${item.type}-${item.id}`}
                                        className="overflow-hidden hover:bg-slate-50 transition-colors border shadow-sm cursor-pointer active:scale-[0.99]"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div className="flex items-stretch border-l-[3px] md:border-l-4 border-l-blue-500">
                                            <div className="p-2 md:p-4 flex-1 space-y-1.5 md:space-y-2">
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <Badge variant={item.type === 'harga' ? 'outline' : 'default'} className={`h-5 px-1.5 text-[10px] md:text-xs ${item.type === 'promo' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 shadow-none border-purple-200 whitespace-nowrap' : 'whitespace-nowrap'}`}>
                                                            {item.type === 'harga' ? <Tag className="w-3 h-3 mr-1" /> : <Percent className="w-3 h-3 mr-1" />}
                                                            {item.type === 'harga' ? 'Harga' : 'Promo'}
                                                        </Badge>
                                                        <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                                            <CalendarClock className="w-3 h-3" />
                                                            {format(item.date, 'dd MMM yy', { locale: localeId })}
                                                        </span>
                                                    </div>
                                                    <div className="self-start">
                                                        <Badge variant={getStatusColor(item.status)} className="capitalize whitespace-nowrap text-[10px] h-5 px-1.5">
                                                            {item.status === 'pending' ? 'Menunggu' : item.status}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                                     <div>
                                                         <p className="font-bold text-sm md:text-lg leading-tight truncate max-w-[200px] md:max-w-none">{item.title}</p>
                                                         {item.subtitle && <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5">{item.subtitle}</p>}
                                                         {item.cabangIds && item.cabangIds.length > 0 ? (
                                                             <div className="flex flex-wrap gap-1 mt-1">
                                                                 {item.cabangIds
                                                                    .map(id => ({ id, nama: cabang.find(c => c.id === id)?.nama || id }))
                                                                    .sort((a, b) => a.nama.localeCompare(b.nama))
                                                                    .slice(0, 3)
                                                                    .map(c => (
                                                                     <Badge key={c.id} variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-100">
                                                                         {c.nama}
                                                                     </Badge>
                                                                 ))}
                                                                 {item.cabangIds.length > 3 && (
                                                                     <span className="text-[9px] text-muted-foreground">+{item.cabangIds.length - 3}</span>
                                                                 )}
                                                             </div>
                                                         ) : (
                                                             <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                                                 <Building2 className="w-3 h-3" /> Global (Semua Cabang)
                                                             </p>
                                                         )}
                                                     </div>
                                                      <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-1.5 sm:p-0 rounded sm:rounded-none flex items-center justify-between sm:block">
                                                         <p className="text-[10px] text-muted-foreground uppercase sm:hidden md:block">Nilai</p>
                                                         <div className="flex flex-col items-end">
                                                            <p className="font-bold text-base md:text-xl font-mono text-primary">{item.value}</p>
                                                            {item.oldValue && (
                                                                <p className="text-[10px] text-muted-foreground line-through decoration-destructive/50">{item.oldValue}</p>
                                                            )}
                                                         </div>
                                                     </div>
                                                 </div>

                                                {item.type === 'harga' && item.details.grosir?.length > 0 && (
                                                    <div className="pt-1.5 border-t flex gap-3 text-[10px] md:text-xs text-muted-foreground">
                                                        <span>Grosir: {item.details.grosir.length} Tiers</span>
                                                    </div>
                                                )}
                                                {item.type === 'promo' && (
                                                    <div className="pt-1.5 border-t flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] md:text-xs text-muted-foreground">
                                                        <span>Scope: {item.details.scope === 'all' ? 'All' : 'Select'}</span>
                                                        {(() => {
                                                            const dateRaw = (item.details.tanggalBerakhir || (item.details as any).berlakuSampai || (item.details as any).berlaku_sampai) as any;
                                                            const d = dateRaw ? new Date(dateRaw) : null;
                                                            return d && !isNaN(d.getTime()) ? <span>Exp: {format(d, 'dd MMM yy', { locale: localeId })}</span> : null;
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {filteredItems.length > displayLimit && (
                                    <Button
                                        variant="ghost"
                                        className="w-full mt-4 border-dashed text-muted-foreground"
                                        onClick={() => setDisplayLimit(prev => prev + 20)}
                                    >
                                        Lihat Lainnya
                                    </Button>
                                )}
                            </>
                        )
                        }
                    </TabsContent>
                </Tabs>

                <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
                    <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                        {selectedItem && (
                            <div className="space-y-6">
                                <SheetHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={selectedItem.type === 'harga' ? 'outline' : 'default'} className={selectedItem.type === 'promo' ? 'bg-purple-100 text-purple-700' : ''}>
                                            {selectedItem.type === 'harga' ? 'Perubahan Harga' : 'Program Promo'}
                                        </Badge>
                                        <Badge variant={getStatusColor(selectedItem.status)} className="capitalize">
                                            {selectedItem.status === 'pending' ? 'Menunggu Review' : selectedItem.status}
                                        </Badge>
                                    </div>
                                    <SheetTitle className="text-xl">{selectedItem.title}</SheetTitle>
                                    <SheetDescription>
                                        {selectedItem.subtitle}
                                        <br />
                                        <span className="flex items-center gap-1 mt-1 text-xs">
                                            <CalendarClock className="w-3 h-3" />
                                            Efektif: {format(selectedItem.date, 'EEEE, dd MMMM yyyy', { locale: localeId })}
                                        </span>
                                    </SheetDescription>
                                </SheetHeader>

                                {/* PRICE DETAILS */}
                                {selectedItem.type === 'harga' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-lg border">
                                            <Label className="text-xs text-muted-foreground uppercase">Harga Baru</Label>
                                            <p className="text-2xl font-bold text-primary">{selectedItem.value}</p>
                                            {selectedItem.details.satuanId && (
                                                <p className="text-sm text-muted-foreground">
                                                    Per {satuan.find(s => s.id === selectedItem.details.satuanId)?.nama || 'Unit'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Tiers */}
                                        {selectedItem.details.grosir && selectedItem.details.grosir.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                                                    <Tag className="w-4 h-4" /> Harga Grosir (Tier)
                                                </h4>
                                                <div className="rounded-md border block overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="hover:bg-transparent">
                                                                <TableHead className="h-8 text-xs bg-muted/50">Min</TableHead>
                                                                <TableHead className="h-8 text-xs bg-muted/50">Max</TableHead>
                                                                <TableHead className="h-8 text-xs text-right bg-muted/50">Harga</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {selectedItem.details.grosir.map((g, idx: number) => (
                                                                <TableRow key={idx} className="hover:bg-transparent">
                                                                    <TableCell className="py-2 text-xs">{g.min}</TableCell>
                                                                    <TableCell className="py-2 text-xs">{g.max}</TableCell>
                                                                    <TableCell className="py-2 text-right font-medium text-xs">{formatRupiah(g.harga)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Targets */}
                                        <div className="space-y-3 pt-2">
                                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                                <Info className="w-4 h-4" /> Target Berlaku
                                            </h4>

                                            <div className="flex items-start gap-2 text-sm">
                                                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Cabang</p>
                                                    <p className="text-muted-foreground text-xs">
                                                     <div className="flex flex-wrap gap-1">
                                                        {selectedItem.details.cabangIds && selectedItem.details.cabangIds.length > 0 ? (
                                                            selectedItem.details.cabangIds
                                                                .map((id: string) => ({ id, nama: cabang.find(c => c.id === id)?.nama || id }))
                                                                .sort((a: any, b: any) => a.nama.localeCompare(b.nama))
                                                                .map((c: any) => (
                                                                <Badge key={c.id} variant="secondary" className="text-[10px]">
                                                                    {c.nama}
                                                                </Badge>
                                                            ))
                                                        ) : selectedItem.details.cabangId ? (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {cabang.find(c => c.id === selectedItem.details.cabangId)?.nama || selectedItem.details.cabangId}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs italic">Semua Cabang (Global)</span>
                                                        )}
                                                     </div>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-2 text-sm">
                                                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="font-medium">Kategori Pelanggan</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {selectedItem.details.kategoriPelangganIds && selectedItem.details.kategoriPelangganIds.length > 0
                                                            ? selectedItem.details.kategoriPelangganIds.map((id: string) => kategoriPelanggan.find(k => k.id === id)?.nama).join(', ')
                                                            : 'Semua Pelanggan'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PROMO DETAILS */}
                                {selectedItem.type === 'promo' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                            <Label className="text-xs text-muted-foreground uppercase">Nilai Promo</Label>
                                            <p className="text-2xl font-bold text-purple-700">{selectedItem.value}</p>
                                            {selectedItem.details.tipe === 'produk' && (
                                                <p className="text-sm text-purple-600 mt-1">
                                                    Bonus {selectedItem.details.nilai} Unit Produk
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-sm">Detail & Syarat</h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="p-2 border rounded bg-slate-50">
                                                    <span className="text-xs text-muted-foreground block">Tipe</span>
                                                    <span className="font-medium capitalize">{selectedItem.details.tipe}</span>
                                                </div>
                                                <div className="p-2 border rounded bg-slate-50">
                                                    <span className="text-xs text-muted-foreground block">Scope</span>
                                                    <span className="font-medium capitalize">{selectedItem.details.scope === 'all' ? 'Semua Produk' : 'Produk Terpilih'}</span>
                                                </div>
                                                <div className="p-2 border rounded bg-slate-50 col-span-2">
                                                    <span className="text-xs text-muted-foreground block">Berlaku Sampai</span>
                                                    <span className="font-medium">
                                                        {(() => {
                                                            const dateRaw = (selectedItem.details.tanggalBerakhir || (selectedItem.details as any).berlakuSampai || (selectedItem.details as any).berlaku_sampai) as any;
                                                            const dateObj = dateRaw ? new Date(dateRaw) : null;
                                                            return dateObj && !isNaN(dateObj.getTime())
                                                                ? format(dateObj, 'dd MMMM yyyy', { locale: localeId })
                                                                : 'Seterusnya';
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedItem.details.scope === 'selected_products' && selectedItem.details.targetProdukIds?.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold mb-2 text-sm">Produk Terkait</h4>
                                                <div className="border rounded-md max-h-40 overflow-y-auto p-2 bg-slate-50">
                                                    <ul className="space-y-1 text-sm">
                                                        {selectedItem.details.targetProdukIds
                                                            .map((id: string) => ({ id, nama: barang.find(b => b.id === id)?.nama || 'Unknown Product' }))
                                                            .sort((a: any, b: any) => a.nama.localeCompare(b.nama))
                                                            .map((p: any) => (
                                                            <li key={p.id} className="flex items-center gap-2">
                                                                <CheckCircle className="w-3 h-3 text-green-600" />
                                                                {p.nama}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedItem.status === 'pending' && (
                                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border-yellow-200 border">
                                        Item ini masih menunggu persetujuan manager sebelum aktif.
                                    </div>
                                )}
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

            </div>
        </div>
    );
}
