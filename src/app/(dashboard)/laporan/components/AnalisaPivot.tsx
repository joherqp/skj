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
    Users
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
    const { penjualan, barang, kategori: kategoriList, pelanggan, kategoriPelanggan: kategoriPelangganList, users, cabang, karyawan, viewMode } = useDatabase();
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
    const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>(
        isAdminOrOwner ? [] : (currentUser?.cabangId ? [currentUser.cabangId] : [])
    );
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

    // Calculate available branches and users based on data in the selected period
    const { availableCabangIds, availableUserIds } = useMemo(() => {
        const cabs = new Set<string>();
        const usrs = new Set<string>();

        penjualan.forEach(p => {
            if (p.status === 'batal' || p.status === 'draft') return;
            
            const d = format(new Date(p.tanggal), 'yyyy-MM-dd');
            const inPeriod = isSingleDate ? (d === singleDate) : (d >= startDate && d <= endDate);
            
            if (inPeriod) {
                if (p.cabangId) cabs.add(p.cabangId);
                const sId = p.salesId || p.createdBy;
                if (sId) usrs.add(sId);
            }
        });

        return {
            availableCabangIds: Array.from(cabs),
            availableUserIds: Array.from(usrs)
        };
    }, [penjualan, isSingleDate, singleDate, startDate, endDate]);


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
                const k = karyawan.find(k => k.userAccountId === sId);
                const salesName = k?.nama || u?.nama || 'Unknown';
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
    }, [penjualan, barang, kategoriList, pelanggan, kategoriPelangganList, users, cabang, karyawan, selectedCabangIds, selectedUserIds, selectedKategoriIds, selectedKategoriPelangganIds, selectedBarangIds, isSingleDate, singleDate, startDate, endDate, viewMode, currentUser]);

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
        processNodeForDisplay(root);

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
                <TableRow className={`hover:bg-muted/30 group transition-colors ${node.level === 0 ? 'bg-slate-50/50' : ''}`}>
                    <TableCell className="border-r py-2 relative" style={{ paddingLeft: `${node.level * (isMobile ? 12 : 20) + 16}px` }}>
                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button onClick={() => toggleExpand(node.id)} className="p-0.5 hover:bg-slate-200 rounded transition-transform duration-200">
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                            ) : (
                                <div className="w-4" />
                            )}
                            <span className={`text-[11px] truncate ${hasChildren ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                {node.label}
                            </span>
                            {hasChildren && isExpanded && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 ml-1 opacity-50 font-normal">
                                    Subtotal
                                </Badge>
                            )}
                        </div>
                    </TableCell>
                    {cols.map(col => (
                        <React.Fragment key={col}>
                            {metrics.map(m => (
                                <TableCell key={`${col}-${m}`} className="text-right tabular-nums text-[11px] py-2 border-r last:border-r-0 border-slate-100">
                                    {node.values[col] && node.values[col][m] ? formatMetricValue(node.values[col][m], m) : '-'}
                                </TableCell>
                            ))}
                        </React.Fragment>
                    ))}
                    {metrics.map(m => (
                        <TableCell key={`total-${m}`} className="text-right font-bold tabular-nums text-[11px] py-2 bg-primary/5 border-l border-primary/10">
                            {formatMetricValue(node.rowTotals[m] || 0, m)}
                        </TableCell>
                    ))}
                </TableRow>
                {hasChildren && isExpanded && node.children.map((child: any) => (
                    <RenderPivotRow key={child.id} node={child} cols={cols} metrics={metrics} />
                ))}
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
        <div className="space-y-6 animate-in fade-in duration-700 p-2 sm:p-0">
            {/* Improved Filter Section */}
            <Card className="border-none shadow-md bg-white/80 backdrop-blur-md rounded-2xl overflow-visible ring-1 ring-slate-200/50">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-6">
                        {/* Top Row: Basic Selection */}
                        <div className="flex flex-col xl:flex-row xl:items-end gap-4 sm:gap-6 pb-6 border-b border-slate-100">
                            {/* Left: Scope */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 text-primary font-bold ml-1">
                                    <div className="flex items-center gap-2">
                                        <Building className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider">Cakupan Data</span>
                                    </div>
                                    <button onClick={clearAllFilters} className="text-[10px] text-slate-400 hover:text-primary transition-colors flex items-center gap-1 font-normal">
                                        <X className="w-3 h-3" /> RESET FILTER
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                                    <ScopeFilters
                                        selectedCabangIds={selectedCabangIds}
                                        setSelectedCabangIds={setSelectedCabangIds}
                                        selectedUserIds={selectedUserIds}
                                        setSelectedUserIds={setSelectedUserIds}
                                        availableCabangIds={availableCabangIds}
                                        availableUserIds={availableUserIds}
                                        className="!space-y-0 grid grid-cols-1 sm:flex sm:flex-row items-center gap-2"
                                    />


                                    {/* Kategori Filter */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                                                        <Tag className="w-3.5 h-3.5 shrink-0" />
                                                    </div>
                                                    <span className="truncate">
                                                        {selectedKategoriIds.length === 0
                                                            ? "Semua Kategori"
                                                            : `${selectedKategoriIds.length} Kategori`}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto rounded-xl shadow-xl border-muted-foreground/10">
                                            <DropdownMenuLabel className="text-xs">Daftar Kategori Produk</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={selectedKategoriIds.length === 0}
                                                onCheckedChange={() => setSelectedKategoriIds([])}
                                                className="text-xs"
                                            >
                                                Semua Kategori
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {kategoriList.map(cat => (
                                                <DropdownMenuCheckboxItem
                                                    key={cat.id}
                                                    checked={selectedKategoriIds.includes(cat.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedKategoriIds([...selectedKategoriIds, cat.id]);
                                                        } else {
                                                            setSelectedKategoriIds(selectedKategoriIds.filter(id => id !== cat.id));
                                                        }
                                                    }}
                                                    className="text-xs"
                                                >
                                                    {cat.nama}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Kategori Pelanggan Filter */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                                                        <Users className="w-3.5 h-3.5 shrink-0" />
                                                    </div>
                                                    <span className="truncate">
                                                        {selectedKategoriPelangganIds.length === 0
                                                            ? "Semua Tipe Toko"
                                                            : `${selectedKategoriPelangganIds.length} Tipe`}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto rounded-xl shadow-xl border-muted-foreground/10">
                                            <DropdownMenuLabel className="text-xs">Tipe Toko/Pelanggan</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={selectedKategoriPelangganIds.length === 0}
                                                onCheckedChange={() => setSelectedKategoriPelangganIds([])}
                                                className="text-xs"
                                            >
                                                Semua Tipe
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {kategoriPelangganList.map(cat => (
                                                <DropdownMenuCheckboxItem
                                                    key={cat.id}
                                                    checked={selectedKategoriPelangganIds.includes(cat.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedKategoriPelangganIds([...selectedKategoriPelangganIds, cat.id]);
                                                        } else {
                                                            setSelectedKategoriPelangganIds(selectedKategoriPelangganIds.filter(id => id !== cat.id));
                                                        }
                                                    }}
                                                    className="text-xs"
                                                >
                                                    {cat.nama}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Produk Filter */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                                        <Package className="w-3.5 h-3.5 shrink-0" />
                                                    </div>
                                                    <span className="truncate">
                                                        {selectedBarangIds.length === 0
                                                            ? "Semua Produk"
                                                            : `${selectedBarangIds.length} Produk`}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[280px] max-h-[400px] overflow-y-auto rounded-xl shadow-xl border-muted-foreground/10">
                                            <DropdownMenuLabel className="text-xs">Daftar Produk</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={selectedBarangIds.length === 0}
                                                onCheckedChange={() => setSelectedBarangIds([])}
                                                className="text-xs"
                                            >
                                                Semua Produk
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {barang
                                                .filter(b => selectedKategoriIds.length === 0 || selectedKategoriIds.includes(b.kategoriId || ''))
                                                .map(b => (
                                                    <DropdownMenuCheckboxItem
                                                        key={b.id}
                                                        checked={selectedBarangIds.includes(b.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedBarangIds([...selectedBarangIds, b.id]);
                                                            } else {
                                                                setSelectedBarangIds(selectedBarangIds.filter(id => id !== b.id));
                                                            }
                                                        }}
                                                        className="text-xs"
                                                    >
                                                        {b.nama}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Middle: Date Filter */}
                            <div className="flex flex-col gap-2 flex-1 w-full xl:max-w-sm">
                                <div className="flex items-center justify-between gap-2 ml-1">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider">Periode</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-[10px] text-primary hover:underline cursor-pointer font-bold px-2 py-0.5 bg-primary/5 rounded-full"
                                        onClick={() => setIsSingleDate(!isSingleDate)}
                                    >
                                        {isSingleDate ? 'RENTANG TANGGAL' : 'PILIH 1 HARI'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isSingleDate ? (
                                        <Input
                                            type="date"
                                            value={singleDate}
                                            onChange={e => setSingleDate(e.target.value)}
                                            className="h-10 text-xs w-full bg-white cursor-pointer rounded-xl border-slate-200 shadow-sm focus:ring-primary/20"
                                        />
                                    ) : (
                                        <>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                className="h-10 text-xs bg-white cursor-pointer rounded-xl border-slate-200 shadow-sm flex-1 focus:ring-primary/20"
                                            />
                                            <span className="text-slate-400 text-[10px] font-bold px-1">s/d</span>
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                className="h-10 text-xs bg-white cursor-pointer rounded-xl border-slate-200 shadow-sm flex-1 focus:ring-primary/20"
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-2 w-full xl:w-auto xl:self-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportCSV}
                                    className="h-10 flex-1 xl:flex-none xl:px-4 rounded-xl border-slate-200 hover:bg-slate-50 gap-2"
                                >
                                    <Download className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">CSV</span>
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleExportPDF}
                                    className="h-10 flex-1 xl:flex-none xl:px-4 rounded-xl shadow-sm gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="text-xs font-semibold uppercase tracking-wider">PDF</span>
                                </Button>
                            </div>
                        </div>

                        {/* Bottom Row: Pivot Configuration */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                            {/* Baris */}
                            <div className="md:col-span-4 space-y-3">
                                <div className="flex items-center gap-2 text-slate-500 font-bold ml-1">
                                    <ListFilter className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-wider">Baris (Hierarki)</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-xl min-h-[44px] border border-slate-100 shadow-inner">
                                    {rowFields.map((f, i) => (
                                        <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-[10px] bg-white border-slate-200 shadow-sm">
                                            {FIELD_LABELS[f]}
                                            <button onClick={() => removeField('row', i)} className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                    <Select onValueChange={(v) => addField('row', v as PivotField)}>
                                        <SelectTrigger className="w-fit min-w-[80px] h-6 px-2 text-[9px] bg-primary/5 border-primary/20 rounded-md text-primary font-bold hover:bg-primary/10 transition-colors">
                                            <Plus className="w-2.5 h-2.5 mr-1" /> TAMBAH
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                                <SelectItem key={k} value={k} disabled={rowFields.includes(k as PivotField)}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Kolom */}
                            <div className="md:col-span-4 space-y-3">
                                <div className="flex items-center gap-2 text-slate-500 font-bold ml-1">
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-wider">Kolom</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 rounded-xl min-h-[44px] border border-slate-100 shadow-inner">
                                    {colFields.map((f, i) => (
                                        <Badge key={i} variant="secondary" className="pl-2 pr-1 py-1 gap-1 text-[10px] bg-white border-slate-200 shadow-sm">
                                            {FIELD_LABELS[f]}
                                            <button onClick={() => removeField('col', i)} className="p-0.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                    {colFields.length === 0 && <span className="text-[9px] text-slate-400 font-medium py-1.5 ml-1">Hanya Total</span>}
                                    <Select onValueChange={(v) => addField('col', v as PivotField)}>
                                        <SelectTrigger className="w-fit min-w-[80px] h-6 px-2 text-[9px] bg-primary/5 border-primary/20 rounded-md text-primary font-bold hover:bg-primary/10 transition-colors">
                                            <Plus className="w-2.5 h-2.5 mr-1" /> TAMBAH
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(FIELD_LABELS).map(([k, v]) => (
                                                <SelectItem key={k} value={k} disabled={colFields.includes(k as PivotField)}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Metrik & Sorting */}
                            <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-500 font-bold ml-1">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span className="text-[10px] uppercase tracking-wider">Metrik</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 h-10">
                                        {(['sum_qty', 'sum_total', 'count_trx'] as AggregationType[]).map(m => (
                                            <Button
                                                key={m}
                                                variant={metrics.includes(m) ? 'default' : 'ghost'}
                                                size="sm"
                                                className="flex-1 h-full text-[9px] px-1 rounded-lg uppercase font-bold"
                                                onClick={() => {
                                                    if (metrics.includes(m)) {
                                                        if (metrics.length > 1) setMetrics(metrics.filter(x => x !== m));
                                                    } else {
                                                        setMetrics([...metrics, m]);
                                                    }
                                                }}
                                            >
                                                {m === 'sum_total' ? 'Rp' : m === 'sum_qty' ? 'Qty' : 'Trx'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-slate-500 font-bold ml-1">
                                        <SortAsc className="w-3.5 h-3.5" />
                                        <span className="text-[10px] uppercase tracking-wider">Urutan</span>
                                    </div>
                                    <div className="flex gap-1 h-10 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                        <Button
                                            variant={sortOrder === 'asc' ? 'default' : 'ghost'}
                                            size="icon"
                                            className="flex-1 h-full rounded-lg"
                                            onClick={() => setSortOrder('asc')}
                                        >
                                            <SortAsc className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant={sortOrder === 'desc' ? 'default' : 'ghost'}
                                            size="icon"
                                            className="flex-1 h-full rounded-lg"
                                            onClick={() => setSortOrder('desc')}
                                        >
                                            <SortDesc className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table Area with Controls */}
            <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white/90 backdrop-blur-md ring-1 ring-slate-200/50">
                <CardHeader className="py-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:space-y-0">
                    <CardTitle className="text-sm font-bold flex items-center gap-3 text-slate-800">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p>Hasil Analisa Pivot</p>
                            <p className="text-[10px] font-normal text-slate-500 uppercase tracking-widest mt-0.5">
                                {flatData.length} Data Diproses
                            </p>
                        </div>
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 flex-1 sm:flex-none text-[10px] font-bold rounded-lg gap-1.5"
                            onClick={() => expandAll(Object.values(pivotTable.root))}
                        >
                            <Maximize2 className="w-3 h-3" /> <span className="hidden xs:inline">EKSPAND SEMUA</span><span className="xs:hidden">EKSPAND</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 flex-1 sm:flex-none text-[10px] font-bold rounded-lg gap-1.5"
                            onClick={collapseAll}
                        >
                            <Minimize2 className="w-3 h-3" /> <span className="hidden xs:inline">CIUTKAN SEMUA</span><span className="xs:hidden">CIUTKAN</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px] w-full">
                        <div className="min-w-max">
                            <Table>
                            <TableHeader className="sticky top-0 bg-white z-30 shadow-md">
                                <TableRow className="hover:bg-transparent border-b-2 border-slate-100">
                                    <TableHead rowSpan={metrics.length > 1 ? 2 : 1} className="min-w-[280px] pl-6 py-4 font-black text-[10px] uppercase tracking-tighter text-slate-900 border-r bg-slate-50/80">
                                        STRUKTUR HIERARKI BARIS
                                    </TableHead>
                                    {pivotTable.cols.map(col => (
                                        <TableHead key={col} colSpan={metrics.length} className="text-center min-w-[130px] px-4 py-2 font-black text-[10px] uppercase tracking-tighter text-slate-900 bg-white border-r last:border-r-0 border-slate-50">
                                            {col}
                                        </TableHead>
                                    ))}
                                    <TableHead colSpan={metrics.length} className="text-center min-w-[150px] px-6 py-2 font-black text-[10px] uppercase tracking-tighter text-primary bg-primary/5 border-l-2 border-primary/10">
                                        TOTAL KESELURUHAN
                                    </TableHead>
                                </TableRow>
                                {metrics.length > 1 && (
                                    <TableRow className="hover:bg-transparent border-b-2 border-slate-100">
                                        {pivotTable.cols.map(col => (
                                            <React.Fragment key={col}>
                                                {metrics.map(m => (
                                                    <TableHead key={`${col}-${m}`} className="text-right px-2 py-2 font-bold text-[9px] uppercase text-slate-500 border-r border-slate-50">
                                                        {m === 'sum_total' ? 'Rp' : m === 'sum_qty' ? 'Qty' : 'Trx'}
                                                    </TableHead>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                        {metrics.map(m => (
                                            <TableHead key={`total-head-${m}`} className="text-right px-2 py-2 font-bold text-[9px] uppercase text-primary border-r border-primary/5 last:border-r-0">
                                                {m === 'sum_total' ? 'Rp' : m === 'sum_qty' ? 'Qty' : 'Trx'}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {Object.values(pivotTable.root).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={1 + (pivotTable.cols.length + 1) * metrics.length} className="h-60 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                                                    <ListFilter className="w-6 h-6 opacity-20" />
                                                </div>
                                                <p className="text-sm font-medium">Tidak ada data ditemukan</p>
                                                <p className="text-[10px] uppercase tracking-widest">Coba atur filter atau periode</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {Object.values(pivotTable.root).map((node: any) => (
                                            <RenderPivotRow key={node.id} node={node} cols={pivotTable.cols} metrics={metrics} />
                                        ))}
                                        {/* Grand Total Row */}
                                        <TableRow className="bg-primary/10 hover:bg-primary/15 border-t-4 border-white sticky bottom-0 z-20 backdrop-blur-sm">
                                            <TableCell className="font-black text-primary pl-6 py-4 border-r border-primary/10 text-xs tracking-wider">GRAND TOTAL</TableCell>
                                            {pivotTable.cols.map(col => (
                                                <React.Fragment key={col}>
                                                    {metrics.map(m => (
                                                        <TableCell key={`${col}-${m}`} className="text-right font-black tabular-nums text-primary px-4 py-4 text-xs border-r border-primary/5 last:border-r-0">
                                                            {pivotTable.grandTotal[col] && pivotTable.grandTotal[col][m] ? formatMetricValue(pivotTable.grandTotal[col][m], m) : '-'}
                                                        </TableCell>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                            {metrics.map(m => {
                                                const totalValue = pivotTable.overallTotal[m] || 0;
                                                return (
                                                    <TableCell key={`grand-total-${m}`} className="text-right font-black text-primary border-l-2 border-primary/20 tabular-nums px-6 py-4 text-sm bg-primary/10">
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
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
