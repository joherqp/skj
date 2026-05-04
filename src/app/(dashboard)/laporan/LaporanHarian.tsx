'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatRupiah, formatNumber, getUserDisplayName } from '@/lib/utils';
import {
    ArrowLeft,
    Printer,
    Calendar,
    BarChart3,
    Package,
    DollarSign,
    TrendingDown,
    TrendingUp,
    History,
    Download,
    AlertCircle,
    Users,
    ChevronDown,
    Search,
    RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isAfter } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter as FilterIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { ScopeFilters } from '@/components/shared/ScopeFilters';
import { Progress } from '@/components/ui/progress';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface SalesTargetDB {
    id: string;
    jenis: 'bulanan' | 'mingguan' | 'harian';
    target_type: 'nominal' | 'qty';
    nilai: number;
    scope: 'cabang' | 'sales';
    cabang_id?: string;
    sales_id?: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    is_looping: boolean;
}

interface DailyDepositEntry {
    id: string;
    tanggal: Date;
    jumlah: number;
    status: 'pending' | 'diterima' | 'ditolak' | 'disetujui';
    salesId?: string;
    userId?: string;
    cabangId?: string;
    catatan?: string;
    sumber: 'setoran' | 'pusat';
}

const fmt = (num: number) => {
    if (num === 0) return '0';
    if (num % 1 === 0) return num.toString();
    return num.toFixed(2);
};

