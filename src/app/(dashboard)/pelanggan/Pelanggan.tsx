'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Search, Plus, Users, MapPin, Phone, Filter, ArrowLeftRight, UserCheck, Store, Building, ChevronDown, MessageCircle, Share2, AlertCircle, Trash2, ArrowUpDown } from 'lucide-react';
import { formatRupiah, formatCompactRupiah, formatWhatsAppNumber } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';


export default function Pelanggan() {
  const { user } = useAuth();
  const { pelanggan, users, kategoriPelanggan, profilPerusahaan, viewMode, setViewMode, kunjungan, penjualan, cabang: listCabang, mergePelanggan } = useDatabase();
  const [search, setSearch] = useState('');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [selectedCabangIds, setSelectedCabangIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Filters
  const [filterKategori, setFilterKategori] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showVisitsDialog, setShowVisitsDialog] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<any>(null);
  const [mergeSource, setMergeSource] = useState<any>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [filterDuplicateOnly, setFilterDuplicateOnly] = useState(false);
  const [searchMerge, setSearchMerge] = useState('');
  const [searchTarget, setSearchTarget] = useState('');
  const [sortBy, setSortBy] = useState<'nama' | 'kode' | 'hutang' | 'terbaru' | 'penjualan'>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const salesAchievementMap = useMemo(() => {
    const map = new Map<string, number>();
    penjualan.forEach(p => {
      if (p.status !== 'batal') {
        const current = map.get(p.pelangganId) || 0;
        map.set(p.pelangganId, current + (p.total || 0));
      }
    });
    return map;
  }, [penjualan]);

  const router = useRouter();

  const handleShare = async (p: any) => {
    const text = `👤 *DATA PELANGGAN*
━━━━━━━━━━━━━━━━━━
📌 Nama: ${p.nama}
🔑 Kode: ${p.kode}
📍 Alamat: ${p.alamat}
📞 Telp: ${p.telepon}
━━━━━━━━━━━━━━━━━━
${profilPerusahaan?.nama || ''}`;

    // If customer has phone, send directly to WA
    if (p.telepon && p.telepon !== '-') {
      const waUrl = `https://wa.me/${formatWhatsAppNumber(p.telepon)}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      toast.success('Membuka WhatsApp...');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Data Pelanggan: ${p.nama}`,
          text: text,
          url: window.location.origin + `/pelanggan/${p.id}`
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error('Gagal membagikan data');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success('Data pelanggan disalin ke clipboard');
      } catch (err) {
        toast.error('Gagal menyalin data');
      }
    }
  };

  const activeFiltersCount = (filterKategori.length > 0 ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (selectedCabangIds.length > 0 ? 1 : 0) + (selectedUserIds.length > 0 ? 1 : 0);

  const isAdminOrOwner = user?.roles.includes('admin') || user?.roles.includes('owner');
  const isLeader = user?.roles.includes('leader');

  const today = new Date();
  const todayStr = today.toDateString();

  const uniqueTodayVisits = useMemo(() => {
    // 1. Get unique customers from explicit visits
    const visitedCustomerIds = kunjungan.filter(k => {
      // Filter by date
      if (new Date(k.tanggal).toDateString() !== todayStr) return false;

      // Filter by scope
      if (viewMode === 'me') {
        if (k.userId !== user?.id) return false;
      } else {
        if (isAdminOrOwner) {
          if (selectedCabangIds.length > 0) {
            const kUser = users.find(u => u.id === k.userId);
            if (!kUser?.cabangId || !selectedCabangIds.includes(kUser.cabangId)) return false;
          }
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(k.userId)) return false;
        } else if (isLeader) {
          const kUser = users.find(u => u.id === k.userId);
          if (kUser?.cabangId !== user?.cabangId) return false;
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(k.userId)) return false;
        } else {
          if (k.userId !== user?.id) return false;
        }
      }
      return true;
    }).map(k => k.pelangganId);

    // 2. Get unique customers from sales
    const soldCustomerIds = penjualan.filter(p => {
      // Filter by date
      if (new Date(p.tanggal).toDateString() !== todayStr) return false;
      if (p.status === 'batal' || p.status === 'draft') return false;

      // Filter by scope
      if (viewMode === 'me') {
        if (p.salesId !== user?.id) return false;
      } else {
        if (isAdminOrOwner) {
          if (selectedCabangIds.length > 0) {
            const pUser = users.find(u => u.id === p.salesId);
            if (!pUser?.cabangId || !selectedCabangIds.includes(pUser.cabangId)) return false;
          }
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(p.salesId)) return false;
        } else if (isLeader) {
          const pUser = users.find(u => u.id === p.salesId);
          if (pUser?.cabangId !== user?.cabangId) return false;
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(p.salesId)) return false;
        } else {
          if (p.salesId !== user?.id) return false;
        }
      }
      return true;
    }).map(p => p.pelangganId);

    // 3. Combine and unique
    return Array.from(new Set([...visitedCustomerIds, ...soldCustomerIds]));
  }, [kunjungan, penjualan, todayStr, viewMode, user, selectedCabangIds, selectedUserIds, isAdminOrOwner, isLeader, users]);

  // Duplicate Detection
  const duplicates = useMemo(() => {
    const groups: Record<string, string[]> = {};
    
    pelanggan.forEach(p => {
      // Normalize name: lowercase, trim, remove non-alphanumeric
      const nameKey = `name:${p.nama.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      // Normalize phone: digits only, remove leading 0/62
      const phoneRaw = p.telepon?.replace(/\D/g, '') || '';
      const phoneKey = phoneRaw ? `phone:${phoneRaw.slice(-10)}` : null;

      if (!groups[nameKey]) groups[nameKey] = [];
      groups[nameKey].push(p.id);

      if (phoneKey) {
        if (!groups[phoneKey]) groups[phoneKey] = [];
        groups[phoneKey].push(p.id);
      }
    });

    // Only keep groups with > 1 unique member
    const duplicateIds = new Set<string>();
    const duplicateMap: Record<string, string[]> = {};

    Object.values(groups).forEach(ids => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length > 1) {
        uniqueIds.forEach(id => {
          duplicateIds.add(id);
          if (!duplicateMap[id]) duplicateMap[id] = [];
          // Add other IDs in the same group as duplicates of this ID
          uniqueIds.forEach(otherId => {
            if (otherId !== id && !duplicateMap[id].includes(otherId)) {
              duplicateMap[id].push(otherId);
            }
          });
        });
      }
    });

    return { ids: duplicateIds, map: duplicateMap };
  }, [pelanggan]);

  const filteredPelanggan = useMemo(() => {
    const result = pelanggan.filter(p => {
      // 1. Scope Constraint
      if (viewMode === 'me') {
        if (p.salesId !== user?.id) return false;
      } else {
        if (isAdminOrOwner) {
          if (selectedCabangIds.length > 0 && (!p.cabangId || !selectedCabangIds.includes(p.cabangId))) return false;
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(p.salesId)) return false;
        } else if (p.cabangId !== user?.cabangId) {
          return false; // Branch isolation
        } else if (isLeader) {
          if (selectedUserIds.length > 0 && !selectedUserIds.includes(p.salesId)) return false;
        } else if (p.salesId !== user?.id) {
          return false;
        }
      }

      // 2. Search Constraint
      const matchesSearch = p.nama.toLowerCase().includes(search.toLowerCase()) ||
             p.kode.toLowerCase().includes(search.toLowerCase()) ||
             p.alamat.toLowerCase().includes(search.toLowerCase());

      // 3. Category Filter
      const matchesCategory = filterKategori.length === 0 || filterKategori.includes(p.kategoriId);

      // 4. Status Filter
      const matchesStatus = filterStatus === 'all' 
          ? true 
          : filterStatus === 'active' ? p.isActive 
          : !p.isActive;

      // 5. Duplicate Filter
      const matchesDuplicate = !filterDuplicateOnly || duplicates.ids.has(p.id);

      return matchesSearch && matchesCategory && matchesStatus && matchesDuplicate;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'nama') comparison = a.nama.localeCompare(b.nama);
      else if (sortBy === 'kode') comparison = a.kode.localeCompare(b.kode);
      else if (sortBy === 'hutang') comparison = (a.sisaKredit || 0) - (b.sisaKredit || 0);
      else if (sortBy === 'terbaru') comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      else if (sortBy === 'penjualan') comparison = (salesAchievementMap.get(a.id) || 0) - (salesAchievementMap.get(b.id) || 0);

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [pelanggan, search, filterKategori, filterStatus, filterDuplicateOnly, viewMode, user, isAdminOrOwner, isLeader, selectedCabangIds, selectedUserIds, duplicates, sortBy, sortOrder, salesAchievementMap]);

  const handleMerge = async () => {
    if (!mergeTarget || !mergeSource) return;
    
    setIsMerging(true);
    try {
      await mergePelanggan(mergeTarget.id, mergeSource.id);
      toast.success(`Berhasil menyatukan data ${mergeSource.nama} ke ${mergeTarget.nama}`);
      setShowMergeDialog(false);
      setMergeTarget(null);
      setMergeSource(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyatukan data');
    } finally {
      setIsMerging(false);
    }
  };

  // Infinite scroll observer


  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {isAdminOrOwner && (
            <Button 
              variant="outline" 
              size="icon" 
              className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700"
              onClick={() => {
                setMergeTarget(null);
                setMergeSource(null);
                setSearchTarget('');
                setSearchMerge('');
                setShowMergeDialog(true);
              }}
              title="Satukan Data Pelanggan"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className={sortBy !== 'nama' || sortOrder !== 'asc' ? "border-primary text-primary" : ""}>
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Urutkan Berdasarkan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setSortBy('nama'); setSortOrder(sortOrder === 'asc' && sortBy === 'nama' ? 'desc' : 'asc'); }}>
                Nama {sortBy === 'nama' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('kode'); setSortOrder(sortOrder === 'asc' && sortBy === 'kode' ? 'desc' : 'asc'); }}>
                Kode {sortBy === 'kode' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { 
                const isCurrent = sortBy === 'hutang';
                setSortBy('hutang'); 
                setSortOrder(isCurrent ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'); 
              }}>
                Total Hutang {sortBy === 'hutang' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { 
                const isCurrent = sortBy === 'terbaru';
                setSortBy('terbaru'); 
                setSortOrder(isCurrent ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'); 
              }}>
                Terbaru {sortBy === 'terbaru' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { 
                const isCurrent = sortBy === 'penjualan';
                setSortBy('penjualan'); 
                setSortOrder(isCurrent ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'); 
              }}>
                Capaian Penjualan {sortBy === 'penjualan' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className={activeFiltersCount > 0 ? "border-primary text-primary relative" : ""}>
                    <Filter className="w-4 h-4" />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium leading-none">Filter Pelanggan</h4>
                            {(filterKategori.length > 0 || filterStatus !== 'all' || selectedCabangIds.length > 0 || selectedUserIds.length > 0) && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-auto p-0 text-destructive text-xs" 
                                    onClick={() => { 
                                      setFilterKategori([]); 
                                      setFilterStatus('all'); 
                                      setSelectedCabangIds([]);
                                      setSelectedUserIds([]);
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>

                        {/* Duplicate Filter */}
                        <div className="flex items-center justify-between py-2 border-b">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Hanya Duplikat</Label>
                            <p className="text-[10px] text-muted-foreground">Tampilkan pelanggan yang kemungkinan duplikat</p>
                          </div>
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={filterDuplicateOnly}
                            onChange={(e) => setFilterDuplicateOnly(e.target.checked)}
                          />
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-3">
                            <Label>Status</Label>
                            <Select value={filterStatus} onValueChange={(val: 'all' | 'active' | 'inactive') => setFilterStatus(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="inactive">Non-Aktif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category Filter */}
                        <div className="space-y-3">
                            <Label>Kategori</Label>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {[...kategoriPelanggan].sort((a, b) => a.nama.localeCompare(b.nama)).map(cat => (
                                    <div key={cat.id} className="flex items-center space-x-2">
                                        <input 
                                            type="checkbox" 
                                            id={`cat-${cat.id}`}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={filterKategori.includes(cat.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setFilterKategori([...filterKategori, cat.id]);
                                                else setFilterKategori(filterKategori.filter(id => id !== cat.id));
                                            }}
                                        />
                                        <label htmlFor={`cat-${cat.id}`} className="text-sm leading-none cursor-pointer">
                                            {cat.nama}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Branch Filter (Admin/Owner only) */}
                        {isAdminOrOwner && viewMode === 'all' && (
                          <div className="space-y-3">
                              <Label>Cabang</Label>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="w-full h-9 text-xs justify-between bg-background font-normal px-3">
                                          <div className="flex items-center gap-2 truncate">
                                              <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                              <span className="truncate">
                                                  {selectedCabangIds.length === 0
                                                      ? "Semua Cabang"
                                                      : `${selectedCabangIds.length} Cabang`}
                                              </span>
                                          </div>
                                          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto">
                                      <DropdownMenuLabel>Pilih Cabang</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuCheckboxItem
                                          checked={selectedCabangIds.length === 0}
                                          onCheckedChange={() => setSelectedCabangIds([])}
                                      >
                                          Semua Cabang
                                      </DropdownMenuCheckboxItem>
                                      <DropdownMenuSeparator />
                                      {[...listCabang].sort((a, b) => a.nama.localeCompare(b.nama)).map(c => (
                                          <DropdownMenuCheckboxItem
                                              key={c.id}
                                              checked={selectedCabangIds.includes(c.id)}
                                              onCheckedChange={(checked) => {
                                                  if (checked) {
                                                      setSelectedCabangIds([...selectedCabangIds, c.id]);
                                                  } else {
                                                      setSelectedCabangIds(selectedCabangIds.filter(id => id !== c.id));
                                                  }
                                              }}
                                          >
                                              {c.nama}
                                          </DropdownMenuCheckboxItem>
                                      ))}
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        )}

                        {/* Sales Filter (Only if in Team Mode) */}
                        {(isAdminOrOwner || isLeader) && viewMode === 'all' && (
                          <div className="space-y-3">
                              <Label>Salesperson</Label>
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="w-full h-9 text-xs justify-between bg-background font-normal px-3">
                                          <div className="flex items-center gap-2 truncate">
                                              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                              <span className="truncate">
                                                  {selectedUserIds.length === 0
                                                      ? "Semua Sales"
                                                      : `${selectedUserIds.length} Sales`}
                                              </span>
                                          </div>
                                          <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto">
                                      <DropdownMenuLabel>Pilih Sales</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuCheckboxItem
                                          checked={selectedUserIds.length === 0}
                                          onCheckedChange={() => setSelectedUserIds([])}
                                      >
                                          Semua Sales
                                      </DropdownMenuCheckboxItem>
                                      <DropdownMenuSeparator />
                                      {users.filter(u => {
                                          const isSalesOrLeader = u.roles.includes('sales') || u.roles.includes('leader');
                                          const isActive = u.isActive !== false;
                                          if (isAdminOrOwner) {
                                              const isInSelectedCabang = selectedCabangIds.length === 0 || (u.cabangId && selectedCabangIds.includes(u.cabangId));
                                              return isSalesOrLeader && isActive && isInSelectedCabang;
                                          }
                                          return isSalesOrLeader && isActive && u.cabangId === user?.cabangId;
                                      })
                                      .sort((a, b) => a.nama.localeCompare(b.nama))
                                      .map(u => (
                                          <DropdownMenuCheckboxItem
                                              key={u.id}
                                              checked={selectedUserIds.includes(u.id)}
                                              onCheckedChange={(checked) => {
                                                  if (checked) {
                                                      setSelectedUserIds([...selectedUserIds, u.id]);
                                                  } else {
                                                      setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                                                  }
                                              }}
                                          >
                                              {u.nama.toUpperCase()}
                                          </DropdownMenuCheckboxItem>
                                      ))}
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        )}
                    </div>
              </PopoverContent>
          </Popover>
          {user?.roles.includes('sales') && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push('/pelanggan/tambah')} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Pelanggan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/pelanggan/mutasi')} className="cursor-pointer">
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Mutasi Pelanggan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{filteredPelanggan.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Pelanggan</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-success">
                {filteredPelanggan.filter(p => p.isActive).length}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Aktif</p>
            </CardContent>
          </Card>
          <Card className="bg-info/5 border-info/20 cursor-pointer hover:bg-info/10 transition-colors" onClick={() => setShowVisitsDialog(true)}>
            <CardContent className="p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-info">
                {uniqueTodayVisits.length}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Kunjungan Hari Ini</p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showVisitsDialog} onOpenChange={setShowVisitsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kunjungan Hari Ini</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {uniqueTodayVisits.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Belum ada kunjungan hari ini</p>
              ) : (
                uniqueTodayVisits.map(pelangganId => {
                  const p = pelanggan.find(p => p.id === pelangganId);
                  const visits = kunjungan.filter(v => v.pelangganId === pelangganId && new Date(v.tanggal).toDateString() === todayStr);
                  const sales = penjualan.filter(v => v.pelangganId === pelangganId && new Date(v.tanggal).toDateString() === todayStr && v.status !== 'batal' && v.status !== 'draft');
                  
                  return (
                    <div key={pelangganId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{p?.nama || 'Pelanggan Tidak Diketahui'}</p>
                        <p className="text-xs text-muted-foreground">
                          {visits.length > 0 && `${visits.length} kunjungan`}
                          {visits.length > 0 && sales.length > 0 && ' • '}
                          {sales.length > 0 && `${sales.length} transaksi`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setShowVisitsDialog(false);
                        router.push(`/pelanggan/${pelangganId}`);
                      }}>
                        Lihat
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Merge Dialog */}
        <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Satukan Data Pelanggan</DialogTitle>
              <DialogDescription>
                Pindahkan semua riwayat transaksi dan kunjungan dari pelanggan sumber ke pelanggan target. Pelanggan sumber akan dihapus.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">Pelanggan Utama (Data yang Dipertahankan)</Label>
                    {mergeTarget ? (
                      <div className="p-3 border-2 border-primary bg-primary/5 rounded-xl flex items-center gap-3 relative overflow-hidden group">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {mergeTarget.nama.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{mergeTarget.nama}</p>
                          <p className="text-xs text-muted-foreground">{mergeTarget.kode} • {mergeTarget.telepon}</p>
                        </div>
                        <Badge variant="info" className="h-5">Target</Badge>
                        {isAdminOrOwner && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px] bg-background/50 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity absolute right-12 top-1/2 -translate-y-1/2 border"
                            onClick={() => {
                              setMergeTarget(null);
                              setMergeSource(null);
                              setSearchTarget('');
                            }}
                          >
                            Ganti
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Cari pelanggan utama..."
                            className="pl-9 h-9 text-xs"
                            value={searchTarget}
                            onChange={(e) => setSearchTarget(e.target.value)}
                          />
                        </div>
                        {searchTarget.length > 0 && (
                          <div className="border rounded-lg divide-y bg-muted/20">
                            {pelanggan
                              .filter(p => 
                                (isAdminOrOwner || p.salesId === user?.id) &&
                                (p.nama.toLowerCase().includes(searchTarget.toLowerCase()) || 
                                 p.kode.toLowerCase().includes(searchTarget.toLowerCase()) ||
                                 p.telepon.includes(searchTarget))
                              )
                              .slice(0, 3)
                              .map(p => (
                                <div 
                                  key={p.id}
                                  className="p-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-xs"
                                  onClick={() => {
                                    setMergeTarget(p);
                                    setSearchTarget('');
                                  }}
                                >
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px]">
                                    {p.nama.charAt(0)}
                                  </div>
                                  <div className="flex-1 truncate">
                                    <span className="font-medium">{p.nama}</span>
                                    <span className="text-muted-foreground ml-2">{p.kode}</span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {mergeTarget && (
                    <>
                      <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-background p-1 rounded-full border">
                          <ArrowLeftRight className="w-4 h-4 text-muted-foreground rotate-90" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground font-bold">Pilih Data yang Akan Digabungkan</Label>
                        
                        {/* Search for any customer (Admin Feature) */}
                        {isAdminOrOwner && (
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Cari pelanggan lain..."
                              className="pl-9 h-9 text-xs"
                              value={searchMerge}
                              onChange={(e) => setSearchMerge(e.target.value)}
                            />
                          </div>
                        )}

                        <ScrollArea className="h-[200px] border rounded-xl p-2">
                          <div className="space-y-2">
                            {/* Show automatically detected duplicates first */}
                            {duplicates.map[mergeTarget.id]?.map(id => {
                              const p = pelanggan.find(item => item.id === id);
                              if (!p) return null;
                              if (!isAdminOrOwner && p.salesId !== user?.id) return null;
                              const isSelected = mergeSource?.id === p.id;
                              return (
                                <div 
                                  key={p.id}
                                  className={cn(
                                    "p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3",
                                    isSelected ? "border-destructive bg-destructive/5 ring-1 ring-destructive" : "hover:bg-muted"
                                  )}
                                  onClick={() => setMergeSource(p)}
                                >
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                    isSelected ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                                  )}>
                                    {p.nama.charAt(0)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-xs truncate">{p.nama}</p>
                                      <Badge variant="outline" className="text-[9px] px-1 h-3.5">Duplikat</Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{p.kode} • {p.telepon}</p>
                                  </div>
                                  {isSelected && <Trash2 className="w-4 h-4 text-destructive" />}
                                </div>
                              );
                            })}

                            {/* Show search results for manual merge (Admin) */}
                            {searchMerge.length > 0 && pelanggan
                              .filter(p => 
                                p.id !== mergeTarget.id && 
                                !duplicates.map[mergeTarget.id]?.includes(p.id) &&
                                (isAdminOrOwner || p.salesId === user?.id) &&
                                (p.nama.toLowerCase().includes(searchMerge.toLowerCase()) || 
                                 p.kode.toLowerCase().includes(searchMerge.toLowerCase()) ||
                                 p.telepon.includes(searchMerge))
                              )
                              .slice(0, 5)
                              .map(p => {
                                const isSelected = mergeSource?.id === p.id;
                                return (
                                  <div 
                                    key={p.id}
                                    className={cn(
                                      "p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3",
                                      isSelected ? "border-destructive bg-destructive/5 ring-1 ring-destructive" : "hover:bg-muted"
                                    )}
                                    onClick={() => setMergeSource(p)}
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                      isSelected ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
                                    )}>
                                      {p.nama.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-xs truncate">{p.nama}</p>
                                      <p className="text-[10px] text-muted-foreground">{p.kode} • {p.telepon}</p>
                                    </div>
                                    {isSelected && <Trash2 className="w-4 h-4 text-destructive" />}
                                  </div>
                                );
                              })
                            }

                            {/* Empty state if search has no results and no duplicates */}
                            {(!duplicates.map[mergeTarget.id] || duplicates.map[mergeTarget.id].length === 0) && searchMerge.length === 0 && (
                              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                                <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                <p className="text-[10px] text-muted-foreground">
                                  Tidak ada duplikat otomatis ditemukan.<br/>
                                  {isAdminOrOwner 
                                    ? "Gunakan pencarian di atas untuk memilih manual." 
                                    : "Anda hanya dapat menyatukan data pelanggan milik Anda sendiri. Cari data Anda menggunakan kolom pencarian di atas."}
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}
              </div>

              {mergeTarget && mergeSource && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <p className="font-bold mb-1">Peringatan Penghapusan</p>
                    Data <span className="font-bold">{mergeSource.nama}</span> akan dihapus selamanya. Transaksi (Penjualan), Kunjungan, dan Sisa Kredit akan dipindahkan ke <span className="font-bold">{mergeTarget.nama}</span>.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowMergeDialog(false)}>Batal</Button>
              <Button 
                variant="destructive" 
                disabled={!mergeSource || !mergeTarget || isMerging}
                onClick={handleMerge}
                className="gap-2"
              >
                {isMerging ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowLeftRight className="w-4 h-4" />
                )}
                Satukan Data Sekarang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pelanggan List */}
        <div className="space-y-3">
          {filteredPelanggan.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">Tidak ada pelanggan ditemukan</p>
              </CardContent>
            </Card>
          ) : (
             <>
               {filteredPelanggan.slice(0, displayLimit).map((item, index) => {
                const kategori = kategoriPelanggan.find(k => k.id === item.kategoriId);
                const sales = users.find(u => u.id === item.salesId);
 
                const limitKredit = profilPerusahaan?.config?.useGlobalLimit 
                    ? (profilPerusahaan.config.globalLimitAmount || 0)
                    : (item.limitKredit + item.sisaKredit);

                const sisaPlafon = profilPerusahaan?.config?.useGlobalLimit
                    ? ((profilPerusahaan.config.globalLimitAmount || 0) - item.sisaKredit)
                    : item.limitKredit;

                return (
                  <Card 
                    key={item.id} 
                    elevated 
                    className="animate-slide-up cursor-pointer hover:border-primary/30"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => router.push(`/pelanggan/${item.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">
                            {item.nama.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-2">
                                <span className="truncate">{item.nama}</span>
                                <Badge variant={item.isActive ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0 h-4">
                                  {item.isActive ? 'Aktif' : 'Non-Aktif'}
                                </Badge>
                                {duplicates.ids.has(item.id) && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-5 w-5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <AlertCircle className="w-3.5 h-3.5" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-amber-600">
                                          <AlertCircle className="w-4 h-4" />
                                          <span className="text-xs font-bold uppercase tracking-wider">Potensi Duplikat</span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                          Ditemukan {duplicates.map[item.id]?.length} pelanggan lain dengan nama atau nomor telepon yang serupa.
                                        </p>
                                        {(isAdminOrOwner || item.salesId === user?.id) && (
                                          <Button 
                                            size="sm" 
                                            className="w-full h-8 text-[11px] bg-amber-600 hover:bg-amber-700"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMergeTarget(item);
                                              setMergeSource(null);
                                              setSearchMerge('');
                                              setShowMergeDialog(true);
                                            }}
                                          >
                                            Satukan Data Pelanggan
                                          </Button>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{item.kode}</p>
                            </div>
                            <Badge variant={
                              kategori?.nama === 'Platinum' ? 'default' :
                              kategori?.nama === 'Gold' ? 'warning' :
                              kategori?.nama === 'Silver' ? 'secondary' : 'muted'
                            }>
                              {kategori?.nama}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{item.alamat}</span>
                            </p>
                            <div className="flex items-center justify-between group/phone">
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {item.telepon}
                              </p>
                              {item.telepon && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`https://wa.me/${formatWhatsAppNumber(item.telepon)}`, '_blank');
                                    }}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShare(item);
                                    }}
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`tel:${item.telepon}`, '_self');
                                    }}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Sales: <span className="font-medium text-foreground">{sales?.nama}</span>
                            </p>
                          </div>
                           <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t bg-muted/10 -mx-4 -mb-4 px-4 py-2">
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Total Penjualan</p>
                                    <p className="text-xs font-bold text-indigo-600">
                                        {formatCompactRupiah(salesAchievementMap.get(item.id) || 0)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground">Total Hutang</p>
                                    <p className="text-xs font-bold text-red-600">
                                        {formatCompactRupiah(item.sisaKredit || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Limit</p>
                                    <p className="text-xs font-semibold">
                                        {formatCompactRupiah(limitKredit)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground">Sisa Plafon</p>
                                    <p className="text-xs font-semibold text-green-600">
                                        {formatCompactRupiah(sisaPlafon)}
                                    </p>
                                </div>
                           </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
                {filteredPelanggan.length > displayLimit && (
                     <Button 
                         variant="ghost" 
                         className="w-full mt-4 border-dashed text-muted-foreground"
                         onClick={() => setDisplayLimit(prev => prev + 10)}
                     >
                         Lihat Lainnya
                     </Button>
                )}
             </>
          )}
        </div>
      </div>
    </div>
  );
}
