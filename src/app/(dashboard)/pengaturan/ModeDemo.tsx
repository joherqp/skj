'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Building2, 
  GitBranch, 
  Users, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  Globe,
  User as UserIcon,
  Layers,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDatabase } from '@/contexts/DatabaseContext';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ModeDemo() {
  const router = useRouter();
  const { 
    profilPerusahaan, updateProfilPerusahaan, 
    cabang, updateCabang,
    users, updateUser,
    refresh, isAdminOrOwner,
    dbMode
  } = useDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('global');

  const toggleBranch = (id: string) => {
    setExpandedBranches(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  // Filtered lists
  const filteredCabang = useMemo(() => {
    return cabang.filter(c => 
      c.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.kota && c.kota.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [cabang, searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.posisi?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleGlobalToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const config = { ...profilPerusahaan.config, isDemo: checked };
      await updateProfilPerusahaan({ config });
      toast.success(`Mode Demo Global ${checked ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (error) {
      toast.error('Gagal memperbarui Mode Demo Global');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCabangToggle = async (id: string, checked: boolean) => {
    try {
      await updateCabang(id, { isDemo: checked });
      toast.success(`Mode Demo Cabang ${checked ? 'aktif' : 'nonaktif'}`);
    } catch (error) {
      toast.error('Gagal memperbarui Mode Demo Cabang');
    }
  };

  const handleUserToggle = async (id: string, checked: boolean) => {
    try {
      await updateUser(id, { isDemo: checked });
      toast.success(`Mode Demo User ${checked ? 'aktif' : 'nonaktif'}`);
    } catch (error) {
      toast.error('Gagal memperbarui Mode Demo User');
    }
  };

  const isGlobalDemo = profilPerusahaan.config?.isDemo || false;
  const demoBranchesCount = cabang.filter(c => c.isDemo).length;
  const demoUsersCount = users.filter(u => u.isDemo).length;

  if (!isAdminOrOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="p-4 rounded-full bg-destructive/10 animate-bounce">
          <AlertTriangle className="w-12 h-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Akses Ditolak</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Hanya Administrator yang dapat mengelola Mode Demo. 
            Silakan hubungi tim IT untuk bantuan lebih lanjut.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="rounded-full px-8">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-12">
      {/* --- HEADER SECTION --- */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Settings2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Management Mode Demo</h1>
                <p className="text-sm text-muted-foreground">Kendalikan visibilitas data simulasi per level</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => router.push('/pengaturan')} className="text-slate-500">
                Kembali
              </Button>
              <Button onClick={refresh} variant="outline" className="gap-2 bg-white dark:bg-slate-800 shadow-sm">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8 space-y-8">
        {/* --- SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-indigo-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
              <Globe className="w-24 h-24" />
            </div>
            <CardContent className="p-6">
              <p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-1">Global Status</p>
              <h3 className="text-2xl font-bold">{isGlobalDemo ? 'Demo Mode Active' : 'Live Data Mode'}</h3>
              <Badge className="mt-4 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                Master Control
              </Badge>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-md bg-teal-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
              <GitBranch className="w-24 h-24" />
            </div>
            <CardContent className="p-6">
              <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider mb-1">Branch Demo</p>
              <h3 className="text-2xl font-bold">{demoBranchesCount} Cabang</h3>
              <p className="text-teal-100 text-sm mt-1">Menggunakan data simulasi</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-rose-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-20 transform translate-x-4 -translate-y-4">
              <UserIcon className="w-24 h-24" />
            </div>
            <CardContent className="p-6">
              <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider mb-1">User Individual</p>
              <h3 className="text-2xl font-bold">{demoUsersCount} Pengguna</h3>
              <p className="text-rose-100 text-sm mt-1">Personalisasi mode demo</p>
            </CardContent>
          </Card>
        </div>

        {/* --- MAIN INTERFACE --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-[400px] bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="global" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Global</TabsTrigger>
              <TabsTrigger value="cabang" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Cabang</TabsTrigger>
              <TabsTrigger value="user" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">Perorangan</TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Cari..."
                className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* --- GLOBAL CONTENT --- */}
          <TabsContent value="global" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-none shadow-lg overflow-hidden">
              <div className={cn(
                "h-2 w-full",
                isGlobalDemo ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"
              )} />
              <CardHeader className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Saklar Utama Mode Demo</CardTitle>
                    <CardDescription className="text-base">
                      Aktifkan mode demo untuk seluruh pengguna sistem tanpa terkecuali.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "text-sm font-bold px-3 py-1 rounded-full",
                      isGlobalDemo ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {isGlobalDemo ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <Switch 
                      className="data-[state=checked]:bg-indigo-500 scale-125"
                      checked={isGlobalDemo} 
                      onCheckedChange={handleGlobalToggle}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-0">
                <div className={cn(
                  "p-6 rounded-2xl flex gap-4 transition-all",
                  isGlobalDemo ? "bg-indigo-50 border border-indigo-100 text-indigo-900" : "bg-slate-50 border border-slate-100 text-slate-600"
                )}>
                  <AlertTriangle className={cn("w-6 h-6 shrink-0", isGlobalDemo ? "text-indigo-600" : "text-slate-400")} />
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Informasi Penting:</p>
                    <p className="text-sm leading-relaxed">
                      {isGlobalDemo 
                        ? "Seluruh sistem saat ini berjalan di atas skema 'demo'. Data transaksi asli tidak akan muncul. Ini berguna untuk pelatihan atau presentasi produk."
                        : "Sistem berjalan normal menggunakan data asli. Anda tetap dapat mengaktifkan mode demo untuk cabang atau pengguna tertentu secara spesifik."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- CABANG CONTENT --- */}
          <TabsContent value="cabang" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all",
              isGlobalDemo && "opacity-50 grayscale pointer-events-none"
            )}>
              {filteredCabang.map((c) => (
                <Card key={c.id} className={cn(
                  "border-none shadow-md hover:shadow-xl transition-all group overflow-hidden",
                  c.isDemo ? "ring-2 ring-teal-500/50" : "bg-white dark:bg-slate-900"
                )}>
                  <div className={cn(
                    "p-5 flex flex-col h-full",
                    c.isDemo ? "bg-teal-50/50 dark:bg-teal-900/10" : ""
                  )}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-2xl shadow-sm transition-colors",
                        c.isDemo ? "bg-teal-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <Switch 
                        className="data-[state=checked]:bg-teal-500"
                        checked={c.isDemo || false} 
                        onCheckedChange={(checked) => handleCabangToggle(c.id, checked)}
                      />
                    </div>
                    
                    <div className="space-y-1 mb-6">
                      <h3 className="font-bold text-lg">{c.nama}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5" />
                        {c.kota || 'Nasional'}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex -space-x-2 overflow-hidden">
                        {users.filter(u => u.cabangId === c.id).slice(0, 3).map((u, i) => (
                          <div key={u.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                            {u.nama.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {users.filter(u => u.cabangId === c.id).length > 3 && (
                          <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            +{users.filter(u => u.cabangId === c.id).length - 3}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className={cn(
                        "font-medium",
                        c.isDemo ? "bg-teal-100 text-teal-700" : ""
                      )}>
                        {users.filter(u => u.cabangId === c.id).length} Users
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {isGlobalDemo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">Pengaturan Cabang terkunci karena Mode Demo Global sedang aktif.</p>
              </div>
            )}
          </TabsContent>

          {/* --- USER CONTENT --- */}
          <TabsContent value="user" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className={cn(
              "space-y-4",
              isGlobalDemo && "opacity-50 grayscale pointer-events-none"
            )}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const userBranch = cabang.find(c => c.id === u.cabangId);
                  const isInheritedDemo = userBranch?.isDemo || false;

                  return (
                    <Card key={u.id} className={cn(
                      "border-none shadow-sm transition-all overflow-hidden",
                      u.isDemo ? "bg-rose-50/50 dark:bg-rose-900/10 ring-1 ring-rose-200/50" : "bg-white dark:bg-slate-900"
                    )}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm",
                          u.isDemo ? "bg-rose-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        )}>
                          {u.nama.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate">{u.nama}</h4>
                          <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {userBranch?.nama || 'Pusat'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Switch 
                            className="data-[state=checked]:bg-rose-500"
                            checked={u.isDemo || false} 
                            onCheckedChange={(checked) => handleUserToggle(u.id, checked)}
                            disabled={isInheritedDemo}
                          />
                          {isInheritedDemo && (
                            <Badge variant="outline" className="text-[8px] h-4 bg-teal-50 text-teal-700 border-teal-200">
                              Inherited
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            {isGlobalDemo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">Pengaturan User terkunci karena Mode Demo Global sedang aktif.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
