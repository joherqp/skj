'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatRupiah } from '@/lib/utils';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
    ArrowRightLeft, 
    LayoutGrid, 
    Building, 
    Calendar, 
    ChevronDown, 
    ChevronRight, 
    Plus, 
    X, 
    ListFilter, 
    BarChart3, 
    Download, 
    Maximize2, 
    Minimize2,
    SortAsc,
    SortDesc,
    Tag,
    Package,
    Users,
    Filter,
    Settings2,
    Database,
    Trophy,
    Target
} from 'lucide-react';
import { ScopeFilters } from '@/components/shared/ScopeFilters';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuCheckboxItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type PivotField = 'tanggal' | 'bulan' | 'tahun' | 'kategori' | 'produk' | 'pelanggan' | 'sales' | 'cabang' | 'kategoriPelanggan';
type AggregationType = 'sum_total' | 'sum_qty' | 'count_trx';
type SortOrder = 'asc' | 'desc';

interface PivotDataItem {
    tanggal: string;
    bulan: string;
    tahun: string;
    kategori: string;
    produk: string;
    pelanggan: string;
    kategoriPelanggan: string;
    sales: string;
    cabang: string;
    total: number;
    qty: number;
    trx: number;
    transactionId: string;
}

const FIELD_LABELS: Record<PivotField, string> = {
    tanggal: 'Tanggal',
    bulan: 'Bulan',
    tahun: 'Tahun',
    kategori: 'Kategori Produk',
    produk: 'Produk',
    pelanggan: 'Toko/Pelanggan',
    kategoriPelanggan: 'Kategori Pelanggan',
    sales: 'Sales',
    cabang: 'Cabang'
};

