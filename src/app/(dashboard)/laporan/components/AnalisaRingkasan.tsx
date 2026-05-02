'use client';
import { useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  User as UserIcon, 
  Target, 
  Award, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalisaRingkasan() {
  const { penjualan, pelanggan, users, barang, kategoriPelanggan, targets } = useDatabase();
  const { user: currentUser } = useAuth();

  const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));

  // Current Month Data
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const filteredPenjualan = penjualan.filter(p => {
      if (p.status === 'batal') return false;
      if (!isAdminOrOwner && p.cabangId !== currentUser?.cabangId) return false;
      return true;
    });

    const thisMonthSales = filteredPenjualan.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonthSales = filteredPenjualan.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const totalOmzet = thisMonthSales.reduce((acc, p) => acc + p.total, 0);
    const lastOmzet = lastMonthSales.reduce((acc, p) => acc + p.total, 0);
    
    const growth = lastOmzet === 0 ? 100 : ((totalOmzet - lastOmzet) / lastOmzet) * 100;

    // Top Products
    const prodMap = new Map<string, number>();
    thisMonthSales.forEach(p => {
      p.items.forEach(item => {
        const name = barang.find(b => b.id === item.barangId)?.nama || 'Unknown';
        prodMap.set(name, (prodMap.get(name) || 0) + (item.jumlah * (item.konversi || 1)));
      });
    });
    const topProducts = Array.from(prodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top Sales
    const salesMap = new Map<string, number>();
    thisMonthSales.forEach(p => {
      const name = users.find(u => u.id === p.salesId)?.nama || 'Unknown';
      salesMap.set(name, (salesMap.get(name) || 0) + p.total);
    });
    const topSales = Array.from(salesMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Customer Distribution (by Kategori Pelanggan)
    const custDistMap = new Map<string, number>();
    pelanggan.forEach(p => {
        const cat = kategoriPelanggan.find(c => c.id === p.kategoriId)?.nama || 'Lainnya';
        custDistMap.set(cat, (custDistMap.get(cat) || 0) + 1);
    });
    const customerDist = Array.from(custDistMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Target Achievement (simplified)
    const totalTarget = targets
      .filter(t => {
          if (!isAdminOrOwner && t.cabangId !== currentUser?.cabangId) return false;
          return true; 
      })
      .reduce((acc, t) => acc + (t.targetAmount || 0), 0);

    return {
      totalOmzet,
      totalTrx: thisMonthSales.length,
      growth,
      topProducts,
      topSales,
      customerDist,
      targetAchievement: totalTarget > 0 ? (totalOmzet / totalTarget) * 100 : 0,
      totalTarget
    };
  }, [penjualan, pelanggan, users, barang, kategoriPelanggan, targets, currentUser, isAdminOrOwner]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      {/* Hero KPI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        <Card className="lg:col-span-2 relative overflow-hidden border-none shadow-2xl bg-slate-900 text-white rounded-[2.5rem] group">
          <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
            <Sparkles className="w-32 h-32 text-indigo-400" />
          </div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />
          
          <CardHeader className="pb-4 relative z-10 pt-8 px-8">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
                <div className="w-8 h-[1px] bg-indigo-400/50" />
                <TrendingUp className="w-4 h-4" /> 
                Monthly Performance
            </div>
            <CardTitle className="text-5xl md:text-6xl font-black mt-2 tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                {formatRupiah(stats.totalOmzet)}
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium text-sm mt-4">
                Total pendapatan yang tercatat pada periode berjalan bulan ini.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-10 relative z-10">
            <div className="flex items-center gap-4 mt-2">
               <div className={`px-4 py-1.5 rounded-2xl flex items-center gap-2 font-black text-xs ${stats.growth >= 0 ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'}`}>
                    {stats.growth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(stats.growth).toFixed(1)}% Growth
               </div>
               <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">v. Last Month</span>
            </div>
            
            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                <div className="space-y-2">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3 text-indigo-400" /> Transactions
                    </p>
                    <p className="text-2xl font-black tracking-tight">{stats.totalTrx.toLocaleString()} <span className="text-sm font-bold text-slate-500">Items</span></p>
                </div>
                <div className="space-y-2">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest flex items-center gap-2">
                        <Users className="w-3 h-3 text-indigo-400" /> Market Reach
                    </p>
                    <p className="text-2xl font-black tracking-tight">{pelanggan.length.toLocaleString()} <span className="text-sm font-bold text-slate-500">Outlets</span></p>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Target Achievement Gauge */}
        <Card className="relative overflow-hidden border-none shadow-xl bg-white rounded-[2.5rem] group transition-all hover:shadow-2xl">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-white -z-10" />
           <CardHeader className="pb-4 pt-8 px-8">
             <CardDescription className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-between">
                Goal Progression
                <Target className="w-4 h-4 text-indigo-500" />
             </CardDescription>
           </CardHeader>
           <CardContent className="flex flex-col items-center pt-2 pb-10 px-8">
              <div className="relative w-44 h-44 mb-8">
                {/* Background Shadow Circle */}
                <div className="absolute inset-0 rounded-full border-[12px] border-slate-50 shadow-inner" />
                <svg className="w-full h-full transform -rotate-90 relative z-10">
                    <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100/50" />
                    <circle 
                        cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="12" fill="transparent" 
                        strokeDasharray={477} 
                        strokeDashoffset={477 - (477 * Math.min(stats.targetAchievement, 100)) / 100} 
                        strokeLinecap="round"
                        className="text-indigo-600 transition-all duration-[2000ms] ease-in-out drop-shadow-[0_0_8px_rgba(79,70,229,0.4)]" 
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{stats.targetAchievement.toFixed(0)}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Reached</span>
                </div>
              </div>
              <div className="text-center bg-slate-50 w-full py-4 rounded-3xl border border-slate-100">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Gap to Target</p>
                  <p className="text-lg font-black text-indigo-600 tracking-tight">
                    {formatRupiah(Math.max(0, stats.totalTarget - stats.totalOmzet))}
                  </p>
              </div>
           </CardContent>
        </Card>

        {/* Growth Momentum Card */}
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-[2.5rem] group">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
                <Award className="w-24 h-24" />
            </div>
            <CardHeader className="pt-8 px-8">
                <CardDescription className="text-emerald-200/60 text-[10px] font-black uppercase tracking-[0.2em]">Strategy Insight</CardDescription>
                <CardTitle className="text-3xl font-black mt-2 tracking-tight">Market Leader</CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-10">
                <p className="text-emerald-50/80 text-sm font-medium leading-relaxed">
                    Momentum pertumbuhan Anda melampaui rata-rata kuartal sebelumnya. Pertahankan fokus pada retensi pelanggan retail.
                </p>
                <div className="mt-10 flex items-center justify-between bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 group-hover:bg-white/20 transition-all">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200/70">Dominant Sector</p>
                        <p className="text-sm font-black">Modern Retail Pack</p>
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/30 flex items-center justify-center">
                        <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Top Products Bar Chart */}
        <Card className="xl:col-span-2 border-none shadow-xl overflow-hidden bg-white rounded-[2.5rem]">
          <CardHeader className="border-b border-slate-50 pb-8 pt-8 px-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                  <Package className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-xl font-black tracking-tight text-slate-900">Best Sellers</CardTitle>
                  <CardDescription className="text-xs font-medium text-slate-500">Volume unit tertinggi bulan ini</CardDescription>
                </div>
            </div>
            <Badge className="bg-slate-900 text-white border-none rounded-xl px-4 py-1.5 font-black text-[10px] tracking-widest uppercase shadow-lg shadow-slate-200">
                Quarter Focus
            </Badge>
          </CardHeader>
          <CardContent className="p-8 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 60, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={140} 
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <Tooltip 
                    cursor={{ fill: '#f8fafc', opacity: 1 }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '13px', color: '#1e293b' }}
                    labelStyle={{ fontWeight: 600, fontSize: '11px', color: '#64748b', marginBottom: '4px' }}
                />
                <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 12, 12, 0]} barSize={32} animationDuration={2000} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Distribution Pie Chart */}
        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem]">
          <CardHeader className="border-b border-slate-50 pb-8 pt-8 px-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black tracking-tight text-slate-900">Market Segments</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">Basis demografi outlet aktif</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[420px] p-8 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.customerDist}
                  cx="50%"
                  cy="45%"
                  innerRadius={90}
                  outerRadius={125}
                  paddingAngle={10}
                  dataKey="value"
                  animationDuration={2000}
                  stroke="none"
                >
                  {stats.customerDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={40} 
                    wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b', paddingTop: '24px' }} 
                    iconType="circle"
                    iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Sales Detailed Board */}
        <Card className="xl:col-span-3 border-none shadow-xl bg-white overflow-hidden rounded-[2.5rem]">
          <CardHeader className="border-b border-slate-50 pb-8 pt-8 px-8 flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-xl font-black tracking-tight text-slate-900">Top Performance Sales</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">Pahlawan omzet bulan ini</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                Elite Squad
            </div>
          </CardHeader>
          <CardContent className="p-8 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topSales} margin={{ top: 20, right: 30, left: 40, bottom: 10 }}>
                <defs>
                   <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#10b981" />
                     <stop offset="100%" stopColor="#34d399" />
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                    dy={12}
                />
                <YAxis hide />
                <Tooltip 
                    formatter={(val: number) => formatRupiah(val)}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                    itemStyle={{ fontWeight: 900, fontSize: '13px' }}
                />
                <Bar dataKey="value" fill="url(#salesGradient)" radius={[12, 12, 12, 12]} barSize={80} animationDuration={2500} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

