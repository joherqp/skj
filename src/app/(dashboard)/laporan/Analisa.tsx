'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  BarChart3,
  Table, 
  ArrowLeft, 
  LayoutDashboard, 
  Gift, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Download, 
  Calendar, 
  Search, 
  Filter, 
  RefreshCcw,
  FileDown,
  Clock,
  ArrowRight,
  Tag,
  Database
} from 'lucide-react';
import AnalisaVisual from '@/app/(dashboard)/laporan/components/AnalisaVisual';
import AnalisaPivot from '@/app/(dashboard)/laporan/components/AnalisaPivot';
import AnalisaRingkasan from '@/app/(dashboard)/laporan/components/AnalisaRingkasan';
import PromoAchievementReport from '@/app/(dashboard)/laporan/components/PromoAchievementReport';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { toast } from 'sonner';

export default function Analisa() {
  const router = useRouter();
  const { refresh, isRefreshing: isDbRefreshing } = useDatabase();
  const [activeTab, setActiveTab] = useState('ringkasan');
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const handleRefresh = async () => {
    setLocalRefreshing(true);
    try {
      await refresh();
      toast.success('Data synchronized successfully');
    } catch (error) {
      toast.error('Failed to sync data');
    } finally {
      setLocalRefreshing(false);
    }
  };

  const isRefreshing = localRefreshing || isDbRefreshing;
  
  return (
    <div className="relative min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      {/* Modern Background Ornaments */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/[0.04] via-blue-500/[0.02] to-transparent -z-10" />
      <div className="absolute -top-40 -right-40 w-[800px] h-[800px] bg-indigo-500/[0.06] rounded-full blur-[140px] -z-10 animate-pulse duration-[12000ms]" />
      <div className="absolute top-[20%] -left-60 w-[600px] h-[600px] bg-blue-500/[0.05] rounded-full blur-[120px] -z-10" />
      <div className="absolute top-[60%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px] -z-10" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] -z-10" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10 space-y-10 relative z-10">
        {/* Premium Header Section */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="flex items-start sm:items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => router.push('/laporan')} 
                  className="h-16 w-16 rounded-[1.5rem] bg-white/60 backdrop-blur-xl border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white hover:shadow-indigo-500/10 transition-all group shrink-0"
              >
                  <ArrowLeft className="w-7 h-7 text-slate-600 group-hover:text-indigo-600 transition-colors" />
              </Button>
            </motion.div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">
                  Analisa <span className="text-indigo-600">Pusat</span>
                </h1>
                <Badge variant="secondary" className="bg-indigo-600 text-white hover:bg-indigo-700 border-none font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 hidden sm:flex shadow-lg shadow-indigo-500/20">
                  V4.0 PRO
                </Badge>
              </div>
              <p className="text-slate-500 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
                Intelligence Engine untuk visualisasi data real-time dan pengambilan keputusan strategis.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative hidden md:block group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input 
                placeholder="Cari insight..." 
                className="w-[280px] h-12 pl-12 rounded-2xl bg-white/60 backdrop-blur-md border-slate-200/60 focus:bg-white focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-medium text-sm placeholder:text-slate-400"
              />
            </div>
            
            <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Latency</span>
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   1.2ms (Real-time)
                </span>
            </div>
            
            <div className="flex items-center gap-2 p-1.5 bg-white/60 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                className={cn("h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all", isRefreshing && "text-indigo-600")}
              >
                <RefreshCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Syncing...' : 'Sync Data'}
              </Button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 text-slate-600 hover:text-indigo-600"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </div>

            <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-800">
               <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
               </div>
               <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">System Live</span>
            </div>
          </div>
        </header>
        
        {/* Main Analysis Tabs */}
        <Tabs defaultValue="ringkasan" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-12">
          <div className="sticky top-6 z-50 flex justify-center px-4">
            <motion.div 
              layout
              className="bg-white/40 backdrop-blur-3xl p-1.5 rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.08)] w-full lg:w-auto overflow-hidden ring-1 ring-white/20"
            >
              <TabsList className="h-14 bg-transparent border-none p-0 flex w-full lg:w-auto gap-1">
                {[
                  { value: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard, color: 'indigo' },
                  { value: 'visual', label: 'Visual Grafik', icon: TrendingUp, color: 'blue' },
                  { value: 'pivot', label: 'Pivot Table', icon: Table, color: 'emerald' },
                  { value: 'promo', label: 'Capaian Promo', icon: Gift, color: 'amber' },
                ].map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="relative flex-1 lg:flex-none h-full rounded-[2rem] px-8 text-slate-500 font-black text-[11px] uppercase tracking-wider transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xl gap-3 group overflow-hidden"
                  >
                    <tab.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110 group-data-[state=active]:text-indigo-400")} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    
                    {/* Active Indicator Bar */}
                    <AnimatePresence>
                      {activeTab === tab.value && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute inset-0 bg-slate-900 -z-10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </AnimatePresence>
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>
          </div>
          
          <div className="relative min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="focus-visible:outline-none outline-none ring-0"
              >
                {activeTab === 'ringkasan' && <AnalisaRingkasan />}
                {activeTab === 'visual' && <AnalisaVisual />}
                {activeTab === 'pivot' && <AnalisaPivot />}
                {activeTab === 'promo' && <PromoAchievementReport />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>

        {/* Dynamic Footer Info */}
        <footer className="pt-16 pb-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-200/60 gap-8 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 group">
           <div className="flex flex-wrap justify-center items-center gap-10">
              <div className="flex items-center gap-3 group-hover:text-indigo-600 transition-colors">
                 <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors">
                    <Activity className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900">Engine: SKJ-Analyzers v4.2</span>
              </div>
              <div className="flex items-center gap-3 group-hover:text-emerald-600 transition-colors">
                 <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-emerald-50 transition-colors">
                    <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900">Intelligence: AI Insights Ready</span>
              </div>
              <div className="flex items-center gap-3 group-hover:text-blue-600 transition-colors">
                 <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
                    <RefreshCcw className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900">Auto-Sync Enabled</span>
              </div>
           </div>
           <p className="text-[10px] font-black text-slate-400 italic uppercase tracking-tighter bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              Data synchronized as of {new Date().toLocaleTimeString('id-ID')}
           </p>
        </footer>
      </div>
    </div>
  );
}