export default function AnalisaPivot() {
    const { penjualan, barang, kategori: kategoriList, pelanggan, kategoriPelanggan: kategoriPelangganList, users, cabang, viewMode } = useDatabase();
    const { user: currentUser } = useAuth();

    // Configuration State
    const [rowFields, setRowFields] = useState<PivotField[]>(['tanggal', 'cabang', 'sales', 'kategoriPelanggan', 'pelanggan']);
    const [colFields, setColFields] = useState<PivotField[]>(['produk']);
    const [metrics, setMetrics] = useState<AggregationType[]>(['sum_qty', 'sum_total']);
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const [sortBy, setSortBy] = useState<'label' | 'value'>('label');

    // Date Filters (Standardized to match RekapPenjualan)
    const [isSingleDate, setIsSingleDate] = useState(true);
    const [singleDate, setSingleDate] = useState(() => new Date().toLocaleDateString('sv').split('T')[0]);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toLocaleDateString('sv').split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('sv').split('T')[0]);

    const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));

    // UI State
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [selectedKategoriIds, setSelectedKategoriIds] = useState<string[]>([]);
    const [selectedKategoriPelangganIds, setSelectedKategoriPelangganIds] = useState<string[]>([]);
    const [selectedBarangIds, setSelectedBarangIds] = useState<string[]>([]);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync selectedCabangIds with currentUser once loaded
    useEffect(() => {
        if (currentUser && !isAdminOrOwner && currentUser.cabangId) {
            setSelectedCabangIds([currentUser.cabangId]);
        }
    }, [currentUser, isAdminOrOwner]);

    // Auto-select "Rokok" category on initial load
    useEffect(() => {
        if (selectedKategoriIds.length === 0 && kategoriList.length > 0) {
            const rokoCat = kategoriList.find(c => 
                c.nama.toLowerCase() === 'rokok' || 
                c.nama.toLowerCase() === 'roko' ||
                c.nama.toLowerCase().includes('rokok') ||
                c.nama.toLowerCase().includes('roko')
            );
            if (rokoCat) {
                setSelectedKategoriIds([rokoCat.id]);
            }
        }
    }, [kategoriList]);

    const toggleExpand = (id: string) => {
        const next = new Set(expandedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedRows(next);
    };

    const expandAll = (root: any[]) => {
        const next = new Set<string>();
        const addIds = (nodes: any[]) => {
            nodes.forEach(n => {
                if (n.children && n.children.length > 0) {
                    next.add(n.id);
                    addIds(n.children);
                }
            });
        };
        addIds(root);
        setExpandedRows(next);
    };

    const collapseAll = () => setExpandedRows(new Set());

    // Calculate available branches and users based on data in the selected period and access rights
    const { availableCabangIds, availableUserIds } = useMemo(() => {
        const cabs = new Set<string>();
        const usrs = new Set<string>();

        const isLeader = currentUser?.roles.includes('leader');

        penjualan.forEach(p => {
            if (p.status === 'batal' || p.status === 'draft') return;
            
            const d = format(new Date(p.tanggal), 'yyyy-MM-dd');
            const inPeriod = isSingleDate ? (d === singleDate) : (d >= startDate && d <= endDate);
            
            if (inPeriod) {
                const pSalesId = p.salesId || p.createdBy;
                
                // Permission check for available filters
                let canSee = false;
                if (isAdminOrOwner) {
                    canSee = true;
                } else if (isLeader) {
                    canSee = p.cabangId === currentUser?.cabangId;
                } else {
                    canSee = pSalesId === currentUser?.id;
                }

                if (canSee) {
                    if (p.cabangId) cabs.add(p.cabangId);
                    if (pSalesId) usrs.add(pSalesId);
                }
            }
        });

        return {
            availableCabangIds: Array.from(cabs),
            availableUserIds: Array.from(usrs)
        };
    }, [penjualan, isSingleDate, singleDate, startDate, endDate, currentUser, isAdminOrOwner]);


    // 1. Flatten Data Source
    const flatData = useMemo(() => {
        const isAdminOrOwner = currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner');
        const isLeader = currentUser?.roles.includes('leader');

        const data: PivotDataItem[] = [];
        penjualan
            .filter(p => p.status !== 'batal' && p.status !== 'draft')
            .filter(p => {
                const pSalesId = p.salesId || p.createdBy;
                // Base access check (Same as RekapPenjualan)
                let hasAccess = false;
                if (isAdminOrOwner) {
                    hasAccess = viewMode === 'me' ? (pSalesId === currentUser?.id) : true;
                } else if (isLeader) {
                    hasAccess = p.cabangId === currentUser?.cabangId && (viewMode === 'me' ? (pSalesId === currentUser?.id) : true);
                } else {
                    hasAccess = pSalesId === currentUser?.id;
                }
                if (!hasAccess) return false;

                // Multi-select Filters
                if (selectedCabangIds.length > 0 && !selectedCabangIds.includes(p.cabangId || '')) return false;
                if (selectedUserIds.length > 0 && !selectedUserIds.includes(pSalesId || '')) return false;
                
                const cust = pelanggan.find(c => c.id === p.pelangganId);
                if (selectedKategoriPelangganIds.length > 0 && !selectedKategoriPelangganIds.includes(cust?.kategoriId || '')) return false;

                return true;
            })
            .filter(p => {
                // Use format from date-fns for consistent local date string
                const d = format(new Date(p.tanggal), 'yyyy-MM-dd');
                if (isSingleDate) return d === singleDate;
                return d >= startDate && d <= endDate;
            })
            .forEach(p => {
                const date = new Date(p.tanggal);
                const cust = pelanggan.find(c => c.id === p.pelangganId);
                const custName = cust?.nama || 'Umum';
                const custCatName = kategoriPelangganList.find(kc => kc.id === cust?.kategoriId)?.nama || 'Tanpa Kategori';
                
                const sId = p.salesId || p.createdBy;
                const u = users.find(u => u.id === sId);
                const salesName = u?.nama || 'Unknown';
                const cabangName = cabang.find(c => c.id === p.cabangId)?.nama || 'Unknown';

                p.items.forEach(item => {
                    const product = barang.find(b => b.id === item.barangId);
                    const catId = product?.kategoriId || '';
                    const catName = kategoriList.find(c => c.id === catId)?.nama || 'Lainnya';

                    // Product & Category Filters
                    if (selectedKategoriIds.length > 0 && !selectedKategoriIds.includes(catId)) return;
                    if (selectedBarangIds.length > 0 && !selectedBarangIds.includes(item.barangId)) return;

                    data.push({
                        tanggal: format(date, 'dd/MM/yyyy'),
                        bulan: date.toLocaleString('id-ID', { month: 'long' }),
                        tahun: date.getFullYear().toString(),
                        kategori: catName,
                        produk: product?.nama || 'Unknown',
                        pelanggan: custName,
                        kategoriPelanggan: custCatName,
                        sales: salesName,
                        cabang: cabangName,
                        total: Number(item.subtotal) || 0,
                        qty: (Number(item.jumlah) || 0) * (Number(item.konversi) || 1),
                        trx: 1,
                        transactionId: p.id
                    });
                });
            });
        return data;
    }, [penjualan, barang, kategoriList, pelanggan, kategoriPelangganList, users, cabang, selectedCabangIds, selectedUserIds, selectedKategoriIds, selectedKategoriPelangganIds, selectedBarangIds, isSingleDate, singleDate, startDate, endDate, viewMode, currentUser]);

    // 2. Pivot Engine
    const pivotTable = useMemo(() => {
        const colValueKeys = new Set<string>();
        if (colFields.length > 0) {
            flatData.forEach(item => {
                const cKey = colFields.map(f => item[f] || '').join(' | ');
                colValueKeys.add(cKey);
            });
        }
        const sortedColKeys = Array.from(colValueKeys).sort();

        const root: any = { children: {}, values: {}, id: 'root' };
        const grandTotal: Record<string, Record<string, any>> = {};
        const overallGrandTotal: Record<string, any> = {};

        // Initialize overall grand total
        metrics.forEach(m => {
            if (m === 'count_trx') overallGrandTotal[m] = new Set<string>();
            else overallGrandTotal[m] = 0;
        });

        flatData.forEach(item => {
            const hasCols = colFields.length > 0;
            const cKey = hasCols ? colFields.map(f => item[f] || '').join(' | ') : '';
            
            if (hasCols) {
                if (!grandTotal[cKey]) {
                    grandTotal[cKey] = {};
                    metrics.forEach(m => {
                        if (m === 'count_trx') grandTotal[cKey][m] = new Set<string>();
                        else grandTotal[cKey][m] = 0;
                    });
                }
            }

            metrics.forEach(m => {
                let amount = 0;
                if (m === 'sum_total') amount = item.total;
                else if (m === 'sum_qty') amount = item.qty;
                
                if (m === 'count_trx') {
                    if (hasCols) grandTotal[cKey][m].add(item.transactionId);
                    overallGrandTotal[m].add(item.transactionId);
                } else {
                    if (hasCols) grandTotal[cKey][m] += amount;
                    overallGrandTotal[m] += amount;
                }
            });

            let current = root;
            rowFields.forEach((field, idx) => {
                const val = String(item[field] || 'N/A');
                const path = idx === 0 ? [val] : [...current.id.split(':::'), val];
                const pathStr = path.join(':::');

                if (!current.children[val]) {
                    const values: Record<string, any> = {};
                    const rowTotals: Record<string, any> = {};
                    metrics.forEach(m => {
                        if (m === 'count_trx') rowTotals[m] = new Set<string>();
                        else rowTotals[m] = 0;
                    });

                    current.children[val] = {
                        id: pathStr,
                        label: val,
                        level: idx,
                        children: {},
                        values, 
                        rowTotals
                    };
                }
                current = current.children[val];

                if (hasCols) {
                    if (!current.values[cKey]) {
                        current.values[cKey] = {};
                        metrics.forEach(m => {
                            if (m === 'count_trx') current.values[cKey][m] = new Set<string>();
                            else current.values[cKey][m] = 0;
                        });
                    }
                }

                metrics.forEach(m => {
                    let amount = 0;
                    if (m === 'sum_total') amount = item.total;
                    else if (m === 'sum_qty') amount = item.qty;

                    if (m === 'count_trx') {
                        if (hasCols) current.values[cKey][m].add(item.transactionId);
                        current.rowTotals[m].add(item.transactionId);
                    } else {
                        if (hasCols) current.values[cKey][m] += amount;
                        current.rowTotals[m] += amount;
                    }
                });
            });
        });

        // Convert Sets to Sizes for rendering
        const processNodeForDisplay = (node: any) => {
            metrics.forEach(m => {
                if (m === 'count_trx') {
                    node.rowTotals[m] = node.rowTotals[m].size;
                    Object.keys(node.values).forEach(ck => {
                        node.values[ck][m] = node.values[ck][m].size;
                    });
                }
            });
            Object.values(node.children).forEach(c => processNodeForDisplay(c));
        };
        Object.values(root.children).forEach(c => processNodeForDisplay(c));

        // Process grand totals for display
        const displayGrandTotal: Record<string, Record<string, number>> = {};
        Object.keys(grandTotal).forEach(ck => {
            displayGrandTotal[ck] = {};
            metrics.forEach(m => {
                displayGrandTotal[ck][m] = m === 'count_trx' ? grandTotal[ck][m].size : grandTotal[ck][m];
            });
        });

        const displayOverallTotal: Record<string, number> = {};
        metrics.forEach(m => {
            displayOverallTotal[m] = m === 'count_trx' ? overallGrandTotal[m].size : overallGrandTotal[m];
        });

        const sortNodes = (nodes: any[]) => {
            return nodes.sort((a, b) => {
                let comparison = 0;
                if (sortBy === 'label') {
                    comparison = String(a.label).localeCompare(String(b.label));
                } else {
                    const m = metrics[0] || 'sum_total';
                    comparison = (Number(a.rowTotals[m]) || 0) - (Number(b.rowTotals[m]) || 0);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });
        };

        const formatNode = (node: any) => {
            const childArray = sortNodes(Object.values(node.children));
            childArray.forEach((c: any) => formatNode(c));
            node.children = childArray;
        };
        formatNode(root);

        return {
            root: root.children,
            cols: sortedColKeys,
            grandTotal: displayGrandTotal,
            overallTotal: displayOverallTotal,
            metrics
        };
    }, [flatData, rowFields, colFields, metrics, sortOrder, sortBy]);

    const formatMetricValue = (val: number, m: AggregationType) => {
        if (m === 'sum_total') return formatRupiah(val);
        return new Intl.NumberFormat('id-ID').format(val);
    };

    // Recursive Row Component
    const RenderPivotRow = ({ node, cols, metrics }: { node: any, cols: string[], metrics: AggregationType[] }) => {
        const isExpanded = expandedRows.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
            <>
                <motion.tr 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "group transition-all duration-300 border-b border-slate-100/40",
                        node.level === 0 
                            ? "bg-white hover:bg-indigo-100/80 hover:shadow-[inset_12px_0_0_0_#4f46e5]" 
                            : "bg-white/40 hover:bg-indigo-100/70 hover:shadow-[inset_10px_0_0_0_#6366f1]",
                        isExpanded && "bg-indigo-50/10 shadow-[inset_4px_0_0_0_#4f46e5]"
                    )}
                >
                    <TableCell 
                        className="border-r border-slate-100/50 py-3.5 relative" 
                        style={{ paddingLeft: `${node.level * (isMobile ? 12 : 24) + 32}px` }}
                    >
                        {/* Level Indicator Line */}
                        {node.level > 0 && (
                            <div 
                                className="absolute top-0 bottom-0 w-px bg-slate-200/40" 
                                style={{ left: `${(node.level - 1) * (isMobile ? 12 : 24) + 38}px` }}
                            />
                        )}
                        
                        <div className="flex items-center gap-3 relative z-10">
                            {hasChildren ? (
                                <button 
                                    onClick={() => toggleExpand(node.id)} 
                                    className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-500",
                                        isExpanded 
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-90 scale-110" 
                                            : "bg-white text-slate-400 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 shadow-sm hover:scale-105"
                                    )}
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <div className="w-6 flex justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-[11px] transition-all tracking-tight",
                                    hasChildren ? "font-bold text-slate-900" : "text-slate-600 font-medium"
                                )}>
                                    {node.label}
                                </span>
                                {hasChildren && isExpanded && (
                                    <span className="text-[8px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-0.5 opacity-70">
                                        Subtotal
                                    </span>
                                )}
                            </div>
                        </div>
                    </TableCell>
                    {cols.map(col => (
                        <React.Fragment key={col}>
                            {metrics.map(m => (
                                <TableCell 
                                    key={`${col}-${m}`} 
                                    className={cn(
                                        "text-right tabular-nums text-[11px] py-3.5 px-4 border-r border-slate-100/30 last:border-r-0 text-slate-700",
                                        hasChildren ? "font-bold" : "font-normal"
                                    )}
                                >
                                    {node.values[col] && node.values[col][m] ? (
                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            {formatMetricValue(node.values[col][m], m)}
                                        </motion.span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </TableCell>
                            ))}
                        </React.Fragment>
                    ))}
                    {metrics.map(m => (
                        <TableCell 
                            key={`total-${m}`} 
                            className={cn(
                                "text-right tabular-nums text-[11px] py-3.5 px-6 bg-indigo-50/20 text-indigo-700 border-l border-indigo-100/30",
                                hasChildren ? "font-black" : "font-medium"
                            )}
                        >
                            {formatMetricValue(node.rowTotals[m] || 0, m)}
                        </TableCell>
                    ))}
                </motion.tr>
                <AnimatePresence mode="popLayout">
                    {hasChildren && isExpanded && node.children.map((child: any) => (
                        <RenderPivotRow key={child.id} node={child} cols={cols} metrics={metrics} />
                    ))}
                </AnimatePresence>
            </>
        );
    };

    const addField = (type: 'row' | 'col', field: PivotField) => {
        if (type === 'row') {
            if (!rowFields.includes(field)) setRowFields([...rowFields, field]);
        } else {
            if (!colFields.includes(field)) setColFields([...colFields, field]);
        }
    };

    const removeField = (type: 'row' | 'col', index: number) => {
        if (type === 'row') {
            const next = [...rowFields];
            next.splice(index, 1);
            setRowFields(next);
        } else {
            const next = [...colFields];
            next.splice(index, 1);
            setColFields(next);
        }
    };

    const handleExportCSV = () => {
        // Simple CSV Export
        const headers = ['Dimensions', ...pivotTable.cols.flatMap(c => metrics.map(m => `${c} (${m})`)), ...metrics.map(m => `Total (${m})`)].join(',');
        const rows: string[] = [];
        
        const flattenRows = (nodes: any[], prefix = '') => {
            nodes.forEach(n => {
                const label = prefix ? `${prefix} > ${n.label}` : n.label;
                const row = [
                    `"${label}"`,
                    ...pivotTable.cols.flatMap(c => metrics.map(m => n.values[c]?.[m] || 0)),
                    ...metrics.map(m => n.rowTotals[m] || 0)
                ].join(',');
                rows.push(row);
                if (n.children) flattenRows(n.children, label);
            });
        };
        flattenRows(Object.values(pivotTable.root));
        
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Analisa_Pivot_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
        
        // Header
        doc.setFontSize(18);
        doc.setTextColor(40, 42, 54);
        doc.text('LAPORAN ANALISA PIVOT', 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Dicetak pada: ${timestamp}`, 14, 22);
        doc.text(`Periode: ${isSingleDate ? singleDate : `${startDate} s/d ${endDate}`}`, 14, 27);

        // Filters Info
        let filterText = "Filter: ";
        if (selectedKategoriIds.length > 0) {
            const names = selectedKategoriIds.map(id => kategoriList.find(k => k.id === id)?.nama).join(', ');
            filterText += `Kategori (${names})`;
        } else {
            filterText += "Semua Kategori";
        }
        doc.text(filterText, 14, 32);

        const tableHeaders = [['Hierarki Baris']];
        pivotTable.cols.forEach(col => {
            metrics.forEach(m => {
                const metricLabel = m === 'sum_total' ? 'Rp' : m === 'sum_qty' ? 'Qty' : 'Trx';
                tableHeaders[0].push(`${col}\n(${metricLabel})`);
            });
        });
        metrics.forEach(m => {
            const metricLabel = m === 'sum_total' ? 'Rp' : m === 'sum_qty' ? 'Qty' : 'Trx';
            tableHeaders[0].push(`Total\n(${metricLabel})`);
        });

        const tableData: any[] = [];
        
        const flattenForPDF = (nodes: any[], level = 0) => {
            nodes.forEach(n => {
                const indent = '  '.repeat(level);
                const row = [`${indent}${n.label}`];
                
                pivotTable.cols.forEach(c => {
                    metrics.forEach(m => {
                        row.push(n.values[c]?.[m] ? formatMetricValue(n.values[c][m], m) : '-');
                    });
                });
                
                metrics.forEach(m => {
                    row.push(formatMetricValue(n.rowTotals[m] || 0, m));
                });
                
                tableData.push(row);
                if (n.children && n.children.length > 0) {
                    flattenForPDF(n.children, level + 1);
                }
            });
        };

        flattenForPDF(Object.values(pivotTable.root));

        // Grand Total Row
        const grandTotalRow = ['GRAND TOTAL'];
        pivotTable.cols.forEach(col => {
            metrics.forEach(m => {
                grandTotalRow.push(pivotTable.grandTotal[col]?.[m] ? formatMetricValue(pivotTable.grandTotal[col][m], m) : '-');
            });
        });
        metrics.forEach(m => {
            grandTotalRow.push(formatMetricValue(pivotTable.overallTotal[m] || 0, m));
        });
        tableData.push(grandTotalRow);

        autoTable(doc, {
            head: tableHeaders,
            body: tableData,
            startY: 40,
            theme: 'grid',
            headStyles: { 
                fillColor: [79, 70, 229], 
                textColor: 255, 
                fontSize: 8, 
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold'
            },
            bodyStyles: { fontSize: 7, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 'auto', fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            margin: { top: 40, left: 10, right: 10 },
            didParseCell: (data) => {
                // Style for Grand Total row
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [238, 242, 255];
                    data.cell.styles.textColor = [79, 70, 229];
                }
                // Right align numeric columns
                if (data.column.index > 0) {
                    data.cell.styles.halign = 'right';
                }
            }
        });

        doc.save(`Analisa_Pivot_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
    };

    const clearAllFilters = () => {
        setSelectedCabangIds([]);
        setSelectedUserIds([]);
        setSelectedKategoriIds([]);
        setSelectedKategoriPelangganIds([]);
        setSelectedBarangIds([]);
    };

    return (
        <div className="space-y-6 pb-20 p-1 sm:p-0">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
            >
                {/* Header & Main Filters Card */}
                <Card className="border-none shadow-2xl bg-white/70 backdrop-blur-2xl rounded-[2.5rem] overflow-visible ring-1 ring-slate-200/50">
                    <CardContent className="p-6 sm:p-10">
                        <div className="flex flex-col gap-10">
                            {/* Top row: Identity & Main Actions */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100/80">
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                                        <div className="relative bg-gradient-to-tr from-indigo-600 to-violet-600 p-4 rounded-3xl shadow-xl shadow-indigo-100 rotate-3">
                                            <Settings2 className="w-7 h-7 text-white -rotate-3" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/50">
                                                Advanced Analytics
                                            </span>
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                                                Live Data
                                            </span>
                                        </div>
                                        <h1 className="text-3xl font-black tracking-tight text-slate-900">
                                            Pivot <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Engine</span>
                                        </h1>
                                        <p className="text-slate-400 text-sm font-medium tracking-wide">Analisa data penjualan multidimensi secara dinamis</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleExportCSV}
                                            className="h-10 px-6 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white transition-all font-bold text-xs gap-2.5"
                                        >
                                            <Download className="w-4 h-4" /> EXPORT CSV
                                        </Button>
                                        <div className="w-px h-6 bg-slate-200"></div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleExportPDF}
                                            className="h-10 px-6 rounded-xl text-slate-600 hover:text-red-600 hover:bg-white transition-all font-bold text-xs gap-2.5"
                                        >
                                            <Download className="w-4 h-4" /> EXPORT PDF
                                        </Button>
                                    </div>
                                    <Button 
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearAllFilters} 
                                        className="h-11 px-6 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-all font-black rounded-2xl gap-2 border border-transparent hover:border-red-100"
                                    >
                                        <X className="w-4 h-4" /> RESET ENGINE
                                    </Button>
                                </div>
                            </div>

                            {/* Second row: Data Scope & Date Range */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                                <div className="xl:col-span-7 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/50">
                                            <Database className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cakupan Data</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">FILTER SUMBER DATA UTAMA</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4">
                                        <ScopeFilters
                                            selectedCabangIds={selectedCabangIds}
                                            setSelectedCabangIds={setSelectedCabangIds}
                                            selectedUserIds={selectedUserIds}
                                            setSelectedUserIds={setSelectedUserIds}
                                            availableCabangIds={availableCabangIds}
                                            availableUserIds={availableUserIds}
                                            className="!space-y-0 flex flex-wrap items-center gap-4"
                                        />

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-12 text-xs justify-between bg-white/50 backdrop-blur-sm font-bold px-5 border-slate-200 hover:border-indigo-400 hover:ring-4 hover:ring-indigo-50 transition-all rounded-2xl shadow-sm min-w-[180px]">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <Tag className="w-4 h-4 text-purple-500" />
                                                        <span className="truncate">
                                                            {selectedKategoriIds.length === 0 ? "Semua Kategori" : `${selectedKategoriIds.length} Kategori`}
                                                        </span>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-[280px] max-h-[400px] overflow-y-auto rounded-[1.5rem] shadow-2xl border-slate-100 p-3 bg-white/95 backdrop-blur-xl">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Produk Kategori</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="my-2 bg-slate-100" />
                                                <DropdownMenuCheckboxItem checked={selectedKategoriIds.length === 0} onCheckedChange={() => setSelectedKategoriIds([])} className="text-xs rounded-xl py-3 px-4 font-medium">
                                                    Semua Kategori
                                                </DropdownMenuCheckboxItem>
                                                {kategoriList.map(cat => (
                                                    <DropdownMenuCheckboxItem key={cat.id} checked={selectedKategoriIds.includes(cat.id)} onCheckedChange={(checked) => checked ? setSelectedKategoriIds([...selectedKategoriIds, cat.id]) : setSelectedKategoriIds(selectedKategoriIds.filter(id => id !== cat.id))} className="text-xs rounded-xl py-3 px-4 font-medium">
                                                        {cat.nama}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-12 text-xs justify-between bg-white/50 backdrop-blur-sm font-bold px-5 border-slate-200 hover:border-indigo-400 hover:ring-4 hover:ring-indigo-50 transition-all rounded-2xl shadow-sm min-w-[180px]">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <Users className="w-4 h-4 text-orange-500" />
                                                        <span className="truncate">
                                                            {selectedKategoriPelangganIds.length === 0 ? "Semua Tipe Toko" : `${selectedKategoriPelangganIds.length} Tipe Toko`}
                                                        </span>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-[280px] max-h-[400px] overflow-y-auto rounded-[1.5rem] shadow-2xl border-slate-100 p-3 bg-white/95 backdrop-blur-xl">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">Kategori Pelanggan</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="my-2 bg-slate-100" />
                                                <DropdownMenuCheckboxItem checked={selectedKategoriPelangganIds.length === 0} onCheckedChange={() => setSelectedKategoriPelangganIds([])} className="text-xs rounded-xl py-3 px-4 font-medium">
                                                    Semua Tipe Toko
                                                </DropdownMenuCheckboxItem>
                                                {kategoriPelangganList.map(cat => (
                                                    <DropdownMenuCheckboxItem key={cat.id} checked={selectedKategoriPelangganIds.includes(cat.id)} onCheckedChange={(checked) => checked ? setSelectedKategoriPelangganIds([...selectedKategoriPelangganIds, cat.id]) : setSelectedKategoriPelangganIds(selectedKategoriPelangganIds.filter(id => id !== cat.id))} className="text-xs rounded-xl py-3 px-4 font-medium">
                                                        {cat.nama}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="xl:col-span-5 space-y-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100/50">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Periode Analisa</h3>
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">RENTANG WAKTU DATA</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-[10px] text-indigo-600 hover:text-white font-black px-4 py-2 bg-indigo-50 hover:bg-indigo-600 rounded-xl transition-all border border-indigo-100/50 uppercase tracking-widest"
                                            onClick={() => setIsSingleDate(!isSingleDate)}
                                        >
                                            {isSingleDate ? 'Range Mode' : 'Single Mode'}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {isSingleDate ? (
                                            <Input
                                                type="date"
                                                value={singleDate}
                                                onChange={e => setSingleDate(e.target.value)}
                                                className="h-12 text-sm w-full bg-white/50 backdrop-blur-sm cursor-pointer rounded-2xl border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold px-5"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-[1.25rem] border border-slate-100 w-full shadow-inner">
                                                <Input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={e => setStartDate(e.target.value)}
                                                    className="h-10 text-[11px] flex-1 bg-white cursor-pointer rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 font-bold px-3"
                                                />
                                                <span className="text-slate-400 text-[10px] font-black">TO</span>
                                                <Input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={e => setEndDate(e.target.value)}
                                                    className="h-10 text-[11px] flex-1 bg-white cursor-pointer rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-500/20 font-bold px-3"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Third row: Pivot Schema Config */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pt-4">
                                {/* Baris Configuration */}
                                <div className="space-y-5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors ring-1 ring-slate-200/50">
                                            <ListFilter className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Baris (Rows)</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">HIERARKI DIMENSI</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50/50 rounded-3xl min-h-[72px] border border-slate-100/50 shadow-inner group-hover:border-indigo-100 transition-colors">
                                        <AnimatePresence mode="popLayout">
                                            {rowFields.map((f, i) => (
                                                <motion.div
                                                    key={`row-${f}`}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    layout
                                                >
                                                    <Badge variant="secondary" className="pl-4 pr-2 py-2 gap-2 text-[10px] font-black bg-white border-slate-200 text-slate-700 shadow-sm rounded-xl hover:border-indigo-300 transition-all group/badge">
                                                        {FIELD_LABELS[f]}
                                                        <button onClick={() => removeField('row', i)} className="p-1 hover:bg-red-50 text-slate-300 group-hover/badge:text-red-400 rounded-lg transition-colors">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <Select onValueChange={(v) => addField('row', v as PivotField)}>
                                            <SelectTrigger className="w-fit min-w-[110px] h-9 px-4 text-[10px] bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all border-none shadow-lg shadow-indigo-100">
                                                <Plus className="w-3.5 h-3.5 mr-2" /> ADD
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 bg-white/95 backdrop-blur-xl">
                                                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                                    <SelectItem key={k} value={k} disabled={rowFields.includes(k as PivotField)} className="text-xs rounded-xl py-3 font-bold">
                                                        {v}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Kolom Configuration */}
                                <div className="space-y-5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors ring-1 ring-slate-200/50">
                                            <ArrowRightLeft className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kolom (Cols)</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">GRUP DATA HORIZONTAL</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50/50 rounded-3xl min-h-[72px] border border-slate-100/50 shadow-inner group-hover:border-violet-100 transition-colors">
                                        <AnimatePresence mode="popLayout">
                                            {colFields.map((f, i) => (
                                                <motion.div
                                                    key={`col-${f}`}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    layout
                                                >
                                                    <Badge variant="secondary" className="pl-4 pr-2 py-2 gap-2 text-[10px] font-black bg-white border-slate-200 text-slate-700 shadow-sm rounded-xl hover:border-violet-300 transition-all group/badge">
                                                        {FIELD_LABELS[f]}
                                                        <button onClick={() => removeField('col', i)} className="p-1 hover:bg-red-50 text-slate-300 group-hover/badge:text-red-400 rounded-lg transition-colors">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <Select onValueChange={(v) => addField('col', v as PivotField)}>
                                            <SelectTrigger className="w-fit min-w-[110px] h-9 px-4 text-[10px] bg-violet-600 text-white rounded-xl font-black hover:bg-violet-700 transition-all border-none shadow-lg shadow-violet-100">
                                                <Plus className="w-3.5 h-3.5 mr-2" /> ADD
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 bg-white/95 backdrop-blur-xl">
                                                {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                                    <SelectItem key={k} value={k} disabled={colFields.includes(k as PivotField)} className="text-xs rounded-xl py-3 font-bold">
                                                        {v}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Metrics & Sorting */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/50">
                                                <BarChart3 className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Value</h3>
                                        </div>
                                        <div className="flex flex-col gap-2 p-2.5 bg-slate-50/50 rounded-[1.5rem] border border-slate-100">
                                            {(['sum_qty', 'sum_total', 'count_trx'] as AggregationType[]).map(m => (
                                                <Button
                                                    key={m}
                                                    variant={metrics.includes(m) ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "h-10 text-[10px] px-4 rounded-xl uppercase font-black tracking-widest transition-all justify-start gap-3",
                                                        metrics.includes(m) 
                                                            ? "bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100" 
                                                            : "text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                    )}
                                                    onClick={() => {
                                                        if (metrics.includes(m)) {
                                                            if (metrics.length > 1) setMetrics(metrics.filter(x => x !== m));
                                                        } else {
                                                            setMetrics([...metrics, m]);
                                                        }
                                                    }}
                                                >
                                                    <div className={cn("w-2 h-2 rounded-full", metrics.includes(m) ? "bg-indigo-500 animate-pulse" : "bg-slate-200")} />
                                                    {m === 'sum_total' ? 'RP' : m === 'sum_qty' ? 'QUANTITY' : 'TRANSAKSI'}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/50">
                                                <SortAsc className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Urutan (Sort)</h3>
                                        </div>
                                        <div className="flex flex-col gap-4 p-4 bg-slate-50/50 rounded-[1.5rem] border border-slate-100">
                                            {/* Sort Basis */}
                                            <div className="grid grid-cols-2 gap-2 p-1.5 bg-white/50 rounded-2xl ring-1 ring-slate-200/30">
                                                <Button
                                                    variant={sortBy === 'label' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 rounded-xl transition-all font-black text-[9px] tracking-widest gap-2",
                                                        sortBy === 'label' ? "bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100" : "text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                    )}
                                                    onClick={() => setSortBy('label')}
                                                >
                                                    <Tag className="w-3 h-3" /> LABEL
                                                </Button>
                                                <Button
                                                    variant={sortBy === 'value' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 rounded-xl transition-all font-black text-[9px] tracking-widest gap-2",
                                                        sortBy === 'value' ? "bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100" : "text-slate-400 hover:text-indigo-600 hover:bg-white"
                                                    )}
                                                    onClick={() => setSortBy('value')}
                                                >
                                                    <BarChart3 className="w-3 h-3" /> VALUE
                                                </Button>
                                            </div>

                                            {/* Sort Direction */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    variant={sortOrder === 'asc' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 rounded-xl transition-all font-black text-[9px] tracking-widest gap-2",
                                                        sortOrder === 'asc' ? "bg-white text-emerald-600 shadow-md ring-1 ring-emerald-100" : "text-slate-400 hover:text-emerald-600 hover:bg-white"
                                                    )}
                                                    onClick={() => setSortOrder('asc')}
                                                >
                                                    <SortAsc className="w-3.5 h-3.5" /> ASC
                                                </Button>
                                                <Button
                                                    variant={sortOrder === 'desc' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 rounded-xl transition-all font-black text-[9px] tracking-widest gap-2",
                                                        sortOrder === 'desc' ? "bg-white text-orange-600 shadow-md ring-1 ring-orange-100" : "text-slate-400 hover:text-orange-600 hover:bg-white"
                                                    )}
                                                    onClick={() => setSortOrder('desc')}
                                                >
                                                    <SortDesc className="w-3.5 h-3.5" /> DESC
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Results Table Card */}
                <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] rounded-[3rem] bg-white/80 backdrop-blur-2xl ring-1 ring-slate-200/50">
                    <CardHeader className="py-10 px-10 bg-slate-50/30 border-b border-slate-100/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-40 rounded-full group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative bg-slate-900 p-5 rounded-[1.75rem] shadow-2xl shadow-indigo-100 rotate-6 group-hover:rotate-0 transition-transform duration-500">
                                    <LayoutGrid className="w-6 h-6 text-indigo-400" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Pivot Analysis Results</h2>
                                    <Badge className="bg-indigo-600 text-[10px] font-black px-3 py-1 rounded-lg shadow-lg shadow-indigo-100">
                                        {flatData.length} RECORDS
                                    </Badge>
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Generated dynamic report based on current schema</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-[1.5rem] border border-slate-100 shadow-sm">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-11 px-6 text-[10px] font-black rounded-2xl gap-3 text-slate-600 hover:text-indigo-600 hover:bg-white transition-all shadow-none hover:shadow-lg hover:shadow-indigo-50"
                                onClick={() => expandAll(Object.values(pivotTable.root))}
                            >
                                <Maximize2 className="w-4 h-4" /> EXPAND ALL
                            </Button>
                            <div className="w-px h-6 bg-slate-200"></div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-11 px-6 text-[10px] font-black rounded-2xl gap-3 text-slate-600 hover:text-indigo-600 hover:bg-white transition-all shadow-none hover:shadow-lg hover:shadow-indigo-50"
                                onClick={collapseAll}
                            >
                                <Minimize2 className="w-4 h-4" /> COLLAPSE ALL
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <div className="min-w-max pb-12">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white/95 backdrop-blur-xl z-40 shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b-2 border-slate-100/50">
                                            <TableHead rowSpan={metrics.length > 1 ? 2 : 1} className="min-w-[380px] pl-10 py-8 font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 border-r border-slate-100/50 bg-slate-50/20">
                                                Hierarchy Structure
                                            </TableHead>
                                            {pivotTable.cols.map(col => (
                                                <TableHead key={col} colSpan={metrics.length} className="text-center min-w-[160px] px-8 py-5 font-black text-xs uppercase tracking-widest text-slate-900 bg-white border-r last:border-r-0 border-slate-100/50">
                                                    {col}
                                                </TableHead>
                                            ))}
                                            <TableHead colSpan={metrics.length} className="text-center min-w-[200px] px-10 py-5 font-black text-xs uppercase tracking-[0.2em] text-indigo-700 bg-indigo-50/30 border-l-2 border-indigo-100/50">
                                                Grand Summary
                                            </TableHead>
                                        </TableRow>
                                        {metrics.length > 1 && (
                                            <TableRow className="hover:bg-transparent border-b-2 border-slate-100/50 bg-white/50">
                                                {pivotTable.cols.map(col => (
                                                    <React.Fragment key={col}>
                                                        {metrics.map(m => (
                                                            <TableHead key={`${col}-${m}`} className="text-right px-6 py-4 font-black text-[9px] uppercase tracking-widest text-slate-400 border-r border-slate-100/30">
                                                                {m === 'sum_total' ? 'RP' : m === 'sum_qty' ? 'QTY' : 'TRX'}
                                                            </TableHead>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                                {metrics.map(m => (
                                                    <TableHead key={`total-head-${m}`} className="text-right px-8 py-4 font-black text-[9px] uppercase tracking-widest text-indigo-500/60 border-r border-indigo-100/20 last:border-r-0">
                                                        {m === 'sum_total' ? 'RP' : m === 'sum_qty' ? 'QTY' : 'TRX'}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        )}
                                    </TableHeader>
                                    <TableBody>
                                        {Object.values(pivotTable.root).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={1 + (pivotTable.cols.length + 1) * metrics.length} className="h-[500px] text-center">
                                                    <div className="flex flex-col items-center justify-center gap-6">
                                                        <div className="relative">
                                                            <div className="absolute inset-0 bg-slate-100 blur-3xl opacity-50 rounded-full scale-150"></div>
                                                            <div className="relative w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center border border-slate-100">
                                                                <Filter className="w-12 h-12 text-slate-200 animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <p className="text-xl font-black text-slate-800 tracking-tight">No analytics found</p>
                                                            <p className="text-xs uppercase tracking-[0.3em] font-bold text-slate-400">Adjust your engine filters or date range</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {Object.values(pivotTable.root).map((node: any) => (
                                                    <RenderPivotRow key={node.id} node={node} cols={pivotTable.cols} metrics={metrics} />
                                                ))}
                                                {/* Sticky Grand Total Row */}
                                                <TableRow className="bg-slate-900 border-t-8 border-white sticky bottom-0 z-30 transition-all shadow-[0_-10px_40px_rgba(0,0,0,0.1)] hover:bg-slate-900">
                                                    <TableCell className="font-black text-white pl-10 py-8 border-r border-slate-800 text-[12px] uppercase tracking-[0.4em]">
                                                        <div className="flex items-center gap-4">
                                                            <Trophy className="w-5 h-5 text-indigo-400" />
                                                            TOTAL ENGINE SUMMARY
                                                        </div>
                                                    </TableCell>
                                                    {pivotTable.cols.map(col => (
                                                        <React.Fragment key={col}>
                                                            {metrics.map(m => (
                                                                <TableCell key={`${col}-${m}`} className="text-right font-black tabular-nums text-indigo-100 px-8 py-8 text-xs border-r border-slate-800 last:border-r-0 opacity-90">
                                                                    {pivotTable.grandTotal[col] && pivotTable.grandTotal[col][m] ? formatMetricValue(pivotTable.grandTotal[col][m], m) : '-'}
                                                                </TableCell>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                    {metrics.map(m => {
                                                        const totalValue = pivotTable.overallTotal[m] || 0;
                                                        return (
                                                            <TableCell key={`grand-total-${m}`} className="text-right font-black text-white border-l-2 border-indigo-500/50 tabular-nums px-10 py-8 text-sm bg-indigo-900/40 backdrop-blur-md">
                                                                {formatMetricValue(totalValue, m)}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
