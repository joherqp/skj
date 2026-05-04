import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { formatRupiah, cn, getUserDisplayName } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
// Removed CalendarComponent import
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Removed DateRange import
import { id as localeId } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Layout, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity, TrendingUp, ShoppingBag, Sparkles, Filter, Settings2, X, ChevronDown, Search, Building, Users, Tag, Package, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

type ChartType = 'line' | 'bar' | 'pie' | 'area';
type DataSource = 'daily' | 'weekly' | 'monthly' | 'kategori' | 'produk' | 'sales' | 'pelanggan' | 'cabang';
type DataMetric = 'total_omzet' | 'total_qty' | 'total_trx';
type ChartDataPoint = {
    name: string;
    value: number;
};

interface WidgetConfig {
    id: string;
    title: string;
    type: ChartType;
    source: DataSource;
    metric: DataMetric;
    color?: string;
    isScrollable?: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: '1', title: 'Tren Omzet Harian', type: 'area', source: 'daily', metric: 'total_omzet', color: '#6366f1', isScrollable: true },
    { id: '2', title: 'Performa Sales', type: 'bar', source: 'sales', metric: 'total_omzet', color: '#10b981', isScrollable: true },
    { id: '4', title: 'Tren Transaksi Mingguan', type: 'line', source: 'weekly', metric: 'total_trx', color: '#ec4899', isScrollable: true },
    { id: '5', title: 'Top Produk (Qty)', type: 'bar', source: 'produk', metric: 'total_qty', color: '#8b5cf6', isScrollable: true },
    { id: '6', title: 'Omzet per Cabang', type: 'bar', source: 'cabang', metric: 'total_omzet', color: '#06b6d4' },
    { id: '7', title: 'Top Pelanggan', type: 'bar', source: 'pelanggan', metric: 'total_omzet', color: '#f97316', isScrollable: true },
    { id: '8', title: 'Distribusi Pelanggan', type: 'pie', source: 'pelanggan', metric: 'total_omzet', color: '#ef4444' },
    { id: '9', title: 'Tren Qty Harian', type: 'line', source: 'daily', metric: 'total_qty', color: '#6366f1', isScrollable: true },
    { id: '10', title: 'Frekuensi Transaksi Sales', type: 'bar', source: 'sales', metric: 'total_trx', color: '#10b981', isScrollable: true },
];