export default function LaporanHarian() {
    const router = useRouter();
    const qrRef = useRef<HTMLDivElement>(null);
    const { user: currentUser } = useAuth();
    const {
        penjualan, barang, profilPerusahaan, users,
        cabang, stokPengguna, persetujuan, setoran, saldoPengguna, satuan,
        mutasiBarang, penyesuaianStok, pelanggan, kategoriPelanggan, stokHarian
    } = useDatabase();
    const tampilNama = profilPerusahaan?.config?.tampilNama || 'nama';

    const [pembayaran, setPembayaran] = useState<Record<string, unknown>[]>([]);
    const [isRefreshingPayments, setIsRefreshingPayments] = useState(false);
    const [activeTargets, setActiveTargets] = useState<SalesTargetDB[]>([]);
    const [isRefreshingTargets, setIsRefreshingTargets] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
    const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
    const isLeaderOrFinance = currentUser?.roles.some(r => ['leader', 'finance'].includes(r));
    const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Sync selectedCabangIds with currentUser on load
    useEffect(() => {
        if (currentUser && !isAdminOrOwner && selectedCabangIds.length === 0) {
            if (currentUser.cabangId) {
                setSelectedCabangIds([currentUser.cabangId]);
            }
        }
    }, [currentUser, isAdminOrOwner]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);



    // Force branch filter for non-admin/owner
    useEffect(() => {
        if (currentUser && !isAdminOrOwner && currentUser.cabangId) {
            setSelectedCabangIds([currentUser.cabangId]);
        }
    }, [currentUser, isAdminOrOwner]);

    useEffect(() => {
        const fetchPayments = async () => {
            const dayStart = startOfDay(new Date(selectedDate)).toISOString();

            setIsRefreshingPayments(true);
            try {
                const { data, error } = await supabase
                    .from('pembayaran_penjualan')
                    .select('*')
                    .gte('tanggal', dayStart);

                if (error) throw error;
                setPembayaran(data || []);
            } catch (err) {
                console.error("Fetch payments error:", err);
            } finally {
                setIsRefreshingPayments(false);
            }
        };
        fetchPayments();
    }, [selectedDate]);

    useEffect(() => {
        const fetchTargets = async () => {
            setIsRefreshingTargets(true);
            try {
                const { data, error } = await supabase
                    .from('sales_targets')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                setActiveTargets(data || []);
            } catch (err) {
                console.error("Fetch targets error:", err);
            } finally {
                setIsRefreshingTargets(false);
            }
        };
        fetchTargets();
    }, []);

    const { availableCabangIds, availableUserIds } = useMemo(() => {
        if (!currentUser) return { availableCabangIds: [], availableUserIds: [] };
        const date = new Date(selectedDate);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const relevantSales = penjualan.filter(p => {
            const pDate = new Date(p.tanggal);
            return pDate >= dayStart && pDate <= dayEnd && p.status !== 'batal' && p.status !== 'draft';
        });

        const cIds = new Set<string>();
        const uIds = new Set<string>();

        relevantSales.forEach(p => {
            if (p.cabangId) cIds.add(p.cabangId);
            if (p.salesId) uIds.add(p.salesId);
            if (p.createdBy) uIds.add(p.createdBy);
        });

        return {
            availableCabangIds: Array.from(cIds),
            availableUserIds: Array.from(uIds)
        };
    }, [selectedDate, penjualan]);

    const reportData = useMemo(() => {
        if (!currentUser) return null;
        const date = new Date(selectedDate);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const effectiveCabangIds = (selectedCabangIds.length === 0 && !isAdminOrOwner && currentUser?.cabangId)
            ? [currentUser.cabangId]
            : selectedCabangIds;

        const effectiveUserIds = (!isAdminOrOwner && !isLeaderOrFinance) 
            ? [currentUser.id] 
            : selectedUserIds;

        const isUserScope = effectiveUserIds.length > 0;
        const isGlobalView = isAdminOrOwner && effectiveCabangIds.length === 0 && !isUserScope;
        const scopeUserIds = isUserScope
            ? effectiveUserIds
            : (isGlobalView
                ? users.map(u => u.id)
                : users.filter(u => u.cabangId && effectiveCabangIds.includes(u.cabangId)).map(u => u.id));

        // Filter sales for the day and branch/user
        const filteredSales = penjualan.filter(p => {
            const pDate = new Date(p.tanggal);
            const inDate = pDate >= dayStart && pDate <= dayEnd;

            // Branch Filter
            const inBranch = isGlobalView || isUserScope || (p.cabangId && effectiveCabangIds.includes(p.cabangId));

            // User/Sales Filter
            const inUser = effectiveUserIds.length === 0 || effectiveUserIds.includes(p.salesId) || effectiveUserIds.includes(p.createdBy);

            return inDate && inBranch && inUser && p.status !== 'batal' && p.status !== 'draft';
        });

        // 1. Sales Summary
        const tunaiSales = filteredSales.filter(p => p.metodePembayaran === 'tunai');
        const tempoSales = filteredSales.filter(p => p.metodePembayaran === 'tempo');

        const totalOmzet = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
        const totalTunai = tunaiSales.reduce((acc, curr) => acc + curr.total, 0);
        const totalTempo = tempoSales.reduce((acc, curr) => acc + curr.total, 0);

        const totalQty = filteredSales.reduce((acc, p) =>
            acc + p.items.reduce((s, i) => s + (!i.isBonus && i.subtotal > 0 ? (i.jumlah * (i.konversi || 1)) : 0), 0)
            , 0);

        const totalPromoQty = filteredSales.reduce((acc, p) =>
            acc + p.items.reduce((s, i) => s + (i.isBonus || i.subtotal === 0 ? (i.jumlah * (i.konversi || 1)) : 0), 0)
            , 0);
        // 1b. Category Summary
        const categorySummaryMap = new Map<string, {
            nama: string,
            count: number,
            qty: number,
            total: number
        }>();

        filteredSales.forEach(p => {
            const customer = pelanggan.find(pl => pl.id === p.pelangganId);
            const categoryId = customer?.kategoriId || 'unknown';
            const categoryName = kategoriPelanggan.find(k => k.id === categoryId)?.nama || 'Umum';

            const pQty = p.items.reduce((s, i) => s + (!i.isBonus && i.subtotal > 0 ? (i.jumlah * (i.konversi || 1)) : 0), 0);

            if (!categorySummaryMap.has(categoryName)) {
                categorySummaryMap.set(categoryName, {
                    nama: categoryName,
                    count: 1,
                    qty: pQty,
                    total: p.total
                });
            } else {
                const existing = categorySummaryMap.get(categoryName)!;
                existing.count += 1;
                existing.qty += pQty;
                existing.total += p.total;
            }
        });

        // 2. Stock Movement Summary (Using stokHarian from DB)
        const stockMovementMap = new Map<string, {
            nama: string,
            awal: number,
            masuk: number,
            keluar: number,
            terjual: number,
            promo: number,
            akhir: number,
            satuan: string
        }>();

        // Filter stokHarian by date and scope
        const filteredStokHarian = stokHarian.filter(sh => {
            // Ensure comparison is safe (handle date strings or objects)
            const shDateStr = sh.tanggal instanceof Date 
                ? format(sh.tanggal, 'yyyy-MM-dd') 
                : sh.tanggal.toString().split('T')[0];
            
            if (shDateStr !== selectedDate) return false;

            const inBranch = isGlobalView || isUserScope || (sh.cabangId && effectiveCabangIds.includes(sh.cabangId));
            const inUser = selectedUserIds.length === 0 || (sh.userId && selectedUserIds.includes(sh.userId));
            
            return inBranch && inUser;
        });

        filteredStokHarian.forEach(sh => {
            const item = barang.find(b => b.id === sh.barangId);
            if (!item) return;

            const existing = stockMovementMap.get(sh.barangId);
            const awal = Number(sh.stokAwal);
            const masuk = Number(sh.masuk);
            const keluar = Number(sh.keluar);
            const terjual = Number(sh.terjual);
            const promo = Number(sh.promo);
            const akhir = Number(sh.stokAkhir);

            if (!existing) {
                const sItem = satuan.find(s => s.id === item.satuanId);
                stockMovementMap.set(sh.barangId, {
                    nama: item.nama,
                    awal,
                    masuk,
                    keluar,
                    terjual,
                    promo,
                    akhir,
                    satuan: sItem?.simbol || ''
                });
            } else {
                existing.awal += awal;
                existing.masuk += masuk;
                existing.keluar += keluar;
                existing.terjual += terjual;
                existing.promo += promo;
                existing.akhir += akhir;
            }
        });

        // 3. Financial Summary (Cash Reconciliation)
        const dailySetoranRegular: DailyDepositEntry[] = setoran.filter(s => {
            const sDate = new Date(s.tanggal);
            const inDate = sDate >= dayStart && sDate <= dayEnd;
            const inBranch = isGlobalView || isUserScope || effectiveCabangIds.includes(s.cabangId || users.find(u => u.id === (s.salesId || s.userId))?.cabangId || '');
            const depositUserId = s.salesId || s.userId;
            const inUser = selectedUserIds.length === 0 || (depositUserId ? selectedUserIds.includes(depositUserId) : false);
            return inDate && inBranch && inUser;
        }).map(s => ({
            id: s.id,
            tanggal: new Date(s.tanggal),
            jumlah: s.jumlah,
            status: s.status,
            salesId: s.salesId,
            userId: s.userId,
            cabangId: s.cabangId || users.find(u => u.id === (s.salesId || s.userId))?.cabangId,
            catatan: s.catatan || s.keterangan,
            sumber: 'setoran',
        }));

        const dailySetoranPusat: DailyDepositEntry[] = persetujuan.filter(p => {
            if (p.jenis !== 'rencana_setoran') return false;
            const pDate = new Date(p.tanggalPengajuan);
            const inDate = pDate >= dayStart && pDate <= dayEnd;
            if (!inDate) return false;

            const payload = p.data || {};
            const senderCabangId = typeof payload.senderCabangId === 'string' ? payload.senderCabangId : undefined;
            const inBranch = isGlobalView || isUserScope || (senderCabangId ? effectiveCabangIds.includes(senderCabangId) : false);
            const inUser = effectiveUserIds.length === 0 || effectiveUserIds.includes(p.diajukanOleh);

            return inBranch && inUser;
        }).map(p => {
            const payload = p.data || {};
            return {
                id: p.id,
                tanggal: new Date(p.tanggalPengajuan),
                jumlah: Number(payload.amount || 0),
                status: p.status,
                salesId: p.diajukanOleh,
                userId: p.diajukanOleh,
                cabangId: typeof payload.senderCabangId === 'string' ? payload.senderCabangId : undefined,
                catatan: p.catatan || (typeof payload.catatan === 'string' ? payload.catatan : undefined),
                sumber: 'pusat',
            };
        });

        const dailySetoran = [...dailySetoranRegular, ...dailySetoranPusat];

        const totalSetoranValid = dailySetoran
            .filter(s => s.status === 'disetujui' || s.status === 'diterima')
            .reduce((acc, curr) => acc + curr.jumlah, 0);

        const totalSetoranPending = dailySetoran
            .filter(s => s.status === 'pending')
            .reduce((acc, curr) => acc + curr.jumlah, 0);

        const depositNotes = dailySetoran
            .filter(s => s.catatan && s.catatan.trim().length > 0)
            .sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime())
            .map(s => ({
                id: s.id,
                waktu: format(s.tanggal, 'HH:mm'),
                salesName: (() => { const u = users.find(u => u.id === (s.salesId || s.userId)); return u ? getUserDisplayName(u, tampilNama) : 'Unknown'; })(),
                jumlah: s.jumlah,
                status: s.status,
                sumber: s.sumber,
                catatan: s.catatan!.trim(),
            }));

        // 3. Financial Summary (Cash Reconciliation)
        // Calculate Cash In from Today's Cash Sales (bayar - kembalian)
        const cashFromTunaiSales = filteredSales
            .filter(p => p.metodePembayaran === 'tunai')
            .reduce((acc, curr) => acc + (curr.bayar || 0) - (curr.kembalian || 0), 0);

        // Also include payments from pembayaran_penjualan table (for tempo payments that are being paid today)
        const scopedPembayaran = pembayaran.filter(p => {
            const sale = penjualan.find(s => s.id === p.penjualanId);
            if (!sale || sale.status === 'batal') return false;

            const inBranch = isGlobalView || isUserScope || (sale.cabangId && effectiveCabangIds.includes(sale.cabangId));
            const inUser = effectiveUserIds.length === 0 || effectiveUserIds.includes(sale.salesId) || effectiveUserIds.includes(sale.createdBy);

            return inBranch && inUser;
        });

        const validPembayaranToday = scopedPembayaran.filter(p => {
            const paymentDate = new Date(p.tanggal as string);
            return paymentDate >= dayStart && paymentDate <= dayEnd;
        });

        const cashFromPayments = validPembayaranToday.reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        // Total Cash In = Cash from Tunai Sales + Payments from Table
        const cashCollectionToday = cashFromTunaiSales + cashFromPayments;

        const currentSaldoBelumSetor = saldoPengguna
            .filter(s => scopeUserIds.includes(s.userId))
            .reduce((sum, s) => sum + s.saldo, 0);

        const cashInFromSelectedDayOnwardsSales = penjualan
            .filter(p => {
                const pDate = new Date(p.tanggal);
                const inDate = pDate >= dayStart;
                const inBranch = isGlobalView || isUserScope || (p.cabangId && effectiveCabangIds.includes(p.cabangId));
                const inUser = effectiveUserIds.length === 0 || effectiveUserIds.includes(p.salesId) || effectiveUserIds.includes(p.createdBy);
                return inDate && inBranch && inUser && p.status === 'lunas' && p.metodePembayaran === 'tunai';
            })
            .reduce((acc, curr) => acc + (curr.bayar || 0) - (curr.kembalian || 0), 0);

        const cashInFromSelectedDayOnwardsPayments = scopedPembayaran
            .filter(p => new Date(p.tanggal as string) >= dayStart)
            .reduce((acc, curr) => acc + Number(curr.jumlah), 0);

        const cashOutFromSelectedDayOnwardsRegular = setoran
            .filter(s => {
                const sDate = new Date(s.tanggal);
                const inDate = sDate >= dayStart;
                const inBranch = isGlobalView || isUserScope || effectiveCabangIds.includes(s.cabangId || users.find(u => u.id === (s.salesId || s.userId))?.cabangId || '');
                const depositUserId = s.salesId || s.userId;
                const inUser = effectiveUserIds.length === 0 || (depositUserId ? effectiveUserIds.includes(depositUserId) : false);
                const isApproved = s.status === 'disetujui' || s.status === 'diterima';
                return inDate && inBranch && inUser && isApproved;
            })
            .reduce((acc, curr) => acc + curr.jumlah, 0);

        const cashOutFromSelectedDayOnwardsPusat = persetujuan
            .filter(p => {
                if (p.jenis !== 'rencana_setoran' || p.status !== 'disetujui') return false;
                const pDate = new Date(p.tanggalPengajuan);
                if (pDate < dayStart) return false;

                const payload = p.data || {};
                const senderCabangId = typeof payload.senderCabangId === 'string' ? payload.senderCabangId : undefined;
                const inBranch = isGlobalView || isUserScope || (senderCabangId ? effectiveCabangIds.includes(senderCabangId) : false);
                const inUser = effectiveUserIds.length === 0 || effectiveUserIds.includes(p.diajukanOleh);

                return inBranch && inUser;
            })
            .reduce((acc, curr) => acc + Number((curr.data || {}).amount || 0), 0);

        const saldoBelumSetorSebelumnya = currentSaldoBelumSetor
            - (cashInFromSelectedDayOnwardsSales + cashInFromSelectedDayOnwardsPayments)
            + cashOutFromSelectedDayOnwardsRegular
            + cashOutFromSelectedDayOnwardsPusat;

        // 5. Detailed Summaries
        const productSummaryMap = new Map<string, { nama: string; qty: number; total: number; satuan: string }>();
        const salesSummaryMap = new Map<string, {
            id: string;
            nama: string;
            qty: number;
            total: number;
            cash: number;
            setoran: number;
            selisih: number;
            targets: {
                id: string;
                name: string;
                type: 'nominal' | 'qty';
                target: number;
                actual: number;
                percentage: number;
            }[]
        }>();

        filteredSales.forEach(p => {
            // Per Sales
            const sId = p.salesId;
            const existingSales = salesSummaryMap.get(sId) || {
                id: sId,
                nama: (() => { const u = users.find(u => u.id === sId); return u ? getUserDisplayName(u, tampilNama) : 'Unknown'; })(),
                qty: 0,
                total: 0,
                cash: 0,
                setoran: 0,
                selisih: 0,
                targets: []
            };

            p.items.forEach(pi => {
                const qty = pi.jumlah * (pi.konversi || 1);
                if (!pi.isBonus && pi.subtotal > 0) {
                    existingSales.qty += qty;
                }

                // Per Product
                const prodId = pi.barangId;
                const existingProd = productSummaryMap.get(prodId) || {
                    nama: barang.find(b => b.id === prodId)?.nama || 'Unknown',
                    qty: 0,
                    total: 0,
                    satuan: satuan.find(s => s.id === (barang.find(b => b.id === prodId)?.satuanId))?.simbol || ''
                };
                existingProd.qty += qty;
                existingProd.total += pi.subtotal;
                productSummaryMap.set(prodId, existingProd);
            });

            existingSales.total += p.total;
            salesSummaryMap.set(sId, existingSales);
        });

        // Add cash & setoran to sales summary
        const salesSummaryList = Array.from(salesSummaryMap.values()).map(s => {
            const userId = s.id;

            // Cash from this salesman's Tunai Sales (bayar - kembalian)
            const userCashFromSales = userId ? filteredSales
                .filter(p => p.salesId === userId && p.metodePembayaran === 'tunai')
                .reduce((acc, curr) => acc + (curr.bayar || 0) - (curr.kembalian || 0), 0) : 0;

            // Cash from payments table for this user
            const userCashFromPayments = userId ? validPembayaranToday
                .filter(p => p.createdBy === userId)
                .reduce((acc, curr) => acc + Number(curr.jumlah), 0) : 0;

            // Total cash for this user
            const userCash = userCashFromSales + userCashFromPayments;

            const userSetoran = userId ? dailySetoran
                .filter(s => (s.salesId === userId || s.userId === userId) && (s.status === 'disetujui' || s.status === 'diterima'))
                .reduce((acc, curr) => acc + curr.jumlah, 0) : 0;

            // Target Calculation
            const userTargets = activeTargets.filter(t => {
                if (t.scope === 'sales') return t.sales_id === userId;
                return false;
            }).map(t => {
                let startDate: Date;
                let endDate: Date;

                if (t.is_looping) {
                    if (t.jenis === 'harian') {
                        startDate = startOfDay(date);
                        endDate = endOfDay(date);
                    } else if (t.jenis === 'mingguan') {
                        startDate = startOfWeek(date, { weekStartsOn: 1 });
                        endDate = endOfWeek(date, { weekStartsOn: 1 });
                    } else { // bulanan
                        startDate = startOfMonth(date);
                        endDate = endOfMonth(date);
                    }
                } else {
                    startDate = new Date(t.start_date!);
                    endDate = new Date(t.end_date!);
                }

                // Relevant Sales for this specific target period
                const targetSales = penjualan.filter(p => {
                    const pDate = new Date(p.tanggal);
                    const isActive = p.status !== 'batal' && p.status !== 'draft';
                    const inDate = pDate >= startDate && pDate <= endDate && isActive;
                    if (!inDate) return false;

                    if (t.scope === 'sales') return p.salesId === userId;
                    if (t.scope === 'cabang') return p.cabangId === t.cabang_id;
                    return false;
                });

                const actual = t.target_type === 'nominal'
                    ? targetSales.reduce((sum, p) => sum + p.total, 0)
                    : targetSales.reduce((sum, p) => sum + p.items
                        .filter(i => !i.isBonus && i.subtotal > 0)
                        .reduce((s, i) => s + (i.totalQty !== undefined ? i.totalQty : (i.jumlah * (i.konversi || 1))), 0), 0);

                return {
                    id: t.id,
                    name: `${t.jenis.charAt(0).toUpperCase() + t.jenis.slice(1)} (${t.target_type === 'nominal' ? 'Rp' : 'Qty'})`,
                    type: t.target_type,
                    target: t.nilai,
                    actual,
                    percentage: Math.min(100, Math.round((actual / t.nilai) * 100))
                };
            });

            return {
                ...s,
                userId,
                cabangId: users.find(u => u.id === userId)?.cabangId,
                cash: userCash,
                setoran: userSetoran,
                selisih: userCash - userSetoran,
                targets: userTargets
            };
        }).filter(item => item.qty > 0 || item.total > 0 || item.cash > 0 || item.setoran > 0);

        // Separate Branch Targets Achievement
        const branchTargets = activeTargets.filter(t => {
            if (t.scope !== 'cabang') return false;
            if (isGlobalView) return true;
            return effectiveCabangIds.includes(t.cabang_id!);
        }).map(t => {
            let startDate: Date;
            let endDate: Date;

            if (t.is_looping) {
                if (t.jenis === 'harian') {
                    startDate = startOfDay(date);
                    endDate = endOfDay(date);
                } else if (t.jenis === 'mingguan') {
                    startDate = startOfWeek(date, { weekStartsOn: 1 });
                    endDate = endOfWeek(date, { weekStartsOn: 1 });
                } else { // bulanan
                    startDate = startOfMonth(date);
                    endDate = endOfMonth(date);
                }
            } else {
                startDate = new Date(t.start_date!);
                endDate = new Date(t.end_date!);
            }

            // Relevant Sales for this branch in this period
            const targetSales = penjualan.filter(p => {
                const pDate = new Date(p.tanggal);
                const isActive = p.status !== 'batal' && p.status !== 'draft';
                const inDate = pDate >= startDate && pDate <= endDate && isActive;
                if (!inDate) return false;

                return p.cabangId === t.cabang_id;
            });

            const actual = t.target_type === 'nominal'
                ? targetSales.reduce((sum, p) => sum + p.total, 0)
                : targetSales.reduce((sum, p) => sum + p.items
                    .filter(i => !i.isBonus && i.subtotal > 0)
                    .reduce((s, i) => s + (i.totalQty !== undefined ? i.totalQty : (i.jumlah * (i.konversi || 1))), 0), 0);

            return {
                id: t.id,
                name: `${t.jenis.charAt(0).toUpperCase() + t.jenis.slice(1)} (${t.target_type === 'nominal' ? 'Rp' : 'Qty'})`,
                cabangId: t.cabang_id,
                cabangName: cabang.find(c => c.id === t.cabang_id)?.nama || 'Cabang',
                type: t.target_type,
                target: t.nilai,
                actual,
                percentage: Math.min(100, Math.round((actual / t.nilai) * 100))
            };
        });

        // Grouping logic for UI "Sekat"
        const groupedSalesSummary = Array.from(new Set(salesSummaryList.map(s => s.cabangId))).map(cId => {
            const branchName = cabang.find(c => c.id === cId)?.nama || 'Tanpa Cabang';
            const branchSales = salesSummaryList.filter(s => s.cabangId === cId).sort((a, b) => b.total - a.total);
            const branchTgt = branchTargets.filter(bt => bt.cabangId === cId);

            return {
                cabangId: cId,
                cabangName: branchName,
                sales: branchSales,
                targets: branchTgt,
                totals: {
                    qty: branchSales.reduce((sum, s) => sum + s.qty, 0),
                    total: branchSales.reduce((sum, s) => sum + s.total, 0),
                    cash: branchSales.reduce((sum, s) => sum + s.cash, 0),
                    setoran: branchSales.reduce((sum, s) => sum + s.setoran, 0),
                    selisih: branchSales.reduce((sum, s) => sum + s.selisih, 0),
                }
            };
        }).sort((a, b) => a.cabangName.localeCompare(b.cabangName));

        return {
            date: selectedDate,
            branchName: selectedCabangIds.length === 0
                ? (isAdminOrOwner ? 'Semua Cabang' : (currentUser?.cabangId ? cabang.find(c => c.id === currentUser.cabangId)?.nama : ''))
                : (selectedCabangIds.length === 1 ? cabang.find(c => c.id === selectedCabangIds[0])?.nama : `${selectedCabangIds.length} Cabang`),
            stock: Array.from(stockMovementMap.values()).sort((a, b) => a.nama.localeCompare(b.nama)),
            sales: {
                count: filteredSales.length,
                totalOmzet,
                totalTunai,
                totalTempo,
                totalQty,
                totalPromoQty
            },
            productSummary: Array.from(productSummaryMap.values()).sort((a, b) => b.total - a.total),
            salesSummary: salesSummaryList.sort((a, b) => b.total - a.total),
            groupedSalesSummary,
            categorySummary: Array.from(categorySummaryMap.values()).sort((a, b) => b.total - a.total),
            finance: {
                previous: saldoBelumSetorSebelumnya,
                cashIn: cashCollectionToday,
                cashOut: totalSetoranValid,
                pending: totalSetoranPending,
                net: saldoBelumSetorSebelumnya + cashCollectionToday - totalSetoranValid
            },
            depositNotes,
            branchTargets
        };
    }, [selectedDate, selectedCabangIds, selectedUserIds, penjualan, barang, users, stokPengguna, persetujuan, setoran, saldoPengguna, cabang, satuan, mutasiBarang, penyesuaianStok, pembayaran, pelanggan, kategoriPelanggan, currentUser, isAdminOrOwner]);

    const handleDownloadPDF = async () => {
        if (!reportData) {
            toast.error('Data laporan belum siap');
            return;
        }

        setIsGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text('LAPORAN HARIAN KONSOLIDASI', 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`${profilPerusahaan.nama || 'CV. SEKAWAN JAYA'}`, 14, 26);
            doc.text(`Tanggal: ${format(new Date(reportData.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}`, 14, 31);
            doc.text(`Cabang: ${reportData.branchName}`, 14, 36);

            // QR Code from canvas
            const canvas = qrRef.current?.querySelector('canvas');
            if (canvas) {
                const qrDataUrl = canvas.toDataURL('image/png');
                doc.addImage(qrDataUrl, 'PNG', pageWidth - 40, 10, 30, 30);
                doc.setFontSize(7);
                doc.text('Scan to verify', pageWidth - 25, 42, { align: 'center' });
            }

            // 1. Ringkasan Penjualan & Produk
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text('1. RINGKASAN PENJUALAN & DETAIL PRODUK', 14, 48);

            autoTable(doc, {
                startY: 52,
                head: [['Kategori Pelanggan', 'Jumlah Transaksi', 'Total Qty', 'Total Omzet']],
                body: [
                    ...reportData.categorySummary.map(c => [
                        c.nama,
                        c.count,
                        formatNumber(c.qty),
                        formatRupiah(c.total)
                    ]),
                    ['TOTAL', reportData.sales.count, formatNumber(reportData.sales.totalQty), formatRupiah(reportData.sales.totalOmzet)]
                ],
                theme: 'striped',
                headStyles: { fillColor: [51, 122, 183] },
                styles: { fontSize: 9 }
            });

            // Add Product Summary as second table in Section 1
            if (reportData.productSummary.length > 0) {
                const finalY_summary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
                autoTable(doc, {
                    startY: finalY_summary,
                    head: [['Detail Produk Terjual', 'Qty', 'Total Omzet']],
                    body: reportData.productSummary.map(p => [
                        p.nama,
                        `${formatNumber(p.qty)} ${p.satuan}`,
                        formatRupiah(p.total)
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [52, 152, 219] },
                    styles: { fontSize: 8 },
                    columnStyles: {
                        1: { halign: 'right' },
                        2: { halign: 'right' }
                    }
                });
            }

            // 2. Ringkasan Keuangan
            const finalY1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
            doc.text('2. PENERIMAAN & SETORAN KAS', 14, finalY1);

            autoTable(doc, {
                startY: finalY1 + 4,
                body: [
                    ['Saldo Belum Setor Sebelumnya', formatRupiah(reportData.finance.previous)],
                    ['Total Omzet Penjualan (Billing)', formatRupiah(reportData.sales.totalOmzet)],
                    ['Total Kas Masuk (Actual Penerimaan)', formatRupiah(reportData.finance.cashIn)],
                    ['Total Sudah Disetorkan (Bank/Finance)', formatRupiah(reportData.finance.cashOut)],
                    ['Nilai Belum Setor', formatRupiah(reportData.finance.net)],
                    ['Setoran Masih Pending (Menunggu)', formatRupiah(reportData.finance.pending)]
                ],
                theme: 'grid',
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 80 },
                    1: { halign: 'right' }
                }
            });

            if (reportData.depositNotes.length > 0) {
                const finalYFinance = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
                autoTable(doc, {
                    startY: finalYFinance,
                    head: [['Waktu', 'Sales', 'Sumber', 'Status', 'Jumlah', 'Catatan']],
                    body: reportData.depositNotes.map(note => [
                        note.waktu,
                        note.salesName,
                        note.sumber === 'pusat' ? 'Setor Pusat' : 'Setoran',
                        note.status,
                        formatRupiah(note.jumlah),
                        note.catatan,
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [22, 163, 74] },
                    styles: { fontSize: 8 },
                    columnStyles: {
                        4: { halign: 'right' },
                    }
                });
            }

            // 3. Pergerakan Stok
            const finalY2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
            doc.text('3. PERGERAKAN STOK BARANG', 14, finalY2);

            autoTable(doc, {
                startY: finalY2 + 4,
                head: [['Produk', 'Awal', 'Masuk', 'Keluar', 'Terjual', 'Promo', 'Akhir']],
                body: reportData.stock.map(s => [
                    s.nama,
                    formatNumber(s.awal),
                    formatNumber(s.masuk),
                    formatNumber(s.keluar),
                    formatNumber(s.terjual),
                    formatNumber(s.promo),
                    formatNumber(s.akhir)
                ]),
                theme: 'striped',
                headStyles: { fillColor: [243, 156, 18] },
                styles: { fontSize: 8 }
            });

            // 4. Daftar Sales Ringkasan (Grouped by Branch)
            if (reportData.groupedSalesSummary.length > 0) {
                const finalY_stock = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
                if (finalY_stock > 250) doc.addPage();
                const startY_sales = finalY_stock > 250 ? 20 : finalY_stock;

                doc.setFontSize(12);
                doc.text('4. RINGKASAN PERFORMANCE SALES', 14, startY_sales);

                const tableBody: any[] = [];
                reportData.groupedSalesSummary.forEach((group: any) => {
                    const targetText = group.targets.map((t: any) => `${t.name}: ${t.percentage}%`).join(' | ');
                    // Branch Header Row (Condensed)
                    tableBody.push([
                        {
                            content: `${group.cabangName.toUpperCase()} ${targetText ? `(${targetText})` : `- ${group.sales.length} Sales`}`,
                            colSpan: 5,
                            styles: { fillColor: [248, 250, 252], fontStyle: 'bold', textColor: [71, 85, 105], fontSize: 6.5, cellPadding: 1 }
                        }
                    ]);

                    // Sales Rows
                    group.sales.forEach((s: any) => {
                        tableBody.push([
                            s.nama,
                            `${formatNumber(s.qty)} Pcs\n${formatRupiah(s.total)}`,
                            s.targets.map((t: any) => `${t.name}: ${t.percentage}%`).join('\n') || '-',
                            `${formatRupiah(s.cash)}\n${formatRupiah(s.setoran)}`,
                            s.selisih > 0 ? formatRupiah(s.selisih) : '-'
                        ]);
                    });
                });

                autoTable(doc, {
                    startY: startY_sales + 4,
                    head: [['Salesman', 'Qty / Omzet', 'Achievement', 'Penjualan', 'Selisih']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [230, 126, 34] },
                    styles: { fontSize: 7 },
                    columnStyles: {
                        1: { halign: 'right', cellWidth: 25 },
                        2: { halign: 'center', cellWidth: 35 },
                        3: { halign: 'right', cellWidth: 25 },
                        4: { halign: 'right', fontStyle: 'bold', textColor: [180, 0, 0], cellWidth: 25 }
                    }
                });
            }


            doc.save(`Laporan_Harian_${reportData.date}.pdf`);
            toast.success('Laporan PDF berhasil diunduh');
        } catch (err) {
            console.error("PDF Error:", err);
            toast.error('Gagal membuat PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!reportData) {
        return (
            <div className="animate-in fade-in duration-500">
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/laporan')} className="pr-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Button>
                    </div>

                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-8 text-center text-slate-500">
                            Memuat data laporan harian...
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="p-4 space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/laporan')} className="pr-2">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                        </Button>
                        <div>
                            <h2 className="font-bold text-lg leading-tight uppercase tracking-tight">Laporan Harian</h2>
                            <p className="text-xs text-muted-foreground uppercase font-medium mt-0.5">Stok • Penjualan • Kas</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Hidden QR for PDF */}
                        <div ref={qrRef} className="hidden">
                            <QRCodeSVG
                                value={`DAILY REPORT | ${reportData.date} | ${reportData.branchName} | Omzet: ${reportData.sales.totalOmzet}`}
                                size={128}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border text-sm">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-none bg-transparent h-6 w-32 focus-visible:ring-0 p-0 text-sm font-semibold"
                            />
                        </div>

                        {isAdminOrOwner && (
                            <ScopeFilters
                                selectedCabangIds={selectedCabangIds}
                                setSelectedCabangIds={setSelectedCabangIds}
                                selectedUserIds={selectedUserIds}
                                setSelectedUserIds={setSelectedUserIds}
                                availableCabangIds={availableCabangIds}
                                availableUserIds={availableUserIds}
                                className="!space-y-0 flex flex-row items-center gap-2"
                            />
                        )}

                        <Button
                            className="h-9 px-4 shadow-sm bg-primary hover:bg-primary/90"
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            {isGenerating ? 'Memproses...' : 'Cetak Laporan'}
                        </Button>
                    </div>
                </div>

                {/* Dashboard Summary Widgets */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-blue-600 uppercase tracking-widest flex justify-between items-center pr-1">
                            Omzet (Billing)
                            <DollarSign className="w-4 h-4 text-blue-200 group-hover:text-blue-500 transition-colors" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-black text-slate-800 tracking-tight">{formatRupiah(reportData.sales.totalOmzet)}</div>
                        <div className="mt-1 text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                            {reportData.sales.count} Transaksi Valid
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-green-600 uppercase tracking-widest flex justify-between items-center pr-1">
                            Kas Masuk (Actual)
                            <TrendingUp className="w-4 h-4 text-green-200 group-hover:text-green-500 transition-colors" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-black text-slate-800 tracking-tight">{formatRupiah(reportData.finance.cashIn)}</div>
                        <div className="mt-1 text-[10px] font-bold text-green-600 uppercase tracking-wide">
                            Tunai Hari Ini + Bayar Piutang
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold text-orange-600 uppercase tracking-widest flex justify-between items-center pr-1">
                            Stok Terjual
                            <Package className="w-4 h-4 text-orange-200 group-hover:text-orange-500 transition-colors" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-xl font-black text-slate-800 tracking-tight">{formatNumber(reportData.sales.totalQty)} <span className="text-xs font-medium text-slate-400">Pcs</span></div>
                        <div className="mt-1 text-[10px] font-bold text-orange-600 uppercase tracking-wide">
                            Promo/Bonus: {formatNumber(reportData.sales.totalPromoQty)} Pcs
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Ringkasan Per Produk */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b p-2.5 px-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-blue-500" />
                            Ringkasan Penjualan Per Produk
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500">Produk</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right">Qty</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.productSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-[10px] text-center text-slate-400 italic py-4">Tidak ada data</TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.productSummary.map((p, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50/50">
                                            <TableCell className="text-[11px] py-1 font-medium">{p.nama}</TableCell>
                                            <TableCell className="text-[11px] py-1 text-right font-bold text-slate-900">{formatNumber(p.qty)} <span className="text-[9px] font-normal text-slate-400">{p.satuan}</span></TableCell>
                                            <TableCell className="text-[11px] py-1 text-right font-bold text-blue-600">{formatRupiah(p.total)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Ringkasan Per Sales */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50/50 border-b p-2.5 px-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-orange-500" />
                            Ringkasan Performance Sales
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500">Salesman</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right">Qty / Omzet</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right">Target Achievement</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right">Penjualan</TableHead>
                                    <TableHead className="text-[10px] h-8 font-bold text-slate-500 text-right px-4">Belum Setor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.groupedSalesSummary.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-[10px] text-center text-slate-400 italic py-4">Tidak ada data</TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.groupedSalesSummary.map((group, gIdx) => (
                                        <React.Fragment key={group.cabangId || gIdx}>
                                            {/* Branch Header Row - Slim Divider (Sekat) */}
                                            <TableRow className="bg-slate-50 border-t-2 border-slate-200 border-b border-slate-100 h-7 select-none">
                                                <TableCell className="py-0 px-4 font-bold text-slate-500 uppercase tracking-widest text-[8px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-3 bg-slate-300 rounded-sm" />
                                                        {group.cabangName}
                                                        <span className="ml-1 text-[7px] text-slate-400 font-normal normal-case">
                                                            ({group.sales.length} Sales)
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-0 text-right">
                                                    <div className="text-[8px] font-bold text-slate-400">{formatNumber(group.totals.qty)} | {formatRupiah(group.totals.total)}</div>
                                                </TableCell>
                                                <TableCell className="py-0 text-right">
                                                    <div className="space-y-0.5 ml-auto max-w-[90px]">
                                                        {group.targets.map(bt => (
                                                            <div key={bt.id} className="flex items-center gap-1.5">
                                                                <span className="text-[7px] font-medium uppercase text-slate-400 min-w-[20px]">{bt.name}</span>
                                                                <div className="flex-1 h-1 bg-white border border-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${bt.percentage >= 100 ? 'bg-green-500' : 'bg-slate-300'}`}
                                                                        style={{ width: `${Math.min(100, bt.percentage)}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`text-[7px] font-bold ${bt.percentage >= 100 ? 'text-green-600' : 'text-slate-400'}`}>{bt.percentage}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-0 text-right">
                                                    <div className="text-[8px] font-bold text-slate-400">{formatRupiah(group.totals.cash)}</div>
                                                    <div className="text-[7px] font-medium text-slate-300">{formatRupiah(group.totals.setoran)}</div>
                                                </TableCell>
                                                <TableCell className="py-0 text-right font-bold text-slate-400 px-4 text-[8px]">
                                                    {group.totals.selisih > 0 ? formatRupiah(group.totals.selisih) : '-'}
                                                </TableCell>
                                            </TableRow>

                                            {/* Sales Records for this Branch */}
                                            {group.sales.map((s, sIdx) => (
                                                <TableRow key={sIdx} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-b-0">
                                                    <TableCell className="text-[11px] py-1 font-bold text-slate-600 pl-8">{s.nama}</TableCell>
                                                    <TableCell className="text-[11px] py-1 text-right">
                                                        <div className="font-bold text-slate-700">{formatNumber(s.qty)}</div>
                                                        <div className="text-[9px] text-blue-500">{formatRupiah(s.total)}</div>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] py-1 text-right">
                                                        <div className="space-y-1 ml-auto max-w-[120px]">
                                                            {s.targets.length === 0 ? (
                                                                <div className="text-[9px] text-slate-300 italic">No target</div>
                                                            ) : (
                                                                s.targets.map(t => (
                                                                    <div key={t.id} className="space-y-0.5">
                                                                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-slate-500">
                                                                            <span>{t.name}</span>
                                                                            <span className={t.percentage >= 100 ? 'text-green-600' : 'text-orange-600'}>{t.percentage}%</span>
                                                                        </div>
                                                                        <Progress value={t.percentage} className="h-1" />
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] py-1 text-right">
                                                        <div className="text-green-600 font-medium">{formatRupiah(s.cash)}</div>
                                                        <div className="text-[9px] text-slate-400">{formatRupiah(s.setoran)}</div>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] py-1 text-right font-black text-red-600 px-4">
                                                        {s.selisih > 0 ? formatRupiah(s.selisih) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left details */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b p-3">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider">Rincian Keuangan Hari Ini</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                                <span className="text-xs text-slate-500 font-medium">Saldo Belum Setor Sebelumnya</span>
                                <span className={`text-sm font-bold ${reportData.finance.previous >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {formatRupiah(reportData.finance.previous)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                                <span className="text-xs text-slate-500 font-medium">Kas Masuk (Actual)</span>
                                <span className="text-sm font-bold text-slate-700">{formatRupiah(reportData.finance.cashIn)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-dashed">
                                <span className="text-xs text-slate-500 font-medium text-green-600">(-) Sudah Setor (Bank)</span>
                                <span className="text-sm font-bold text-green-600">{formatRupiah(reportData.finance.cashOut)}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded -mx-2">
                                <span className="text-xs font-black uppercase text-slate-800">Nilai Belum Setor</span>
                                <span className="text-sm font-black text-primary">{formatRupiah(reportData.finance.net)}</span>
                            </div>
                            {reportData.depositNotes.length > 0 && (
                                <div className="pt-2 border-t">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Catatan Setoran</div>
                                    <div className="space-y-2">
                                        {reportData.depositNotes.map((note) => (
                                            <div key={note.id} className="rounded-md border border-slate-200 bg-slate-50/70 p-2">
                                                <div className="flex items-center justify-between gap-2 text-[10px]">
                                                    <span className="font-bold text-slate-700">{note.salesName}</span>
                                                    <span className="text-slate-400">{note.waktu}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 text-[10px] mt-1">
                                                    <span className={note.sumber === 'pusat' ? 'text-indigo-600 font-medium' : 'text-green-600 font-medium'}>
                                                        {note.sumber === 'pusat' ? 'Setor Pusat' : 'Setoran'}
                                                    </span>
                                                    <span className="text-slate-500">{formatRupiah(note.jumlah)}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{note.catatan}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b p-3">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider">Penjualan Tempo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Nilai Piutang Baru</span>
                                <span className="text-sm font-bold text-red-600">{formatRupiah(reportData.sales.totalTempo)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right stock table */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm border-slate-200 h-full">
                        <CardHeader className="bg-slate-50/50 border-b p-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-orange-500" />
                                Pergerakan Stok Konsolidasi
                            </CardTitle>
                            <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase">
                                {reportData.stock.length} Produk
                            </span>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/30 text-[10px] uppercase font-black text-slate-500 border-b">
                                        <TableHead className="h-9">Produk</TableHead>
                                        <TableHead className="h-9 text-right">Awal</TableHead>
                                        <TableHead className="h-9 text-right text-green-600">In</TableHead>
                                        <TableHead className="h-9 text-right text-red-600">Out</TableHead>
                                        <TableHead className="h-9 text-right text-blue-600">Sold</TableHead>
                                        <TableHead className="h-9 text-right font-black text-slate-900 pr-4">Akhir</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportData.stock.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24 text-slate-400 italic text-[10px]">No data</TableCell>
                                        </TableRow>
                                    ) : (
                                        reportData.stock.map((item, idx) => (
                                            <TableRow key={idx} className="hover:bg-slate-50/50">
                                                <TableCell className="py-2 text-[11px] font-medium text-slate-700">{item.nama}</TableCell>
                                                <TableCell className="text-right text-[10px] text-slate-500">{formatNumber(item.awal)}</TableCell>
                                                <TableCell className="text-right text-[10px] text-green-600 font-bold">{item.masuk > 0 ? `+${formatNumber(item.masuk)}` : '-'}</TableCell>
                                                <TableCell className="text-right text-[10px] text-red-600 font-bold">{item.keluar > 0 ? `-${formatNumber(item.keluar)}` : '-'}</TableCell>
                                                <TableCell className="text-right text-[10px] text-blue-600 font-bold">
                                                    {item.terjual > 0 ? `-${formatNumber(item.terjual)}` : '-'}
                                                    {item.promo > 0 && <span className="text-[9px] ml-1 text-orange-400 font-normal">{formatNumber(item.promo)}</span>}
                                                </TableCell>
                                                <TableCell className="text-right text-[11px] font-black text-slate-900 pr-4">{formatNumber(item.akhir)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
