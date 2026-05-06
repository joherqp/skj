'use client';
import { useState, useMemo } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Search, Gift, Info, Calendar, User, Package, Trophy, Star, ChevronRight, TrendingUp, Sparkles, Target, Zap, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion, AnimatePresence } from 'framer-motion';

export default function PromoAchievementReport() {
  const { user: currentUser } = useAuth();
  const { promo, penjualan, pelanggan } = useDatabase();
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
  const isBranchStaff = currentUser?.roles.some(r => ['leader', 'manager', 'finance'].includes(r));

  // Filter only Event type promos
  const eventPromos = useMemo(() => {
    return promo
      .filter(p => p.tipe === 'event' && p.isActive !== false)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [promo]);

  // Selected promo details
  const selectedPromo = useMemo(() => {
    return eventPromos.find(p => p.id === selectedPromoId);
  }, [eventPromos, selectedPromoId]);

  // Calculate achievements for all customers for the selected promo
  const achievements = useMemo(() => {
    if (!selectedPromo || !currentUser) return [];

    const startDate = new Date(selectedPromo.tanggalMulai);
    const endDate = selectedPromo.tanggalBerakhir ? new Date(selectedPromo.tanggalBerakhir) : new Date();
    const targetProducts = selectedPromo.targetProdukIds || [];
    const minQty = selectedPromo.minQty || 0;
    const bonusStep = selectedPromo.syarat_jumlah || 0;
    const bonusValue = selectedPromo.nilai || 0;

    // Map to store aggregated data per customer
    const customerStats = new Map<string, {
      totalQty: number;
      earnedRewards: number; 
      earnedBonus: number;
      lastTransaction: Date | null;
    }>();

    // Iterate through all sales
    penjualan.forEach(p => {
      const saleDate = new Date(p.tanggal);
      
      let hasAccess = false;
      if (isAdminOrOwner) {
        hasAccess = true;
      } else if (isBranchStaff) {
        hasAccess = p.cabangId === currentUser.cabangId;
      } else {
        hasAccess = (p.salesId || p.createdBy) === currentUser.id;
      }
      
      if (!hasAccess) return;

      const isPaid = p.status === 'lunas' || p.isLunas === true;
      if (saleDate >= startDate && saleDate <= endDate && isPaid) {
        p.items.forEach(item => {
          if (targetProducts.includes(item.barangId)) {
            const stats = customerStats.get(p.pelangganId) || { totalQty: 0, earnedRewards: 0, earnedBonus: 0, lastTransaction: null };
            
            stats.totalQty += (item.jumlah * (item.konversi || 1));
            
            if (item.promoId === selectedPromo.id) {
              if (item.earnedReward && item.earnedReward.qty > 0) {
                stats.earnedRewards += item.earnedReward.qty;
              }
              if (item.diskon) {
                stats.earnedBonus += item.diskon;
              }
            }

            if (!stats.lastTransaction || saleDate > stats.lastTransaction) {
              stats.lastTransaction = saleDate;
            }

            customerStats.set(p.pelangganId, stats);
          }
        });
      }
    });

    return Array.from(customerStats.entries())
      .map(([pelangganId, stats]) => {
        const pDetail = pelanggan.find(p => p.id === pelangganId);
        
        const totalPotentialRewards = minQty > 0 ? Math.floor(stats.totalQty / minQty) : 0;
        const progressToNext = minQty > 0 ? (stats.totalQty % minQty) / minQty * 100 : 0;
        const remainingForNext = minQty > 0 ? minQty - (stats.totalQty % minQty) : 0;
        const totalPotentialBonus = (bonusStep > 0 && bonusValue > 0) ? Math.floor(stats.totalQty / bonusStep) * bonusValue : 0;
        
        return {
          pelangganId,
          nama: pDetail?.nama || 'Pelanggan Terhapus',
          kode: pDetail?.kode || '-',
          totalQty: stats.totalQty,
          earnedRewards: stats.earnedRewards, 
          potentialRewards: totalPotentialRewards,
          earnedBonus: stats.earnedBonus,
          potentialBonus: totalPotentialBonus,
          progress: progressToNext,
          remainingForNext: remainingForNext,
          lastTransaction: stats.lastTransaction
        };
      })
      .filter(a => 
        a.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.kode.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [selectedPromo, penjualan, pelanggan, searchQuery, currentUser, isAdminOrOwner, isBranchStaff]);

  return (
    <div className="space-y-10 pb-20 relative">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full w-fit border border-amber-100 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">Campaign Analysis</span>
            </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Achievement Tracking</h2>
          <p className="text-slate-500 font-medium max-w-2xl">Monitor akumulasi poin dan progres hadiah event secara real-time dengan transparansi penuh untuk setiap pelanggan.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Selector & Info Card */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4"
        >
            <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-200 rounded-[2.5rem] sticky top-24">
            <div className="bg-slate-900 p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                <CardTitle className="text-lg font-black flex items-center gap-3 uppercase tracking-wider">
                <div className="p-2 bg-amber-500/20 rounded-xl ring-1 ring-amber-500/30">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                </div>
                Event Config
                </CardTitle>
                <p className="text-slate-400 text-xs mt-2 font-medium">Pilih campaign aktif untuk dianalisa</p>
            </div>
            <CardContent className="p-8 space-y-8">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Pilih Campaign</label>
                    <Select value={selectedPromoId} onValueChange={setSelectedPromoId}>
                    <SelectTrigger className="h-14 bg-slate-50/50 border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-amber-500/20 transition-all">
                        <SelectValue placeholder="Cari event aktif..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-2xl p-2">
                        {eventPromos.map(p => (
                        <SelectItem key={p.id} value={p.id} className="rounded-xl p-3 font-bold">{p.nama}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>

                <AnimatePresence mode="wait">
                    {selectedPromo ? (
                    <motion.div 
                        key={selectedPromo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 pt-6 border-t border-slate-100"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 group hover:bg-blue-50 transition-colors">
                                <Calendar className="h-4 w-4 text-blue-600 mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Mulai</p>
                                <p className="text-xs font-black text-slate-800">
                                    {format(new Date(selectedPromo.tanggalMulai), 'dd MMM yyyy', { locale: id })}
                                </p>
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 group hover:bg-indigo-50 transition-colors">
                                <Target className="h-4 w-4 text-indigo-600 mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Min. Qty</p>
                                <p className="text-xs font-black text-slate-800">{selectedPromo.minQty} Unit</p>
                            </div>
                        </div>

                        <div className="p-6 bg-amber-50/50 rounded-3xl border border-amber-100/50 relative overflow-hidden group hover:bg-amber-50 transition-colors">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-200">
                                    <Trophy className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">Hadiah Utama</span>
                            </div>
                            <p className="text-xl font-black text-slate-900 leading-tight">{selectedPromo.hadiah}</p>
                        </div>

                        {selectedPromo.snk && (
                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200/50">
                            <div className="flex items-center gap-2 mb-2.5 text-slate-500">
                                <Info className="w-4 h-4 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Ketentuan & Syarat</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{selectedPromo.snk}</p>
                        </div>
                        )}
                    </motion.div>
                    ) : (
                        <div className="py-12 text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 ring-4 ring-slate-50/50">
                                <Gift className="w-8 h-8" />
                            </div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-loose">Silahkan pilih campaign <br/> untuk melihat detail</p>
                        </div>
                    )}
                </AnimatePresence>
            </CardContent>
            </Card>
        </motion.div>

        {/* Results Card */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8"
        >
            <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white rounded-[2.5rem]">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 border-b border-slate-100">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 rounded-full bg-blue-500" />
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Capaian Pelanggan</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium text-slate-400 px-4">Monitoring progres akumulasi unit setiap toko</CardDescription>
                </div>
                <div className="relative w-full sm:max-w-[320px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Cari nama atau kode toko..."
                    className="pl-12 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-blue-500/20 transition-all h-12 text-sm font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {!selectedPromoId ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-[2rem] flex items-center justify-center mb-8 rotate-12 ring-8 ring-indigo-50/50">
                        <TrendingUp className="h-12 w-12" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Pilih Campaign untuk Memulai</p>
                </div>
                ) : achievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8 -rotate-12 ring-8 ring-slate-50/50">
                        <Search className="h-12 w-12" />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">Data Tidak Ditemukan</p>
                </div>
                ) : (
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-6 px-8">Pelanggan</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Unit</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[250px]">Progres Target</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Reward</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8">Kalkulasi Bonus</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {achievements.map((item, idx) => (
                            <motion.tr 
                                key={item.pelangganId} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="hover:bg-slate-50/80 transition-all border-slate-50 group cursor-default"
                            >
                                <TableCell className="py-6 px-8">
                                <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-base">{item.nama}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{item.kode}</div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="font-black text-slate-900 text-lg">{item.totalQty.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Unit</div>
                                </TableCell>
                                <TableCell>
                                <div className="space-y-2 pr-8">
                                    <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {item.totalQty % (selectedPromo?.minQty || 1)} <span className="text-slate-400">/ {selectedPromo?.minQty}</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <Zap className={`w-3 h-3 ${item.remainingForNext > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${item.remainingForNext > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {item.remainingForNext > 0 ? `${item.remainingForNext} Unit Lagi` : 'Target Achieved'}
                                        </span>
                                    </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className={`h-full rounded-full ${item.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}
                                        />
                                    </div>
                                </div>
                                </TableCell>
                                <TableCell className="text-center">
                                <Badge 
                                    className={`rounded-2xl px-4 py-1.5 text-[10px] font-black border-none shadow-xl tracking-wider uppercase ${
                                        item.potentialRewards > 0 
                                        ? "bg-slate-900 text-white shadow-slate-900/20" 
                                        : "bg-slate-100 text-slate-400 shadow-none"
                                    }`}
                                >
                                    {item.potentialRewards} {selectedPromo?.hadiah || 'Reward'}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                <div className="flex items-center justify-end gap-3">
                                        <div className="text-right">
                                            <div className={`font-black text-base ${item.potentialBonus > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                Rp {item.potentialBonus.toLocaleString()}
                                            </div>
                                            {item.potentialBonus > 0 && <div className="text-[9px] font-bold text-emerald-500 uppercase">Estimasi Bonus</div>}
                                        </div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <button className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-2xl hover:bg-slate-900 hover:text-white transition-all group-hover:scale-110 active:scale-95">
                                                <ArrowUpRight className="h-4 w-4" />
                                            </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-0 border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2rem] overflow-hidden" align="end">
                                                <div className="bg-slate-900 p-6 text-white">
                                                    <h4 className="font-black text-base flex items-center gap-3 uppercase tracking-wider">
                                                        <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                                            <Package className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        Achievement
                                                    </h4>
                                                </div>
                                                <div className="p-8 bg-white space-y-6">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akumulasi</p>
                                                            <p className="text-lg font-black text-slate-900">{item.totalQty} <span className="text-xs font-bold text-slate-400">UNIT</span></p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terakhir</p>
                                                            <p className="text-xs font-black text-slate-700">
                                                                {item.lastTransaction ? format(item.lastTransaction, 'dd/MM/yy HH:mm') : '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                                        <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100/30">
                                                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Reward:</span>
                                                            <span className="text-sm font-black text-blue-900">{item.potentialRewards} {selectedPromo?.hadiah}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/30">
                                                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Bonus:</span>
                                                            <span className="text-sm font-black text-emerald-900">Rp {item.potentialBonus.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-slate-400 font-bold italic leading-relaxed uppercase tracking-tighter">
                                                            Data dihitung otomatis berdasarkan akumulasi nota yang sudah berstatus LUNAS
                                                        </p>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                </div>
                                </TableCell>
                            </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                    </Table>
                </div>
                )}
            </CardContent>
            </Card>
        </motion.div>
      </div>
    </div>
  );
}