export default function AnalisaVisual() {
    const { user: currentUser } = useAuth();
    const { penjualan, barang, kategori: listKategori, users, pelanggan, cabang: listCabang, viewMode, profilPerusahaan } = useDatabase();
    const tampilNama = profilPerusahaan?.config?.tampilNama || 'nama';
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'year' | 'custom'>('30d');
    const [isSingleDate, setIsSingleDate] = useState(false);
    const [singleDate, setSingleDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Default to start of month
        return format(d, 'yyyy-MM-dd');
    });
    const [customEndDate, setCustomEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [tempConfig, setTempConfig] = useState<Partial<WidgetConfig>>({
        title: '', type: 'bar', source: 'kategori', metric: 'total_omzet', color: '#6366f1'
    });

    // Advanced Filters State
    const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedKategoriIds, setSelectedKategoriIds] = useState<string[]>([]);
    const [selectedBarangIds, setSelectedBarangIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState({ cabang: '', user: '', kategori: '', barang: '' });

    const isAdminOrOwner = useMemo(() => currentUser?.roles?.some(r => ['admin', 'owner'].includes(r)) || false, [currentUser]);
    const isLeader = useMemo(() => currentUser?.roles?.includes('leader') || false, [currentUser]);

    // Auto-select "Rokok" category on initial load if none selected
    useEffect(() => {
        if (selectedKategoriIds.length === 0 && listKategori.length > 0) {
            const rokoCat = listKategori.find(c => 
                c.nama.toLowerCase().includes('rokok') || 
                c.nama.toLowerCase().includes('roko')
            );
            if (rokoCat) {
                setSelectedKategoriIds([rokoCat.id]);
            }
        }
    }, [listKategori.length]); // Only run when listKategori is first loaded

    const dateBoundaries = useMemo(() => {
        const now = endOfDay(new Date());
        const past = startOfDay(new Date());
        
        const parseSafely = (dateStr: string, fallback: Date) => {
            if (!dateStr) return fallback;
            const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
            return isNaN(d.getTime()) ? fallback : d;
        };

        if (dateRange === '7d') past.setTime(startOfDay(subDays(new Date(), 7)).getTime());
        else if (dateRange === '30d') past.setTime(startOfDay(subDays(new Date(), 30)).getTime());
        else if (dateRange === '90d') past.setTime(startOfDay(subDays(new Date(), 90)).getTime());
        else if (dateRange === 'year') past.setTime(startOfDay(startOfYear(new Date())).getTime());
        else if (dateRange === 'custom') {
            if (isSingleDate) {
                const d = parseSafely(singleDate, new Date());
                past.setTime(startOfDay(d).getTime());
                now.setTime(endOfDay(d).getTime());
            } else {
                past.setTime(startOfDay(parseSafely(customStartDate, new Date())).getTime());
                now.setTime(endOfDay(parseSafely(customEndDate, new Date())).getTime());
            }
        }
        
        return { start: startOfDay(past), end: endOfDay(now) };
    }, [dateRange, isSingleDate, singleDate, customStartDate, customEndDate]);

    const formatDisplayDate = (dateStr: string, formatStr: string) => {
        try {
            if (!dateStr) return '...';
            const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
            if (isNaN(d.getTime())) return '...';
            return format(d, formatStr, { locale: localeId });
        } catch {
            return '...';
        }
    };

    const filteredSales = useMemo(() => {
        const { start: past, end: now } = dateBoundaries;

        return penjualan.filter(p => {
            if (p.status === 'batal' || p.status === 'draft') return false;

            const pSalesId = p.salesId || p.createdBy;
            
            // Base access check
            let hasAccess = false;
            if (isAdminOrOwner) {
                hasAccess = viewMode === 'me' ? (pSalesId === currentUser?.id) : true;
            } else if (isLeader) {
                hasAccess = p.cabangId === currentUser?.cabangId && (viewMode === 'me' ? (pSalesId === currentUser?.id) : true);
            } else {
                hasAccess = pSalesId === currentUser?.id;
            }
            if (!hasAccess) return false;

            // Date Range check
            if (!p.tanggal) return false;
            const dateStr = p.tanggal instanceof Date ? p.tanggal.toISOString() : String(p.tanggal);
            const datePart = dateStr.split(/[ T]/)[0];
            const d = new Date(datePart + 'T00:00:00');
            const isInRange = !isNaN(d.getTime()) && d >= past && d <= now;
            if (!isInRange) return false;

            // Dimension Filters
            if (selectedCabangIds.includes('__none__')) return false;
            if (selectedCabangIds.length > 0 && !selectedCabangIds.includes(p.cabangId || '')) return false;
            
            if (selectedUserIds.includes('__none__')) return false;
            if (selectedUserIds.length > 0 && !selectedUserIds.includes(pSalesId || '')) return false;
            
            return true;
        });
    }, [penjualan, dateBoundaries, currentUser, viewMode, selectedCabangIds, selectedUserIds, isAdminOrOwner, isLeader]);

    const itemFilter = useMemo(() => (item: any) => {
        if (!item) return false;
        const prod = barang.find(b => b.id === item.barangId);
        
        if (selectedKategoriIds.includes('__none__')) return false;
        if (selectedKategoriIds.length > 0) {
            if (!prod || !selectedKategoriIds.includes(prod.kategoriId || '')) return false;
        }
        
        if (selectedBarangIds.includes('__none__')) return false;
        if (selectedBarangIds.length > 0) {
            if (!selectedBarangIds.includes(item.barangId)) return false;
        }
        return true;
    }, [barang, selectedKategoriIds, selectedBarangIds]);

    const allChartData = useMemo(() => {
        const results: Record<string, ChartDataPoint[]> = {};
        
        widgets.forEach(w => {
            const key = `${w.source}-${w.metric}`;
            if (results[key]) return;

            const map = new Map<string, number>();
            const { start: past, end: now } = dateBoundaries;

            // Pre-populate time-based maps to ensure all periods in range are shown
            if (w.source === 'daily') {
                const current = new Date(past);
                while (current <= now) {
                    const dateKey = format(current, 'dd MMM', { locale: localeId });
                    map.set(dateKey, 0);
                    current.setDate(current.getDate() + 1);
                }
            } else if (w.source === 'weekly') {
                const current = new Date(past);
                while (current <= now) {
                    const weekKey = format(startOfWeek(current, { weekStartsOn: 1 }), "'Ming' w, MMM", { locale: localeId });
                    map.set(weekKey, 0);
                    current.setDate(current.getDate() + 7);
                }
            } else if (w.source === 'monthly') {
                const current = new Date(past);
                current.setDate(1); // Start of month
                while (current <= now) {
                    const monthKey = format(current, 'MMMM yy', { locale: localeId });
                    map.set(monthKey, 0);
                    current.setMonth(current.getMonth() + 1);
                }
            }

            filteredSales.forEach(p => {
                const matchingItems = p.items.filter(itemFilter);
                if (matchingItems.length === 0) return;

                const pSalesId = p.salesId || p.createdBy;
                let val = 0;
                if (w.metric === 'total_omzet') val = matchingItems.reduce((acc, i) => acc + i.subtotal, 0);
                if (w.metric === 'total_qty') val = matchingItems.reduce((acc, i) => acc + i.jumlah, 0);
                if (w.metric === 'total_trx') val = 1;

                if (w.source === 'daily' && p.tanggal) {
                    // Use T00:00:00 to avoid timezone shifts
                    const dateStr = p.tanggal instanceof Date ? p.tanggal.toISOString() : String(p.tanggal);
                    const datePart = dateStr.split(/[ T]/)[0];
                    const d = new Date(datePart + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                        const dateKey = format(d, 'dd MMM', { locale: localeId });
                        map.set(dateKey, (map.get(dateKey) || 0) + val);
                    }
                } else if (w.source === 'weekly' && p.tanggal) {
                    const dateStr = p.tanggal instanceof Date ? p.tanggal.toISOString() : String(p.tanggal);
                    const datePart = dateStr.split(/[ T]/)[0];
                    const d = new Date(datePart + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                        const weekKey = format(startOfWeek(d, { weekStartsOn: 1 }), "'Ming' w, MMM", { locale: localeId });
                        map.set(weekKey, (map.get(weekKey) || 0) + val);
                    }
                } else if (w.source === 'monthly' && p.tanggal) {
                    const dateStr = p.tanggal instanceof Date ? p.tanggal.toISOString() : String(p.tanggal);
                    const datePart = dateStr.split(/[ T]/)[0];
                    const d = new Date(datePart + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                        const monthKey = format(d, 'MMMM yy', { locale: localeId });
                        map.set(monthKey, (map.get(monthKey) || 0) + val);
                    }
                } else if (w.source === 'sales') {
                    const u = users.find(usr => usr.id === pSalesId);
                    const name = u ? getUserDisplayName(u, tampilNama) : 'Unknown';
                    map.set(name, (map.get(name) || 0) + val);
                } else if (w.source === 'pelanggan') {
                    const name = pelanggan.find(c => c.id === p.pelangganId)?.nama || 'Umum';
                    map.set(name, (map.get(name) || 0) + val);
                } else if (w.source === 'cabang') {
                    const name = listCabang.find(c => c.id === p.cabangId)?.nama || 'Unknown';
                    map.set(name, (map.get(name) || 0) + val);
                } else if (w.source === 'kategori' || w.source === 'produk') {
                    matchingItems.forEach(item => {
                        let itemVal = 0;
                        if (w.metric === 'total_omzet') itemVal = item.subtotal;
                        if (w.metric === 'total_qty') itemVal = item.jumlah;
                        if (w.metric === 'total_trx') itemVal = 1;

                        const prod = barang.find(b => b.id === item.barangId);
                        let itemKey = 'Unknown';
                        if (w.source === 'produk') itemKey = prod?.nama || 'Unknown';
                        if (w.source === 'kategori') {
                            itemKey = listKategori.find(c => c.id === prod?.kategoriId)?.nama || 'Lainnya';
                        }
                        map.set(itemKey, (map.get(itemKey) || 0) + itemVal);
                    });
                }
            });

            const res = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
            if (!['daily', 'weekly', 'monthly'].includes(w.source)) {
                res.sort((a, b) => b.value - a.value);
            }
            // For time trends, we don't slice
            results[key] = ['daily', 'weekly', 'monthly'].includes(w.source) ? res : res.slice(0, 15);
        });

        return results;
    }, [filteredSales, itemFilter, widgets, users, pelanggan, barang, listKategori, dateBoundaries]);

    const getChartData = (source: DataSource, metric: DataMetric) => {
        return allChartData[`${source}-${metric}`] || [];
    };

    const handleAddWidget = () => {
        if (!tempConfig.title) {
            toast.error("Judul wajib diisi");
            return;
        }
        const newWidget: WidgetConfig = {
            id: Date.now().toString(),
            title: tempConfig.title!,
            type: tempConfig.type || 'bar',
            source: tempConfig.source || 'kategori',
            metric: tempConfig.metric || 'total_omzet',
            color: tempConfig.color
        };
        setWidgets([...widgets, newWidget]);
        setIsAddOpen(false);
        setTempConfig({ title: '', type: 'bar', source: 'kategori', metric: 'total_omzet', color: '#6366f1' });
        toast.success("Widget berhasil ditambahkan");
    };

    const handleRemoveWidget = (id: string) => {
        setWidgets(widgets.filter(w => w.id !== id));
        toast.success("Widget dihapus");
    };

    const CustomTooltip = ({ active, payload, label, metric }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5 min-w-[120px]">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 sm:mb-1.5">{label}</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900">
                        {metric === 'total_omzet' ? formatRupiah(payload[0].value) : 
                         metric === 'total_trx' ? `${payload[0].value.toLocaleString()} Trx` :
                         `${payload[0].value.toLocaleString()} Qty`}
                    </p>
                    <div className="mt-1.5 sm:mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-1000" 
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderChart = (w: WidgetConfig, data: ChartDataPoint[]) => {
        const isVertical = w.type === 'bar' && (w.source === 'produk' || w.source === 'pelanggan' || w.source === 'sales');
        
        const scrollStyles = w.isScrollable ? {
            width: !isVertical ? `${Math.max(100, data.length * (w.source === 'daily' ? 45 : 95))}px` : '100%',
            height: isVertical ? `${Math.max(300, data.length * 45)}px` : '100%',
            minWidth: '100%'
        } : { width: '100%', height: '100%' };

        const chartElement = (() => {
            switch (w.type) {
                case 'line':
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <RechartsTooltip content={<CustomTooltip metric={w.metric} />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
                                <Line 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={w.color || '#6366f1'} 
                                    strokeWidth={4} 
                                    dot={{ r: 4, fill: w.color || '#6366f1', strokeWidth: 3, stroke: '#fff' }} 
                                    activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: w.color || '#6366f1' }}
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    );
                case 'area':
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={`color-${w.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={w.color || '#6366f1'} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={w.color || '#6366f1'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10}
                                />
                                <YAxis hide />
                                <RechartsTooltip content={<CustomTooltip metric={w.metric} />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="value" 
                                    stroke={w.color || '#6366f1'} 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill={`url(#color-${w.id})`} 
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    );
                case 'pie':
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%" cy="45%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={COLORS[index % COLORS.length]} 
                                            className="hover:opacity-100 transition-opacity cursor-pointer outline-none"
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip metric={w.metric} />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center"
                                    iconType="circle" 
                                    iconSize={8}
                                    wrapperStyle={{ 
                                        paddingTop: '20px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        color: '#64748b'
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    );
                default: // bar
                    return (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={data} 
                                layout={isVertical ? 'vertical' : 'horizontal'}
                                margin={{ top: 10, right: 10, left: isVertical ? 20 : -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} stroke="#f1f5f9" />
                                {isVertical ? (
                                    <>
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={120} 
                                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                        />
                                    </>
                                ) : (
                                    <>
                                        <XAxis 
                                            dataKey="name" 
                                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            dy={10}
                                        />
                                        <YAxis hide />
                                    </>
                                )}
                                <RechartsTooltip content={<CustomTooltip metric={w.metric} />} cursor={{ fill: '#f8fafc' }} />
                                <Bar 
                                    dataKey="value" 
                                    fill={w.color || '#6366f1'} 
                                    radius={isVertical ? [0, 8, 8, 0] : [8, 8, 0, 0]} 
                                    barSize={isVertical ? 24 : 32}
                                    animationDuration={2000}
                                    animationEasing="ease-in-out"
                                >
                                    {data.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={w.color || COLORS[index % COLORS.length]} 
                                            fillOpacity={0.85 + (index * 0.01)} 
                                            className="hover:opacity-100 transition-opacity"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    );
            }
        })();

        return (
            <div className={cn(
                "w-full h-full",
                w.isScrollable && (isVertical ? "overflow-y-auto overflow-x-hidden custom-scrollbar" : "overflow-x-auto overflow-y-hidden custom-scrollbar")
            )}>
                <div style={scrollStyles}>
                    {chartElement}
                </div>
            </div>
        );
    };

    const totals = useMemo(() => ({
        omzet: filteredSales.reduce((acc, p) => 
            acc + p.items.filter(itemFilter).reduce((sum, i) => sum + i.subtotal, 0), 0),
        trx: filteredSales.filter(p => p.items.some(itemFilter)).length,
        qty: filteredSales.reduce((acc, p) => 
            acc + p.items.filter(itemFilter).reduce((sum, i) => sum + i.jumlah, 0), 0)
    }), [filteredSales, itemFilter]);

    return (
        <div className="space-y-6 sm:space-y-10 pb-20 relative">
            {/* Background Ornaments */}
            <div className="absolute top-0 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-500/5 rounded-full blur-[80px] sm:blur-[120px] -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-emerald-500/5 rounded-full blur-[70px] sm:blur-[100px] -z-10" />

            {/* Premium Header Controls - Fixed Responsive Sticky */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-[58px] sm:top-[72px] z-30 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-10 xl:-mx-12 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 flex flex-row items-center justify-between gap-2 sm:gap-6 transition-all shadow-sm"
            >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 md:flex-none">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="outline" 
                                className={cn(
                                    "h-11 sm:h-12 px-3 sm:px-5 rounded-2xl bg-white border-slate-200 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center gap-2 sm:gap-3 font-bold text-slate-700 w-full md:w-auto",
                                    dateRange === 'custom' && "border-indigo-200 bg-indigo-50/50"
                                )}
                            >
                                <div className="p-1 sm:p-1.5 rounded-lg bg-slate-900 text-indigo-400">
                                    <CalendarIcon className="w-3.5 h-3.5 sm:w-4 h-4" />
                                </div>
                                <div className="flex flex-col items-start leading-tight min-w-0">
                                    <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-black">Periode</span>
                                    <span className="text-[11px] sm:text-sm truncate">
                                        {dateRange === '7d' && "7 Hari"}
                                        {dateRange === '30d' && "30 Hari"}
                                        {dateRange === '90d' && "3 Bulan"}
                                        {dateRange === 'year' && "1 Tahun"}
                                        {dateRange === 'custom' && (
                                            isSingleDate 
                                                ? formatDisplayDate(singleDate, 'dd MMM yyyy')
                                                : `${formatDisplayDate(customStartDate, 'dd MMM')} - ${formatDisplayDate(customEndDate, 'dd MMM yy')}`
                                        )}
                                    </span>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0 rounded-[2rem] overflow-hidden border-slate-200/50 shadow-2xl" align="start">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: '7d', label: '7 Hari' },
                                        { id: '30d', label: '30 Hari' },
                                        { id: '90d', label: '3 Bulan' },
                                        { id: 'year', label: '1 Tahun' }
                                    ].map((p) => (
                                        <Button
                                            key={p.id}
                                            variant={dateRange === p.id ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setDateRange(p.id as any)}
                                            className={cn(
                                                "rounded-xl text-xs font-bold transition-all",
                                                dateRange === p.id ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                                            )}
                                        >
                                            {p.label}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant={dateRange === 'custom' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setDateRange('custom')}
                                    className={cn(
                                        "w-full rounded-xl text-xs font-black uppercase tracking-widest gap-2 h-10 transition-all",
                                        dateRange === 'custom' 
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-transparent" 
                                            : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30"
                                    )}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Custom Periode
                                </Button>
                            </div>

                            <AnimatePresence>
                                {dateRange === 'custom' && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-white"
                                    >
                                        <div className="p-4 space-y-4">
                                            <div className="flex items-center justify-between p-1 bg-slate-100 rounded-xl">
                                                <Button
                                                    size="sm"
                                                    variant={isSingleDate ? 'default' : 'ghost'}
                                                    onClick={() => setIsSingleDate(true)}
                                                    className={cn("flex-1 rounded-lg text-[10px] font-black h-8", isSingleDate ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                                                >
                                                    TUNGGAL
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={!isSingleDate ? 'default' : 'ghost'}
                                                    onClick={() => setIsSingleDate(false)}
                                                    className={cn("flex-1 rounded-lg text-[10px] font-black h-8", !isSingleDate ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}
                                                >
                                                    RENTANG
                                                </Button>
                                            </div>

                                            <div className="space-y-4">
                                                {isSingleDate ? (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Tanggal</label>
                                                        <div className="relative">
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400 uppercase tracking-widest pointer-events-none">Tanggal</div>
                                                            <Input
                                                                type="date"
                                                                value={singleDate}
                                                                onChange={e => setSingleDate(e.target.value)}
                                                                className="h-12 pl-16 text-sm w-full bg-slate-50 cursor-pointer rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold pr-4"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rentang Waktu</label>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            <div className="relative">
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400 uppercase tracking-widest pointer-events-none">Dari</div>
                                                                <Input
                                                                    type="date"
                                                                    value={customStartDate}
                                                                    onChange={e => setCustomStartDate(e.target.value)}
                                                                    className="h-12 pl-12 text-sm w-full bg-slate-50 cursor-pointer rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold pr-4"
                                                                />
                                                            </div>
                                                            <div className="relative">
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-400 uppercase tracking-widest pointer-events-none">Ke</div>
                                                                <Input
                                                                    type="date"
                                                                    value={customEndDate}
                                                                    onChange={e => setCustomEndDate(e.target.value)}
                                                                    className="h-12 pl-12 text-sm w-full bg-slate-50 cursor-pointer rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold pr-4"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </PopoverContent>
                    </Popover>

                    {/* Mobile Filter Toggle */}
                    <Button 
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "md:hidden h-11 w-11 shrink-0 rounded-2xl transition-all border-slate-200 shadow-sm",
                            showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-2 ring-indigo-500/10" : "bg-white text-slate-600 active:bg-slate-50"
                        )}
                    >
                        <Filter className={cn("w-4 h-4", (showFilters || selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && "fill-indigo-600 text-indigo-600")} />
                    </Button>

                    {/* Compact Filter Reset for Mobile */}
                    {(selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && (
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                                setSelectedCabangIds([]);
                                setSelectedUserIds([]);
                                setSelectedKategoriIds([]);
                                setSelectedBarangIds([]);
                            }}
                            className="md:hidden h-11 w-11 shrink-0 rounded-2xl text-red-500 bg-red-50/50 border border-red-100"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 sm:gap-3">
                    <Button 
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex-1 md:flex-none h-11 px-4 sm:px-6 rounded-2xl transition-all font-bold gap-2",
                            showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                            (selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && !showFilters && "border-indigo-300 ring-2 ring-indigo-500/10"
                        )}
                    >
                        <Filter className={cn("w-4 h-4", (showFilters || selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && "fill-indigo-600 text-indigo-600")} />
                        <span className="hidden sm:inline">Filter</span>
                        {(selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && (
                            <Badge className="ml-1 bg-indigo-600 text-white h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px]">
                                {selectedCabangIds.length + selectedUserIds.length + selectedKategoriIds.length + selectedBarangIds.length}
                            </Badge>
                        )}
                    </Button>

                    {(selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && (
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                                setSelectedCabangIds([]);
                                setSelectedUserIds([]);
                                setSelectedKategoriIds([]);
                                setSelectedBarangIds([]);
                            }}
                            className="h-11 w-11 rounded-2xl text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                            title="Reset Filter"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                    <Button 
                        onClick={() => setIsAddOpen(true)} 
                        className="flex-1 md:flex-none h-11 px-4 sm:px-8 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 font-black uppercase tracking-wider text-[10px] sm:text-[11px]"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden xs:inline">Widget</span>
                        <span className="xs:hidden">Add</span>
                    </Button>
                </div>
            </motion.div>

            {/* Collapsible Advanced Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="border-none shadow-2xl shadow-slate-200/50 bg-white/50 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 ring-1 ring-slate-200/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {/* Branch Filter */}
                                <div className="space-y-2 sm:space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                                        <Building className="w-3 h-3" /> Cabang
                                    </Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 sm:h-12 justify-between rounded-2xl bg-white/80 border-slate-200 font-bold text-slate-700 text-xs sm:text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate hidden sm:inline">
                                                        {selectedCabangIds.length === 0 ? "Semua Cabang" : `${selectedCabangIds.length} Cabang`}
                                                    </span>
                                                    <span className="truncate sm:hidden text-indigo-600 font-black">
                                                        {selectedCabangIds.length === 0 ? "SEMUA" : selectedCabangIds.length}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[85vw] sm:w-[280px] p-2 rounded-2xl shadow-2xl border-slate-100">
                                            <div className="p-2 mb-2 relative">
                                                <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                                <Input 
                                                    placeholder="Cari Cabang..." 
                                                    className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50"
                                                    value={searchQuery.cabang}
                                                    onChange={(e) => setSearchQuery({...searchQuery, cabang: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                                                    onClick={() => setSelectedCabangIds([])}
                                                >
                                                    PILIH SEMUA
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-slate-500 hover:bg-slate-100 font-bold"
                                                    onClick={() => setSelectedCabangIds(['__none__'])}
                                                >
                                                    BATAL SEMUA
                                                </Button>
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                {listCabang
                                                    .filter(c => c.nama.toLowerCase().includes(searchQuery.cabang.toLowerCase()))
                                                    .map(c => {
                                                        const isAllSelected = selectedCabangIds.length === 0;
                                                        const isChecked = !selectedCabangIds.includes('__none__') && (isAllSelected || selectedCabangIds.includes(c.id));
                                                        return (
                                                            <DropdownMenuCheckboxItem
                                                                key={c.id}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        if (selectedCabangIds.includes('__none__')) {
                                                                            setSelectedCabangIds([c.id]);
                                                                        } else {
                                                                            const newList = [...selectedCabangIds, c.id];
                                                                            if (newList.length >= listCabang.length) setSelectedCabangIds([]);
                                                                            else setSelectedCabangIds(newList);
                                                                        }
                                                                    } else {
                                                                        if (isAllSelected) {
                                                                            setSelectedCabangIds(listCabang.filter(o => o.id !== c.id).map(o => o.id));
                                                                        } else {
                                                                            const newList = selectedCabangIds.filter(id => id !== c.id);
                                                                            setSelectedCabangIds(newList.length === 0 ? ['__none__'] : newList);
                                                                        }
                                                                    }
                                                                }}
                                                                className="rounded-xl text-xs py-3.5 pl-10 pr-5 font-medium"
                                                            >
                                                                {c.nama}
                                                            </DropdownMenuCheckboxItem>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* User/Sales Filter */}
                                <div className="space-y-2 sm:space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Salesman
                                    </Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 sm:h-12 justify-between rounded-2xl bg-white/80 border-slate-200 font-bold text-slate-700 text-xs sm:text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    <span className="truncate hidden sm:inline">
                                                        {selectedUserIds.length === 0 ? "Semua Sales" : `${selectedUserIds.length} Sales`}
                                                    </span>
                                                    <span className="truncate sm:hidden text-emerald-600 font-black">
                                                        {selectedUserIds.length === 0 ? "SEMUA" : selectedUserIds.length}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[85vw] sm:w-[280px] p-2 rounded-2xl shadow-2xl border-slate-100">
                                            <div className="p-2 mb-2 relative">
                                                <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                                <Input 
                                                    placeholder="Cari Sales..." 
                                                    className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50"
                                                    value={searchQuery.user}
                                                    onChange={(e) => setSearchQuery({...searchQuery, user: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                                                    onClick={() => setSelectedUserIds([])}
                                                >
                                                    PILIH SEMUA
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-slate-500 hover:bg-slate-100 font-bold"
                                                    onClick={() => setSelectedUserIds(['__none__'])}
                                                >
                                                    BATAL SEMUA
                                                </Button>
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                {users
                                                    .filter(u => getUserDisplayName(u, tampilNama).toLowerCase().includes(searchQuery.user.toLowerCase()))
                                                    .map(u => {
                                                        const isAllSelected = selectedUserIds.length === 0;
                                                        const isChecked = !selectedUserIds.includes('__none__') && (isAllSelected || selectedUserIds.includes(u.id));
                                                        return (
                                                            <DropdownMenuCheckboxItem
                                                                key={u.id}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        if (selectedUserIds.includes('__none__')) {
                                                                            setSelectedUserIds([u.id]);
                                                                        } else {
                                                                            const newList = [...selectedUserIds, u.id];
                                                                            if (newList.length >= users.length) setSelectedUserIds([]);
                                                                            else setSelectedUserIds(newList);
                                                                        }
                                                                    } else {
                                                                        if (isAllSelected) {
                                                                            setSelectedUserIds(users.filter(o => o.id !== u.id).map(o => o.id));
                                                                        } else {
                                                                            const newList = selectedUserIds.filter(id => id !== u.id);
                                                                            setSelectedUserIds(newList.length === 0 ? ['__none__'] : newList);
                                                                        }
                                                                    }
                                                                }}
                                                                className="rounded-xl text-xs py-3.5 pl-10 pr-5 font-medium"
                                                            >
                                                                {getUserDisplayName(u, tampilNama)}
                                                            </DropdownMenuCheckboxItem>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-2 sm:space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                                        <Tag className="w-3 h-3" /> Kategori
                                    </Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 sm:h-12 justify-between rounded-2xl bg-white/80 border-slate-200 font-bold text-slate-700 text-xs sm:text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Tag className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                    <span className="truncate hidden sm:inline">
                                                        {selectedKategoriIds.length === 0 ? "Semua Kategori" : `${selectedKategoriIds.length} Kategori`}
                                                    </span>
                                                    <span className="truncate sm:hidden text-orange-600 font-black">
                                                        {selectedKategoriIds.length === 0 ? "SEMUA" : selectedKategoriIds.length}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[85vw] sm:w-[280px] p-2 rounded-2xl shadow-2xl border-slate-100">
                                            <div className="p-2 mb-2 relative">
                                                <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                                <Input 
                                                    placeholder="Cari Kategori..." 
                                                    className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50"
                                                    value={searchQuery.kategori}
                                                    onChange={(e) => setSearchQuery({...searchQuery, kategori: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                                                    onClick={() => setSelectedKategoriIds([])}
                                                >
                                                    PILIH SEMUA
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-slate-500 hover:bg-slate-100 font-bold"
                                                    onClick={() => setSelectedKategoriIds(['__none__'])}
                                                >
                                                    BATAL SEMUA
                                                </Button>
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                {listKategori
                                                    .filter(c => c.nama.toLowerCase().includes(searchQuery.kategori.toLowerCase()))
                                                    .map(c => {
                                                        const isAllSelected = selectedKategoriIds.length === 0;
                                                        const isChecked = !selectedKategoriIds.includes('__none__') && (isAllSelected || selectedKategoriIds.includes(c.id));
                                                        return (
                                                            <DropdownMenuCheckboxItem
                                                                key={c.id}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        if (selectedKategoriIds.includes('__none__')) {
                                                                            setSelectedKategoriIds([c.id]);
                                                                        } else {
                                                                            const newList = [...selectedKategoriIds, c.id];
                                                                            if (newList.length >= listKategori.length) setSelectedKategoriIds([]);
                                                                            else setSelectedKategoriIds(newList);
                                                                        }
                                                                    } else {
                                                                        if (isAllSelected) {
                                                                            setSelectedKategoriIds(listKategori.filter(o => o.id !== c.id).map(o => o.id));
                                                                        } else {
                                                                            const newList = selectedKategoriIds.filter(id => id !== c.id);
                                                                            setSelectedKategoriIds(newList.length === 0 ? ['__none__'] : newList);
                                                                        }
                                                                    }
                                                                }}
                                                                className="rounded-xl text-xs py-3.5 pl-10 pr-5 font-medium"
                                                            >
                                                                {c.nama}
                                                            </DropdownMenuCheckboxItem>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Product Filter */}
                                <div className="space-y-2 sm:space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Produk
                                    </Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full h-11 sm:h-12 justify-between rounded-2xl bg-white/80 border-slate-200 font-bold text-slate-700 text-xs sm:text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate hidden sm:inline">
                                                        {selectedBarangIds.length === 0 ? "Semua Produk" : `${selectedBarangIds.length} Produk`}
                                                    </span>
                                                    <span className="truncate sm:hidden text-indigo-600 font-black">
                                                        {selectedBarangIds.length === 0 ? "SEMUA" : selectedBarangIds.length}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[85vw] sm:w-[320px] p-2 rounded-2xl shadow-2xl border-slate-100">
                                            <div className="p-2 mb-2 relative">
                                                <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                                <Input 
                                                    placeholder="Cari Produk..." 
                                                    className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50"
                                                    value={searchQuery.barang}
                                                    onChange={(e) => setSearchQuery({...searchQuery, barang: e.target.value})}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20 gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                                                    onClick={() => setSelectedBarangIds([])}
                                                >
                                                    PILIH SEMUA
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 flex-1 text-[10px] text-slate-500 hover:bg-slate-100 font-bold"
                                                    onClick={() => setSelectedBarangIds(['__none__'])}
                                                >
                                                    BATAL SEMUA
                                                </Button>
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar p-1">
                                                {barang
                                                    .filter(b => b.nama.toLowerCase().includes(searchQuery.barang.toLowerCase()))
                                                    .filter(b => selectedKategoriIds.length === 0 || selectedKategoriIds.includes(b.kategoriId))
                                                    .slice(0, 100)
                                                    .map(b => {
                                                        const isAllSelected = selectedBarangIds.length === 0;
                                                        const isChecked = !selectedBarangIds.includes('__none__') && (isAllSelected || selectedBarangIds.includes(b.id));
                                                        return (
                                                            <DropdownMenuCheckboxItem
                                                                key={b.id}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        if (selectedBarangIds.includes('__none__')) {
                                                                            setSelectedBarangIds([b.id]);
                                                                        } else {
                                                                            const newList = [...selectedBarangIds, b.id];
                                                                            // Since we slice, we can't easily check if all are selected
                                                                            setSelectedBarangIds(newList);
                                                                        }
                                                                    } else {
                                                                        if (isAllSelected) {
                                                                            // For products, "Clear All" is better if they want to uncheck one from "All"
                                                                            // but we don't have all IDs readily available if sliced.
                                                                            // However, 'barang' contains all.
                                                                            setSelectedBarangIds(barang.filter(o => o.id !== b.id).map(o => o.id));
                                                                        } else {
                                                                            const newList = selectedBarangIds.filter(id => id !== b.id);
                                                                            setSelectedBarangIds(newList.length === 0 ? ['__none__'] : newList);
                                                                        }
                                                                    }
                                                                }}
                                                                className="rounded-xl text-xs py-3.5 pl-10 pr-5 font-medium"
                                                            >
                                                                {b.nama}
                                                            </DropdownMenuCheckboxItem>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            
                            {(selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && (
                                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => {
                                            setSelectedCabangIds([]);
                                            setSelectedUserIds([]);
                                            setSelectedKategoriIds([]);
                                            setSelectedBarangIds([]);
                                        }}
                                        className="rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                                    >
                                        <X className="w-3 h-3 mr-1" /> Clear
                                    </Button>
                                    {selectedCabangIds.length > 0 && <Badge variant="secondary" className="rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] h-6">{selectedCabangIds.length} Cabang</Badge>}
                                    {selectedUserIds.length > 0 && <Badge variant="secondary" className="rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] h-6">{selectedUserIds.length} Sales</Badge>}
                                    {selectedKategoriIds.length > 0 && <Badge variant="secondary" className="rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] h-6">{selectedKategoriIds.length} Kategori</Badge>}
                                    {selectedBarangIds.length > 0 && <Badge variant="secondary" className="rounded-xl bg-slate-100 text-slate-600 font-bold text-[9px] h-6">{selectedBarangIds.length} Produk</Badge>}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium KPI Section */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-8">
                {[
                    { label: 'Total Omzet', value: formatRupiah(totals.omzet), icon: TrendingUp, color: 'indigo', gradient: 'from-indigo-600 to-blue-600', span: 'col-span-2 sm:col-span-1' },
                    { label: 'Transaksi', value: totals.trx.toLocaleString(), icon: Activity, color: 'emerald', gradient: 'from-emerald-600 to-teal-600', span: 'col-span-1' },
                    { label: 'Unit', value: totals.qty.toLocaleString(), icon: ShoppingBag, color: 'orange', gradient: 'from-orange-600 to-amber-600', span: 'col-span-1' }
                ].map((kpi, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={kpi.span}
                    >
                        <Card className="overflow-hidden border-none bg-white shadow-lg sm:shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200 group hover:shadow-indigo-500/10 transition-all duration-500 rounded-3xl sm:rounded-[2.5rem] relative h-full">
                            <div className={cn("absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 -mr-6 sm:-mr-10 -mt-6 sm:-mt-10 rounded-full blur-2xl sm:blur-3xl group-hover:opacity-20 transition-opacity duration-700", 
                                kpi.color === 'indigo' ? "bg-indigo-500/10" : kpi.color === 'emerald' ? "bg-emerald-500/10" : "bg-orange-500/10"
                            )} />
                            <CardContent className="p-4 sm:p-8 relative h-full flex flex-col justify-between">
                                <div className="flex items-center justify-between mb-3 sm:mb-6">
                                    <div className={cn("p-2.5 sm:p-4 rounded-xl sm:rounded-[1.5rem] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm",
                                        kpi.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : kpi.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                    )}>
                                        <kpi.icon className="w-4 h-4 sm:w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col items-end opacity-0 sm:opacity-100">
                                        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 sm:py-1 rounded-full mb-1">
                                            <CalendarIcon className="w-2.5 h-2.5 sm:w-3 h-3" />
                                            <span>Terfilter</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{kpi.label}</p>
                                    <h3 className={cn(
                                        "font-black bg-gradient-to-br bg-clip-text text-transparent tracking-tight truncate",
                                        kpi.span.includes('col-span-2') ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-2xl md:text-3xl",
                                        kpi.gradient
                                    )}>
                                        {kpi.value}
                                    </h3>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Dashboard Visual Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <AnimatePresence mode="popLayout">
                    {widgets.map((widget, idx) => {
                        const data = getChartData(widget.source, widget.metric);
                        return (
                            <motion.div
                                key={widget.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.5, delay: idx * 0.05 }}
                            >
                                <Card className="group overflow-hidden border-none bg-white shadow-xl sm:shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200 hover:ring-indigo-500/20 transition-all duration-700 rounded-[2rem] sm:rounded-[2.5rem]">
                                    <CardHeader className="flex flex-col space-y-4 p-5 sm:p-8 pb-4">
                                        <div className="flex flex-row items-center justify-between">
                                            <div className="space-y-1.5 max-w-[70%]">
                                                <div className="flex items-center gap-3">
                                                    <div className="hidden xs:block w-1 h-5 sm:w-1.5 sm:h-6 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                                    <CardTitle className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">
                                                        {widget.title.includes('Omzet') || widget.title.includes('Trx') || widget.title.includes('Qty') 
                                                            ? widget.title.replace(/Omzet|Trx|Qty/g, widget.metric === 'total_omzet' ? 'Omzet' : widget.metric === 'total_trx' ? 'Trx' : 'Qty')
                                                            : widget.title
                                                        }
                                                        <span className="ml-1.5 text-slate-400 text-[10px] sm:text-xs font-bold whitespace-nowrap">
                                                            ({widget.source === 'daily' ? 'Hari' : widget.source === 'weekly' ? 'Minggu' : 'Bulan'})
                                                        </span>
                                                    </CardTitle>
                                                </div>
                                                <CardDescription className="text-[8px] sm:text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest px-1 sm:px-4 truncate">
                                                    <Layout className="w-2.5 h-2.5 sm:w-3 h-3" />
                                                    {widget.source} • {widget.metric.replace('total_', '')}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className={cn(
                                                        "h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all shadow-sm",
                                                        widget.isScrollable ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "hover:bg-slate-100 text-slate-400"
                                                    )}
                                                    onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, isScrollable: !w.isScrollable } : w))}
                                                    title={widget.isScrollable ? "Nonaktifkan Scroll" : "Aktifkan Scroll"}
                                                >
                                                    {widget.isScrollable ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 h-4" />}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm" 
                                                    onClick={() => handleRemoveWidget(widget.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Widget Specific Toggles - Responsive Grid */}
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                            {/* Metric Switch */}
                                            <div className="flex bg-slate-50 border border-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
                                                {(['total_omzet', 'total_trx', 'total_qty'] as DataMetric[]).map(m => (
                                                    <button
                                                        key={m}
                                                        onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, metric: m } : w))}
                                                        className={cn(
                                                            "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all whitespace-nowrap",
                                                            widget.metric === m ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                                        )}
                                                    >
                                                        {m === 'total_omzet' ? 'Rp' : m === 'total_trx' ? 'Trx' : 'Qty'}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Granularity Switch (only for time trends) */}
                                            {['daily', 'weekly', 'monthly'].includes(widget.source) && (
                                                <div className="flex bg-slate-50 border border-slate-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
                                                    {(['daily', 'weekly', 'monthly'] as DataSource[]).map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setWidgets(prev => prev.map(w => w.id === widget.id ? { ...w, source: s } : w))}
                                                            className={cn(
                                                                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black uppercase transition-all whitespace-nowrap",
                                                                widget.source === s ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                                                            )}
                                                        >
                                                            {s === 'daily' ? 'H' : s === 'weekly' ? 'M' : 'B'}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="h-[250px] xs:h-[280px] sm:h-[360px] w-full p-3 sm:p-8 pt-1 sm:pt-4">
                                        {data.length > 0 ? (
                                            <div className="h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                                {renderChart(widget, data)}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 sm:gap-4 opacity-50">
                                                <div className="p-3 sm:p-6 rounded-full bg-slate-50 border-2 border-dashed border-slate-200">
                                                    <BarChart3 className="w-6 h-6 sm:w-10 h-10 stroke-[1.5]" />
                                                </div>
                                                <p className="text-[9px] sm:text-sm font-bold uppercase tracking-widest">No data</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Premium Add Visualization Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="w-[95vw] sm:max-w-[550px] rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-2xl ring-1 ring-slate-900/5">
                    <div className="bg-slate-900 p-6 sm:p-10 text-white relative">
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-indigo-500/20 rounded-full -mr-24 -mt-24 blur-3xl" />
                        
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-4 sm:right-6 top-4 sm:top-6 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
                            onClick={() => setIsAddOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="p-2.5 sm:p-3 bg-indigo-500/20 rounded-xl sm:rounded-2xl ring-1 ring-indigo-500/30">
                                <Sparkles className="w-5 h-5 sm:w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">Kustom Visual</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium text-xs sm:text-sm">
                                    Tambah widget analitik baru
                                </DialogDescription>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white/50 overflow-y-auto max-h-[75vh] sm:max-h-[60vh] custom-scrollbar pb-24 sm:pb-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Nama Widget</Label>
                            <Input
                                placeholder="Contoh: Performa Sales Area A"
                                value={tempConfig.title}
                                onChange={(e) => setTempConfig({ ...tempConfig, title: e.target.value })}
                                className="h-12 sm:h-14 rounded-2xl border-slate-200 bg-white/80 px-4 sm:px-6 font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tipe Grafik</Label>
                                <Select value={tempConfig.type} onValueChange={(v) => setTempConfig({ ...tempConfig, type: v as ChartType })}>
                                    <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-slate-200 bg-white/80 font-bold px-4 sm:px-6">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-2">
                                        <SelectItem value="bar" className="rounded-xl p-3 font-bold">Bar Chart</SelectItem>
                                        <SelectItem value="line" className="rounded-xl p-3 font-bold">Line Chart</SelectItem>
                                        <SelectItem value="area" className="rounded-xl p-3 font-bold">Area Chart</SelectItem>
                                        <SelectItem value="pie" className="rounded-xl p-3 font-bold">Pie Chart</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Sumber Data</Label>
                                <Select value={tempConfig.source} onValueChange={(v) => setTempConfig({ ...tempConfig, source: v as DataSource })}>
                                    <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-slate-200 bg-white/80 font-bold px-4 sm:px-6">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-2 max-h-[300px]">
                                        <SelectItem value="daily" className="rounded-xl p-3 font-bold">Harian</SelectItem>
                                        <SelectItem value="weekly" className="rounded-xl p-3 font-bold">Mingguan</SelectItem>
                                        <SelectItem value="monthly" className="rounded-xl p-3 font-bold">Bulanan</SelectItem>
                                        <SelectItem value="sales" className="rounded-xl p-3 font-bold">Per Salesman</SelectItem>
                                        <SelectItem value="produk" className="rounded-xl p-3 font-bold">Per Produk</SelectItem>
                                        <SelectItem value="kategori" className="rounded-xl p-3 font-bold">Per Kategori</SelectItem>
                                        <SelectItem value="pelanggan" className="rounded-xl p-3 font-bold">Per Pelanggan</SelectItem>
                                        <SelectItem value="cabang" className="rounded-xl p-3 font-bold">Per Cabang</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Metrik Utama</Label>
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                                {(['total_omzet', 'total_trx', 'total_qty'] as DataMetric[]).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setTempConfig({ ...tempConfig, metric: m })}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            tempConfig.metric === m ? "bg-white text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {m === 'total_omzet' ? 'Omzet' : m === 'total_trx' ? 'Trx' : 'Qty'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button 
                            onClick={handleAddWidget}
                            className="w-full h-14 sm:h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Simpan Konfigurasi
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Mobile Bottom Action Bar */}
            <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-2xl border-t border-slate-200/50 flex items-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
            >
                <Button 
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        "h-14 flex-1 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] gap-2 border-slate-200",
                        showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white text-slate-600 active:bg-slate-50"
                    )}
                >
                    <Filter className={cn("w-4 h-4", (showFilters || selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && "fill-indigo-600 text-indigo-600")} />
                    Filter
                    {(selectedCabangIds.length > 0 || selectedUserIds.length > 0 || selectedKategoriIds.length > 0 || selectedBarangIds.length > 0) && (
                        <Badge className="bg-indigo-600 text-white h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px]">
                            {selectedCabangIds.length + selectedUserIds.length + selectedKategoriIds.length + selectedBarangIds.length}
                        </Badge>
                    )}
                </Button>
                <Button 
                    onClick={() => setIsAddOpen(true)} 
                    className="h-14 flex-1 bg-slate-900 active:bg-indigo-600 text-white rounded-2xl shadow-xl shadow-slate-200 transition-all gap-2 font-black uppercase tracking-widest text-[10px]"
                >
                    <Plus className="w-4 h-4" />
                    Widget
                </Button>
            </motion.div>
        </div>
    );
}

