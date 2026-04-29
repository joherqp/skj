'use client';
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DatabaseContextType,
  Kategori,
  Satuan,
  Barang,
  Pelanggan,
  User,
  Penjualan,
  Setoran,
  Absensi,
  Kunjungan,
  Notifikasi,
  Persetujuan,
  KategoriPelanggan,
  RekeningBank,
  Area,
  Cabang,
  Harga,
  StokPengguna,
  Promo,
  MutasiBarang,
  SaldoPengguna,
  ProfilPerusahaan,
  Reimburse,
  PettyCash,
  PembayaranPenjualan,
  Restock,
  RiwayatPelanggan,
  SalesTarget,
  StokLog,
  StokHarian
} from '@/types';
import { toCamelCase, toSnakeCase } from '@/lib/utils';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const isFetchingRef = useRef(false);

  // State definitions
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [satuan, setSatuan] = useState<Satuan[]>([]);
  const [kategoriPelanggan, setKategoriPelanggan] = useState<KategoriPelanggan[]>([]);
  const [rekeningBank, setRekeningBank] = useState<RekeningBank[]>([]);
  const [area, setArea] = useState<Area[]>([]);
  const [cabang, setCabang] = useState<Cabang[]>([]);

  const [barang, setBarang] = useState<Barang[]>([]);
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [penjualan, setPenjualan] = useState<Penjualan[]>([]);
  const [setoran, setSetoran] = useState<Setoran[]>([]);
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [kunjungan, setKunjungan] = useState<Kunjungan[]>([]);
  const [riwayatPelanggan, setRiwayatPelanggan] = useState<RiwayatPelanggan[]>([]);
  const [notifikasi, setNotifikasi] = useState<Notifikasi[]>([]);
  const [persetujuan, setPersetujuan] = useState<Persetujuan[]>([]);
  const [harga, setHarga] = useState<Harga[]>([]);
  const [stokPengguna, setStokPengguna] = useState<StokPengguna[]>([]);
  const [promo, setPromo] = useState<Promo[]>([]);
  const [mutasiBarang, setMutasiBarang] = useState<MutasiBarang[]>([]);
  const [saldoPengguna, setSaldoPengguna] = useState<SaldoPengguna[]>([]);
  const [reimburse, setReimburse] = useState<Reimburse[]>([]);
  const [pettyCash, setPettyCash] = useState<PettyCash[]>([]);
  const [restock, setRestock] = useState<Restock[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [stokHarian, setStokHarian] = useState<StokHarian[]>([]);
  const [stokLog, setStokLog] = useState<StokLog[]>([]);
  const [pembayaranPenjualan, setPembayaranPenjualan] = useState<PembayaranPenjualan[]>([]);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [pushSubscriptions, setPushSubscriptions] = useState<any[]>([]);
  const [salesTargetHistory, setSalesTargetHistory] = useState<any[]>([]);
  const [stokSnapshot, setStokSnapshot] = useState<any[]>([]);

  // Profil Perusahaan
  const [profilPerusahaan, setProfilPerusahaan] = useState<ProfilPerusahaan>({
    id: '',
    nama: '',
    alamat: '',
    telepon: '',
    email: '',
    website: '',
    deskripsi: ''
  });





  // UI State
  const [pettyCashBalance, setPettyCashBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializedRef = useRef(false);
  const [viewMode, setViewMode] = useState<'all' | 'me'>('all');

  // Calculate dbMode (Demo Mode Logic)
  const dbMode = useMemo(() => {
    const isGlobalDemo = profilPerusahaan.config?.isDemo || false;
    const userBranch = cabang.find(c => c.id === currentUser?.cabangId);
    const isBranchDemo = userBranch?.isDemo || false;
    
    // Look up current user in our local users state to get latest isDemo status
    const me = users.find(u => u.id === currentUser?.id) || currentUser;
    const isUserDemo = me?.isDemo || false;

    return (isGlobalDemo || isBranchDemo || isUserDemo) ? 'demo' : 'public';
  }, [profilPerusahaan.config?.isDemo, cabang, users, currentUser]);

  // Feature: Offline Sync
  const [isOnline, setIsOnline] = useState(true);
  // Feature: Other tables
  const [penyesuaianStok, setPenyesuaianStok] = useState<any[]>([]);
  const [permintaanBarang, setPermintaanBarang] = useState<any[]>([]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); toast.success('Online'); };
    const handleOffline = () => { setIsOnline(false); toast.warning('Offline Mode'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // Process Offline Queue
  const processQueue = useCallback(async () => {
    // Offline queue disabled as per persistence removal policy
    return;
  }, []);

  // Trigger Sync when Online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Helper for realtime updates
  const handleRealtimeUpdate = useCallback(<T extends { id: string }>(prev: T[], event: string, newItem: any, oldItem: any) => {
    // Safety check
    if (!prev) prev = [];

    if (event === 'INSERT') {
      if (!newItem || !newItem.id) {
        return prev;
      }
      // Avoid duplicates
      if (prev.some(p => p.id === newItem.id)) return prev;
      return [newItem, ...prev];
    }

    if (event === 'UPDATE') {
      if (!newItem || !newItem.id) return prev;
      return prev.map(item => item.id === newItem.id ? newItem : item);
    }

    if (event === 'DELETE') {
      if (!oldItem || !oldItem.id) return prev;
      return prev.filter(item => item.id !== oldItem.id);
    }
    return prev;
  }, []);

  // Realtime Subscription
  useEffect(() => {
    console.log('Setting up Realtime Subscription for public and demo schemas...');
    
    const updateLocalState = (tableName: string, newItem: unknown, oldItem: unknown, eventType: string) => {
      const camelNew = newItem ? toCamelCase(newItem) : null;
      const safeOld = oldItem || {};

      switch (tableName) {
        case 'notifikasi':
          setNotifikasi(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld));
          if (eventType === 'INSERT' && camelNew && (camelNew as any).userId === currentUser?.id) {
            const n = camelNew as Notifikasi;
            const toastType = n.jenis === 'error' ? 'error' : n.jenis === 'success' ? 'success' : n.jenis === 'warning' ? 'warning' : 'info';
            toast[toastType](n.pesan || 'Notification', { description: n.judul, duration: 5000 });
            playNotificationSound();
          }
          break;
        case 'persetujuan': setPersetujuan(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'penjualan': setPenjualan(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'absensi': setAbsensi(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'kunjungan': setKunjungan(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'riwayat_pelanggan': setRiwayatPelanggan(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'stok_pengguna': setStokPengguna(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'users': setUsers(prev => handleRealtimeUpdate(prev, eventType, camelNew, safeOld)); break;
        case 'profil_perusahaan': if (camelNew) setProfilPerusahaan(camelNew as ProfilPerusahaan); break;
      }
    };

    const changes = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        updateLocalState(payload.table, payload.new, payload.old, payload.eventType);
      })
      .on('postgres_changes', { event: '*', schema: 'demo' }, (payload) => {
        if (dbMode === 'demo') {
          updateLocalState(payload.table, payload.new, payload.old, payload.eventType);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(changes);
    };
  }, [currentUser, handleRealtimeUpdate, dbMode]);

  // Helper to determine schema for a table
  const getTableSchema = useCallback((tableName: string, currentMode: 'public' | 'demo' = dbMode) => {
    const publicOnlyTables = ['profil_perusahaan', 'cabang', 'users', 'stok_log', 'stok_harian', 'stok_snapshot', 'push_subscriptions'];
    return publicOnlyTables.includes(tableName) ? 'public' : currentMode;
  }, [dbMode]);

  // Generic fetch function with timeout and robust error handling
  const fetchData = useCallback(async <T,>(tableName: string, daysToFetch: number = 30, schemaOverride?: 'public' | 'demo'): Promise<T[]> => {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout fetching ${tableName}`)), 15000)
    );

    try {
      let sortColumn = 'created_at';
      let dateFilterColumn: string | null = null;

      // Handle tables with different timestamp column names
      if (tableName === 'notifikasi') {
        sortColumn = 'tanggal';
        dateFilterColumn = 'tanggal';
      } else if (tableName === 'persetujuan') {
        sortColumn = 'tanggal_pengajuan';
        dateFilterColumn = 'tanggal_pengajuan';
      } else if (['penjualan', 'setoran', 'absensi', 'mutasi_barang', 'permintaan_barang', 'penyesuaian_stok', 'reimburse', 'petty_cash'].includes(tableName)) {
        dateFilterColumn = 'tanggal';
        if (tableName === 'penjualan' || tableName === 'setoran' || tableName === 'absensi' || tableName === 'reimburse' || tableName === 'petty_cash') {
          sortColumn = 'tanggal';
        }
      } else if (tableName === 'user_locations' || tableName === 'sales_target_history' || tableName === 'stok_snapshot' || tableName === 'push_subscriptions') {
        sortColumn = 'id';
      }

      const schema = schemaOverride || getTableSchema(tableName);

      const performFetch = async (useSort = true) => {
        let query = supabase
          .schema(schema)
          .from(tableName)
          .select('*');
        
        if (useSort) {
          query = query.order(sortColumn, { ascending: false });
        }

        // Apply daysToFetch limit for high-volume transaction tables
        if (dateFilterColumn) {
          const limitDate = new Date();
          limitDate.setDate(limitDate.getDate() - daysToFetch);
          limitDate.setHours(0, 0, 0, 0);
          query = query.gte(dateFilterColumn, limitDate.toISOString());
        }

        return await query;
      };

      // Race the fetch against a timeout
      const response = await Promise.race([performFetch(), timeoutPromise]);
      
      if (response.error) {
        // If sorting failed (column might not exist, error 42703), retry without sort
        if (response.error.code === '42703') {
          console.warn(`Sort column ${sortColumn} not found in ${tableName}, retrying without sort`);
          const retryResponse = await performFetch(false);
          if (retryResponse.error) throw retryResponse.error;
          return (toCamelCase(retryResponse.data || [])) as T[];
        }
        throw response.error;
      }

      return (toCamelCase(response.data || [])) as T[];
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      // Don't show toast for every table to avoid spamming the user
      // if (tableName === 'barang' || tableName === 'pelanggan') {
      //   toast.error(`Gagal memuat data ${tableName}`);
      // }
      return [];
    }
  }, [getTableSchema]);

  // Load all data
  const loadAllData = useCallback(async (isManualRefresh = false) => {
    console.log('loadAllData called', { isManualRefresh, isFetching: isFetchingRef.current, hasUser: !!currentUser, isAuthLoading });
    
    if (!currentUser || isFetchingRef.current) {
      if (!currentUser && !isAuthLoading) {
        console.log('No user and auth not loading, setting isDbLoading to false');
        setIsLoading(false);
      }
      return;
    }

    isFetchingRef.current = true;
    
    // Safety timeout for the entire data loading process
    const globalTimeout = setTimeout(() => {
      if (isFetchingRef.current) {
        console.warn('loadAllData is taking too long (> 45s), forcing isLoading(false)');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, 45000);

    try {
      if (isManualRefresh || isInitialized) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // 1. Fetch CORE Data from PUBLIC schema first
      console.log('Fetching core data...');
      const [profileRes, cabangRes, usersRes] = await Promise.all([
        Promise.resolve(supabase.from('profil_perusahaan').select('*').limit(1).maybeSingle()).catch(e => ({ error: e, data: null })),
        Promise.resolve(supabase.from('cabang').select('*').order('nama')).catch(e => ({ error: e, data: [] })),
        Promise.resolve(supabase.from('users').select('*').order('nama')).catch(e => ({ error: e, data: [] }))
      ]);

      if (profileRes.error) console.error('Error fetching profil_perusahaan:', profileRes.error);
      if (cabangRes.error) console.error('Error fetching cabang:', cabangRes.error);
      if (usersRes.error) console.error('Error fetching users:', usersRes.error);

      const profile = profileRes.data ? (toCamelCase(profileRes.data) as ProfilPerusahaan) : null;
      const branches = (cabangRes.data ? toCamelCase(cabangRes.data) : []) as Cabang[];
      const allUsers = (usersRes.data ? toCamelCase(usersRes.data) : []) as User[];

      if (profile) setProfilPerusahaan(profile);
      setCabang(branches);
      setUsers(allUsers);

      // Determine effective mode for this fetch session
      const isGlobalDemo = profile?.config?.isDemo || false;
      const meInAllUsers = allUsers.find(u => u.id === currentUser.id) || currentUser;
      const userBranch = branches.find(c => c.id === meInAllUsers.cabangId);
      const isBranchDemo = userBranch?.isDemo || false;
      const isUserDemo = meInAllUsers.isDemo || false;

      const effectiveMode = (isGlobalDemo || isBranchDemo || isUserDemo) ? 'demo' : 'public';
      const daysLimit = profile?.config?.daysToFetch || 30;

      console.log(`Loading master data in mode: ${effectiveMode}`);

      // 2. Fetch Master Data and Transactions using the effectiveMode
      // Use Promise.all but fetchData already has individual catch blocks
      const [
        kategoriRes,
        satuanRes,
        kategoriPelangganRes,
        rekeningBankRes,
        areaRes,
        barangRes,
        pelangganRes,
        penjualanRes,
        setoranRes,
        absensiRes,
        kunjunganRes,
        riwayatPelangganRes,
        notifikasiRes,
        persetujuanRes,
        hargaRes,
        stokRes,
        promoRes,
        mutasiRes,
        saldoRes,
        reimburseRes,
        pettyCashRes,
        restockRes,
        penyesuaianRes,
        permintaanRes,
        targetsRes,
        stokHarianRes,
        stokLogRes,
        pembayaranPenjualanRes,
        userLocationsRes,
        pushSubscriptionsRes,
        salesTargetHistoryRes,
        stokSnapshotRes
      ] = await Promise.all([
        fetchData<Kategori>('kategori', 30, effectiveMode),
        fetchData<Satuan>('satuan', 30, effectiveMode),
        fetchData<KategoriPelanggan>('kategori_pelanggan', 30, effectiveMode),
        fetchData<RekeningBank>('rekening_bank', 30, effectiveMode),
        fetchData<Area>('area', 30, effectiveMode),
        fetchData<Barang>('barang', 30, effectiveMode),
        fetchData<Pelanggan>('pelanggan', 30, effectiveMode),
        fetchData<Penjualan>('penjualan', daysLimit, effectiveMode),
        fetchData<Setoran>('setoran', daysLimit, effectiveMode),
        fetchData<Absensi>('absensi', daysLimit, effectiveMode),
        fetchData<Kunjungan>('kunjungan', daysLimit, effectiveMode),
        fetchData<RiwayatPelanggan>('riwayat_pelanggan', daysLimit, effectiveMode),
        fetchData<Notifikasi>('notifikasi', daysLimit, effectiveMode),
        fetchData<Persetujuan>('persetujuan', daysLimit, effectiveMode),
        fetchData<Harga>('harga', 30, effectiveMode),
        fetchData<StokPengguna>('stok_pengguna', 30, effectiveMode),
        fetchData<Promo>('promo', 30, effectiveMode),
        fetchData<MutasiBarang>('mutasi_barang', daysLimit, effectiveMode),
        fetchData<SaldoPengguna>('saldo_pengguna', 30, effectiveMode),
        fetchData<Reimburse>('reimburse', daysLimit, effectiveMode),
        fetchData<PettyCash>('petty_cash', daysLimit, effectiveMode),
        fetchData<Restock>('restock', daysLimit, effectiveMode),
        fetchData<any>('penyesuaian_stok', daysLimit, effectiveMode),
        fetchData<any>('permintaan_barang', daysLimit, effectiveMode),
        fetchData<SalesTarget>('sales_targets', 30, effectiveMode),
        fetchData<StokHarian>('stok_harian', daysLimit, effectiveMode),
        fetchData<StokLog>('stok_log', daysLimit, effectiveMode),
        fetchData<PembayaranPenjualan>('pembayaran_penjualan', daysLimit, effectiveMode),
        fetchData<any>('user_locations', 7, effectiveMode),
        fetchData<any>('push_subscriptions', 30, effectiveMode),
        fetchData<any>('sales_target_history', 30, effectiveMode),
        fetchData<any>('stok_snapshot', 30, effectiveMode)
      ]);

      setKategori(kategoriRes);
      setSatuan(satuanRes);
      setKategoriPelanggan(kategoriPelangganRes);
      setRekeningBank(rekeningBankRes);
      setArea(areaRes);
      setBarang(barangRes);
      setPelanggan(pelangganRes);
      setPenjualan(penjualanRes);
      setSetoran(setoranRes);
      setAbsensi(absensiRes);
      setKunjungan(kunjunganRes);
      setRiwayatPelanggan(riwayatPelangganRes);
      setNotifikasi(notifikasiRes);
      setPersetujuan(persetujuanRes);
      setHarga(hargaRes);
      setStokPengguna(stokRes);
      setPromo(promoRes);
      setMutasiBarang(mutasiRes);
      setSaldoPengguna(saldoRes);
      setReimburse(reimburseRes);
      setPettyCash(pettyCashRes);
      setRestock(restockRes);
      setPenyesuaianStok(penyesuaianRes);
      setPermintaanBarang(permintaanRes);
      setTargets(targetsRes);
      setStokHarian(stokHarianRes);
      setStokLog(stokLogRes);
      setPembayaranPenjualan(pembayaranPenjualanRes);
      setUserLocations(userLocationsRes);
      setPushSubscriptions(pushSubscriptionsRes);
      setSalesTargetHistory(salesTargetHistoryRes);
      setStokSnapshot(stokSnapshotRes);

      if (pettyCashRes && pettyCashRes.length > 0) {
        setPettyCashBalance(pettyCashRes[0].saldoAkhir);
      } else {
        setPettyCashBalance(0);
      }
    } catch (error) {
      console.error('Error in loadAllData:', error);
      toast.error('Gagal menyinkronkan data. Beberapa fitur mungkin tidak tersedia.');
    } finally {
      clearTimeout(globalTimeout);
      console.log('loadAllData finished');
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsInitialized(true);
      isInitializedRef.current = true;
    }
  }, [currentUser, isInitialized, fetchData, isAuthLoading]);

  // Handle app visibility/focus to refresh data
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      // If app has been in background for more than 2 minutes, refresh data
      // We use 2 minutes to balance freshness vs battery/data usage
      if (now - lastRefreshRef.current > 120000 && currentUser && isInitialized && !isRefreshing) {
        console.log('App resumed after >2 mins, refreshing data...');
        lastRefreshRef.current = now;
        void loadAllData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser, isInitialized, isRefreshing, loadAllData]);

  // Load data when user changes
  useEffect(() => {
    loadAllData();
    lastRefreshRef.current = Date.now();
  }, [loadAllData]);

  // Generic CRUD functions
  const createItem = useCallback(async <T,>(tableName: string, item: Record<string, unknown>, setter: Dispatch<SetStateAction<T[]>>): Promise<T> => {
    try {
      const dbItem = toSnakeCase(item) as Record<string, unknown>;

      const excludeAuditColumns = ['area', 'cabang', 'kategori', 'satuan', 'rekening_bank', 'kategori_pelanggan', 'peran', 'persetujuan', 'users', 'harga', 'notifikasi', 'stok_pengguna', 'absensi', 'saldo_pengguna', 'reimburse', 'petty_cash', 'permintaan_barang', 'penyesuaian_stok', 'kunjungan', 'riwayat_pelanggan', 'pembayaran_penjualan', 'restock'];

      if (currentUser && !excludeAuditColumns.includes(tableName)) {
        dbItem.created_by = currentUser.id;
        dbItem.updated_by = currentUser.id;
      }

      // Check Offline
      if (!isOnline) {
        toast.error('Gagal menyimpan: Anda sedang offline');
        throw new Error('Offline');
      }

      if (!dbItem.id) {
        delete dbItem.id;
      }

      // Clean empty strings for UUID columns (PostgreSQL rejects "" for uuid)
      const uuidColumns = [
        'referensi_id', 'diajukan_oleh', 'disetujui_oleh', 'target_cabang_id', 'target_user_id',
        'cabang_id', 'user_id', 'sales_id', 'pelanggan_id', 'barang_id', 'satuan_id', 'kategori_id',
        'rekening_bank_id', 'area_id', 'dari_cabang_id', 'ke_cabang_id',
        'user_account_id', 'penjualan_id', 'syarat_barang_id', 'bonus_produk_id', 'bonus_barang_id',
        'penerima_id', 'dibuat_oleh', 'updated_by', 'created_by', 'persetujuan_id', 'reimburse_id',
        'parent_id', 'kategori_pelanggan_id', 'rekening_id'
      ];

      const arrayColumns = ['cabang_ids', 'target_produk_ids', 'bonus_produk_ids', 'kategori_pelanggan_ids'];

      const numericColumns = ['nilai', 'syarat_jumlah', 'min_qty', 'max_apply', 'jumlah', 'nominal', 'biaya'];
      Object.keys(dbItem).forEach(key => {
        if ((uuidColumns.includes(key) || key.endsWith('_id')) && dbItem[key] === '') {
          dbItem[key] = null;
        }
        if (uuidColumns.includes(key) && dbItem[key] === 'system') {
          dbItem[key] = null;
        }
        if (arrayColumns.includes(key) && dbItem[key] === '') {
          dbItem[key] = null;
        }
        if (numericColumns.includes(key) && (dbItem[key] === '' || dbItem[key] === undefined)) {
          dbItem[key] = null;
        }
      });

      const { data, error } = await supabase
        .schema(getTableSchema(tableName))
        .from(tableName)
        .insert(dbItem)
        .select()
        .maybeSingle();


      if (error) throw error;

      const newItem = toCamelCase((data ?? dbItem)) as T;
      if (data) {
        setter((prev) => [newItem, ...prev]);
      }
      return newItem;
    } catch (error: any) {
      console.error(`Error creating ${tableName}:`, error.message || error);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      throw error;
    }
  }, [currentUser, getTableSchema, isOnline]);

  const updateItem = useCallback(async <T,>(tableName: string, id: string, item: Record<string, unknown>, setter: Dispatch<SetStateAction<T[]>>) => {
    try {
      const dbItem = toSnakeCase(item) as Record<string, unknown>;

      const excludeAuditColumns = ['area', 'cabang', 'kategori', 'satuan', 'rekening_bank', 'kategori_pelanggan', 'peran', 'persetujuan', 'users', 'harga', 'notifikasi', 'stok_pengguna', 'absensi', 'saldo_pengguna', 'permintaan_barang', 'penyesuaian_stok', 'kunjungan', 'riwayat_pelanggan', 'pembayaran_penjualan', 'restock'];

      if (currentUser && !excludeAuditColumns.includes(tableName)) {
        dbItem.updated_by = currentUser.id;
      }

      // Check Offline
      if (!isOnline) {
        toast.error('Gagal memperbarui: Anda sedang offline');
        throw new Error('Offline');
      }

      // Clean empty strings for UUID columns (PostgreSQL rejects "" for uuid)
      const uuidColumns = [
        'referensi_id', 'diajukan_oleh', 'disetujui_oleh', 'target_cabang_id', 'target_user_id',
        'cabang_id', 'user_id', 'sales_id', 'pelanggan_id', 'barang_id', 'satuan_id', 'kategori_id',
        'rekening_bank_id', 'area_id', 'dari_cabang_id', 'ke_cabang_id',
        'user_account_id', 'penjualan_id', 'syarat_barang_id', 'bonus_produk_id', 'bonus_barang_id',
        'penerima_id', 'dibuat_oleh', 'updated_by', 'created_by', 'persetujuan_id', 'reimburse_id',
        'parent_id', 'kategori_pelanggan_id', 'rekening_id'
      ];

      const arrayColumns = ['cabang_ids', 'target_produk_ids', 'bonus_produk_ids', 'kategori_pelanggan_ids'];

      const numericColumns = ['nilai', 'syarat_jumlah', 'min_qty', 'max_apply', 'jumlah', 'nominal', 'biaya'];
      Object.keys(dbItem).forEach(key => {
        if ((uuidColumns.includes(key) || key.endsWith('_id')) && dbItem[key] === '') {
          dbItem[key] = null;
        }
        if (uuidColumns.includes(key) && dbItem[key] === 'system') {
          dbItem[key] = null;
        }
        if (arrayColumns.includes(key) && dbItem[key] === '') {
          dbItem[key] = null;
        }
        if (numericColumns.includes(key) && (dbItem[key] === '' || dbItem[key] === undefined)) {
          dbItem[key] = null;
        }
      });

      const { data, error } = await supabase
        .schema(getTableSchema(tableName))
        .from(tableName)
        .update(dbItem)
        .eq('id', id)
        .select()
        .maybeSingle();


      if (error) throw error;

      const updatedItem = toCamelCase((data ?? { ...dbItem, id })) as T;
      setter((prev) => prev.map((p) => ((p as { id: string }).id === id ? updatedItem : p)));
    } catch (error: any) {
      console.error(`Error updating ${tableName}:`, error.message || error);
      if (error.details) console.error('Error details:', error.details);
      if (error.hint) console.error('Error hint:', error.hint);
      throw error;
    }
  }, [currentUser, getTableSchema, isOnline]);

  const deleteItem = useCallback(async <T,>(tableName: string, id: string, setter: Dispatch<SetStateAction<T[]>>) => {
    try {
      // Check Offline
      if (!isOnline) {
        toast.error('Gagal menghapus: Anda sedang offline');
        throw new Error('Offline');
      }

      const { error } = await supabase
        .schema(getTableSchema(tableName))
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setter((prev) => prev.filter((p) => (p as { id: string }).id !== id));
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error);
      throw error;
    }
  }, [getTableSchema, isOnline]);

  // Implement CRUD for all entities

  // Auto-checkout for previous days
  useEffect(() => {
    if (!currentUser || absensi.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const staleAbsensi = absensi.filter(a => {
      const absensiDate = new Date(a.tanggal);
      absensiDate.setHours(0, 0, 0, 0);
      return a.userId === currentUser.id &&
        !a.checkOut &&
        absensiDate.getTime() < today.getTime();
    });

    if (staleAbsensi.length > 0) {
      console.log(`Found ${staleAbsensi.length} stale absensi records. Auto-checking out...`);
      staleAbsensi.forEach(async (item) => {
        const autoOutTime = new Date(item.tanggal);
        autoOutTime.setHours(23, 59, 59);
        try {
          await updateItem('absensi', item.id, {
            checkOut: autoOutTime,
          }, setAbsensi);
          toast.success(`Absensi tanggal ${new Date(item.tanggal).toLocaleDateString('id-ID')} otomatis di-checkout.`);
        } catch (e) {
          console.error("Auto checkout failed", e);
        }
      });
    }
  }, [absensi, currentUser, updateItem]);

  const isAdminOrOwner = currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner');

  const value = useMemo<DatabaseContextType>(() => ({
    // State
    kategori,
    satuan,
    kategoriPelanggan,
    rekeningBank,
    area,
    cabang,
    barang,
    harga,
    stokPengguna,
    saldoPengguna,
    pelanggan,
    users,
    penjualan,

    setoran,
    absensi,
    kunjungan,
    riwayatPelanggan,
    permintaanBarang,
    mutasiBarang,
    promo,
    penyesuaianStok,
    notifikasi,
    persetujuan,
    stokLog,
    stokHarian,
    pembayaranPenjualan,
    restock,
    userLocations,
    pushSubscriptions,
    salesTargetHistory,
    stokSnapshot,
    profilPerusahaan,
    // Reimbursement & Petty Cash
    reimburse,
    pettyCash,
    pettyCashBalance,
    isLoading,
    isRefreshing,
    isInitialized,
    setIsLoading,
    viewMode,
    setViewMode,
    pendingSyncCount: 0,
    isAdminOrOwner,
    dbMode,
    refresh: () => loadAllData(true),
    repairUser: async () => {
      // No-op or refresh implementation
      await loadAllData(true);
    },

    // Kategori
    addKategori: (item) => createItem('kategori', item, setKategori),
    updateKategori: (id, item) => updateItem('kategori', id, item, setKategori),
    deleteKategori: (id) => deleteItem('kategori', id, setKategori),

    // Satuan
    addSatuan: (item) => createItem('satuan', item, setSatuan),
    updateSatuan: (id, item) => updateItem('satuan', id, item, setSatuan),
    deleteSatuan: (id) => deleteItem('satuan', id, setSatuan),

    // Kategori Pelanggan
    addKategoriPelanggan: (item) => createItem('kategori_pelanggan', item, setKategoriPelanggan),
    updateKategoriPelanggan: (id, item) => updateItem('kategori_pelanggan', id, item, setKategoriPelanggan),
    deleteKategoriPelanggan: (id) => deleteItem('kategori_pelanggan', id, setKategoriPelanggan),

    // Rekening Bank
    addRekeningBank: (item) => createItem('rekening_bank', item, setRekeningBank),
    updateRekeningBank: (id, item) => updateItem('rekening_bank', id, item, setRekeningBank),
    deleteRekeningBank: (id) => deleteItem('rekening_bank', id, setRekeningBank),

    // Area
    addArea: (item) => createItem('area', item, setArea),
    updateArea: (id, item) => updateItem('area', id, item, setArea),
    deleteArea: (id) => deleteItem('area', id, setArea),

    // Cabang
    addCabang: (item) => createItem('cabang', item, setCabang),
    updateCabang: (id, item) => updateItem('cabang', id, item, setCabang),
    deleteCabang: (id) => deleteItem('cabang', id, setCabang),

    // Barang
    addBarang: (item) => createItem('barang', item, setBarang),
    updateBarang: (id, item) => updateItem('barang', id, item, setBarang),
    deleteBarang: (id) => deleteItem('barang', id, setBarang),

    // Pelanggan
    addPelanggan: (item) => createItem('pelanggan', item, setPelanggan),
    updatePelanggan: (id, item) => updateItem('pelanggan', id, item, setPelanggan),
    deletePelanggan: (id) => deleteItem('pelanggan', id, setPelanggan),

    // Penjualan
    addPenjualan: async (item) => {
      try {
        const newItem = await createItem('penjualan', item, setPenjualan);

        // Side Effect: Deduct Stock
        if (item.items && Array.isArray(item.items)) {
          const salesmanId = item.salesId || currentUser?.id;
          if (!salesmanId) {
            console.warn("No salesman ID for stock deduction");
            return newItem;
          }

          const stockCache = new Map<string, number>();

          for (const soldItem of item.items) {
            let currentStock = 0;
            let stockId = '';

            if (stockCache.has(soldItem.barangId)) {
              currentStock = stockCache.get(soldItem.barangId)!;
              const stockRecord = stokPengguna.find(s => s.barangId === soldItem.barangId && s.userId === salesmanId);
              stockId = stockRecord?.id || '';
            } else {
              const stockRecord = stokPengguna.find(s => s.barangId === soldItem.barangId && s.userId === salesmanId);
              if (stockRecord) {
                currentStock = stockRecord.jumlah;
                stockId = stockRecord.id;
              }
            }

            if (stockId) {
              const deduction = soldItem.jumlah * (soldItem.konversi || 1);
              const newStock = currentStock - deduction;
              stockCache.set(soldItem.barangId, newStock);
              await updateItem('stok_pengguna', stockId, { jumlah: newStock }, setStokPengguna);
            } else {
              console.warn(`No stock record found for product ${soldItem.barangId} user ${salesmanId}`);
            }
          }
        }
        return newItem;
      } catch (error) {
        console.error("Error in addPenjualan:", error);
        throw error;
      }
    },
    updatePenjualan: (id, item) => updateItem('penjualan', id, item, setPenjualan),
    deletePenjualan: (id) => deleteItem('penjualan', id, setPenjualan),

    // Setoran
    addSetoran: (item) => createItem('setoran', item, setSetoran),
    updateSetoran: (id, item) => updateItem('setoran', id, item, setSetoran),
    deleteSetoran: (id) => deleteItem('setoran', id, setSetoran),

    // Absensi
    addAbsensi: async (item) => {
      try {
        const dbItem = toSnakeCase(item) as Record<string, unknown>;

        if (!isOnline) {
          toast.error('Gagal check-in: Anda sedang offline');
          throw new Error('Offline');
        }

        delete dbItem.id;

        const { data, error } = await supabase
          .from('absensi')
          .insert(dbItem)
          .select()
          .single();


        if (error) throw error;

        const newItem = toCamelCase(data) as Absensi;
        setAbsensi((prev) => {
          const filtered = prev.filter(p => p.id !== newItem.id);
          return [newItem, ...filtered];
        });

        await loadAllData();
        return newItem;
      } catch (error) {
        console.error(`Error creating absensi:`, error);
        throw error;
      }
    },
    updateAbsensi: (id, item) => updateItem('absensi', id, item, setAbsensi),
    deleteAbsensi: (id) => deleteItem('absensi', id, setAbsensi),



    // Users
    addUser: (item) => {
      const userItem = { ...item, roles: item.roles || ['staff'] };
      return createItem('users', userItem, setUsers);
    },
    updateUser: (id, item) => updateItem('users', id, item, setUsers),
    deleteUser: (id) => deleteItem('users', id, setUsers),

    // Notifikasi
    addNotifikasi: async (item) => {
      const created = await createItem<Notifikasi>('notifikasi', item, setNotifikasi);
      if (created?.userId) {
        void fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: created.userId,
            title: created.judul || 'Notifikasi Baru',
            body: created.pesan || 'Ada update terbaru.',
            url: created.link || '/notifikasi',
          }),
        });
      }
      return created;
    },
    updateNotifikasi: (id, item) => updateItem('notifikasi', id, item, setNotifikasi),
    deleteNotifikasi: (id) => deleteItem('notifikasi', id, setNotifikasi),
    markNotifikasiRead: async (id) => {
      setNotifikasi(prev => prev.map(n => n.id === id ? { ...n, dibaca: true } : n));
      try {
        const { error } = await supabase
          .from('notifikasi')
          .update({ dibaca: true })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.warn('Failed to sync markNotifikasiRead:', error);
      }
    },
    markAllNotifikasiRead: async () => {
      if (!currentUser) return;
      const unreadIds = notifikasi
        .filter(n => n.userId === currentUser.id && !n.dibaca)
        .map(n => n.id);
      if (unreadIds.length === 0) return;

      setNotifikasi(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, dibaca: true } : n));
      try {
        const { error } = await supabase
          .from('notifikasi')
          .update({ dibaca: true })
          .eq('user_id', currentUser.id)
          .eq('dibaca', false);

        if (error) throw error;
      } catch (error) {
        console.warn('Failed to sync markAllNotifikasiRead:', error);
      }
    },

    // Persetujuan
    addPersetujuan: (item) => createItem('persetujuan', item, setPersetujuan),
    updatePersetujuan: (id, item) => updateItem('persetujuan', id, item, setPersetujuan),
    deletePersetujuan: (id) => deleteItem('persetujuan', id, setPersetujuan),

    // Harga Khusus
    addHarga: (item) => createItem('harga', item, setHarga),
    updateHarga: (id, item) => updateItem('harga', id, item, setHarga),
    deleteHarga: (id) => deleteItem('harga', id, setHarga),

    // Profil Perusahaan
    updateProfilPerusahaan: async (item) => {
      try {
        const dbItem = toSnakeCase(item) as Record<string, unknown>;
        if (currentUser) {
          dbItem.updated_by = currentUser.id;
        }

        const { data: existing } = await supabase
          .from('profil_perusahaan')
          .select('id')
          .limit(1)
          .single();

        let result: ProfilPerusahaan;

        if (existing) {
          const { data, error } = await supabase
            .from('profil_perusahaan')
            .update(dbItem)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          result = toCamelCase(data) as ProfilPerusahaan;
        } else {
          const { data, error } = await supabase
            .from('profil_perusahaan')
            .insert(dbItem)
            .select()
            .single();

          if (error) throw error;
          result = toCamelCase(data) as ProfilPerusahaan;
        }


        setProfilPerusahaan(result);
        return result;

      } catch (error) {
        console.error('Error updating company profile:', error);
        throw error;
      }
    },

    // REIMBURSE
    addReimburse: (item) => createItem('reimburse', item, setReimburse),
    updateReimburse: (id, item) => updateItem('reimburse', id, item, setReimburse),
    deleteReimburse: (id) => deleteItem('reimburse', id, setReimburse),

    // PETTY CASH
    addPettyCash: async (item) => {
      try {
        // Calculate new balance
        const isExpenses = item.jenis === 'pengeluaran';
        const amount = item.jumlah || 0;
        const newBalance = isExpenses
          ? pettyCashBalance - amount
          : pettyCashBalance + amount;

        const newItemData = { ...item, saldo_akhir: newBalance };
        const newItem = await createItem('petty_cash', newItemData, setPettyCash);

        // Start sync of balance immediately
        setPettyCashBalance(newBalance);
        return newItem;
      } catch (e) {
        console.error("Failed add petty cash", e);
        throw e;
      }
    },
    updatePettyCash: (id, item) => updateItem('petty_cash', id, item, setPettyCash),
    deletePettyCash: (id) => deleteItem('petty_cash', id, setPettyCash),

    // Stok Pengguna
    addStokPengguna: async (item) => {
      try {
        const dbItem = toSnakeCase(item) as Record<string, unknown>;
        // Perform an upsert that will ignore if there's an exact race condition insert,
        // or overwrite it. In our case, useApprovalAction calculates the full new sum
        // so overwriting with the calculated sum is correct.
        const { data, error } = await supabase
          .from('stok_pengguna')
          .upsert(dbItem, { onConflict: 'user_id,barang_id' })
          .select()
          .single();

        if (error) throw error;
        const inserted = toCamelCase(data) as StokPengguna;
        setStokPengguna(prev => {
          const exists = prev.some(p => p.id === inserted.id);
          return exists ? prev.map(p => p.id === inserted.id ? inserted : p) : [...prev, inserted];
        });
        return inserted;
      } catch (error) {
        console.error('Error adding/upserting stok_pengguna:', error);
        throw error;
      }
    },
    updateStokPengguna: (id, item) => updateItem('stok_pengguna', id, item, setStokPengguna),
    deleteStokPengguna: (id) => deleteItem('stok_pengguna', id, setStokPengguna),

    // Promo
    addPromo: (item) => createItem('promo', item, setPromo),
    updatePromo: (id, item) => updateItem('promo', id, item, setPromo),
    deletePromo: (id) => deleteItem('promo', id, setPromo),

    // Mutasi
    addMutasiBarang: (item) => createItem('mutasi_barang', item, setMutasiBarang),
    updateMutasiBarang: (id, item) => updateItem('mutasi_barang', id, item, setMutasiBarang),
    deleteMutasiBarang: (id) => deleteItem('mutasi_barang', id, setMutasiBarang),

    // Saldo
    addSaldoPengguna: (item) => createItem('saldo_pengguna', item, setSaldoPengguna),
    updateSaldoPengguna: (id, item) => updateItem('saldo_pengguna', id, item, setSaldoPengguna),
    deleteSaldoPengguna: (id) => deleteItem('saldo_pengguna', id, setSaldoPengguna),

    // NEW METHODS ADDED FOR MISSING PROPERTIES IN CONTEXT
    // Penyesuaian Stok
    addPenyesuaianStok: (item) => createItem('penyesuaian_stok', item, setPenyesuaianStok),
    updatePenyesuaianStok: (id, item) => updateItem('penyesuaian_stok', id, item, setPenyesuaianStok),
    deletePenyesuaianStok: (id) => deleteItem('penyesuaian_stok', id, setPenyesuaianStok),

    // Permintaan Barang
    addPermintaanBarang: (item) => createItem('permintaan_barang', item, setPermintaanBarang),
    updatePermintaanBarang: (id, item) => updateItem('permintaan_barang', id, item, setPermintaanBarang),
    deletePermintaanBarang: (id) => deleteItem('permintaan_barang', id, setPermintaanBarang),

    // Pembayaran Penjualan
    addPembayaranPenjualan: async (item) => {
      const newItem = await createItem<PembayaranPenjualan>('pembayaran_penjualan', item, () => { });
      // Optionally refresh penjualan to update payment status
      await loadAllData(true);
      return newItem;
    },

    // Kunjungan
    addKunjungan: (item) => createItem('kunjungan', item, setKunjungan),
    updateKunjungan: (id, item) => updateItem('kunjungan', id, item, setKunjungan),
    deleteKunjungan: (id) => deleteItem('kunjungan', id, setKunjungan),

    // Riwayat Pelanggan
    addRiwayatPelanggan: (item) => createItem('riwayat_pelanggan', item, setRiwayatPelanggan),
    updateRiwayatPelanggan: (id, item) => updateItem('riwayat_pelanggan', id, item, setRiwayatPelanggan),
    deleteRiwayatPelanggan: (id) => deleteItem('riwayat_pelanggan', id, setRiwayatPelanggan),

    // Restock
    addRestock: (item) => createItem('restock', item, setRestock),
    updateRestock: (id, item) => updateItem('restock', id, item, setRestock),
    deleteRestock: (id) => deleteItem('restock', id, setRestock),

    // Sales Target
    targets,
    addTarget: (item) => createItem('sales_targets', item, setTargets),
    updateTarget: (id, item) => updateItem('sales_targets', id, item, setTargets),
    deleteTarget: (id) => deleteItem('sales_targets', id, setTargets),

    // Merge Pelanggan
    mergePelanggan: async (targetId: string, sourceId: string) => {
      try {
        setIsLoading(true);

        // 1. Update Penjualan
        const { error: err1 } = await supabase
          .from('penjualan')
          .update({ pelanggan_id: targetId })
          .eq('pelanggan_id', sourceId);
        if (err1) throw err1;

        // 2. Update Kunjungan
        const { error: err2 } = await supabase
          .from('kunjungan')
          .update({ pelanggan_id: targetId })
          .eq('pelanggan_id', sourceId);
        if (err2) throw err2;

        // 3. Update Riwayat Pelanggan
        const { error: err3 } = await supabase
          .from('riwayat_pelanggan')
          .update({ pelanggan_id: targetId })
          .eq('pelanggan_id', sourceId);
        if (err3) throw err3;

        // 4. Update Target Pelanggan (Merge debt/credits)
        const target = pelanggan.find(p => p.id === targetId);
        const source = pelanggan.find(p => p.id === sourceId);

        if (target && source) {
          const newSisaKredit = (target.sisaKredit || 0) + (source.sisaKredit || 0);
          const { error: err4 } = await supabase
            .from('pelanggan')
            .update({ sisa_kredit: newSisaKredit })
            .eq('id', targetId);
          if (err4) throw err4;
        }

        // 5. Delete Source Pelanggan
        const { error: err5 } = await supabase
          .from('pelanggan')
          .delete()
          .eq('id', sourceId);
        if (err5) throw err5;


        toast.success('Pelanggan berhasil disatukan');
        await loadAllData(true);
      } catch (error) {
        console.error('Error merging pelanggan:', error);
        toast.error('Gagal menyatukan data pelanggan');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
  }), [
    absensi,
    area,
    barang,
    cabang,
    createItem,
    currentUser,
    dbMode,
    deleteItem,
    harga,
    isAdminOrOwner,
    isInitialized,
    isLoading,
    isOnline,
    isRefreshing,
    kategori,
    kategoriPelanggan,
    kunjungan,
    loadAllData,
    mutasiBarang,
    notifikasi,
    pelanggan,
    penjualan,
    penyesuaianStok,
    permintaanBarang,
    persetujuan,
    pettyCash,
    pettyCashBalance,
    profilPerusahaan,
    promo,
    rekeningBank,
    reimburse,
    restock,
    riwayatPelanggan,
    saldoPengguna,
    satuan,
    setoran,
    stokHarian,
    stokLog,
    stokPengguna,
    targets,
    pembayaranPenjualan,
    userLocations,
    pushSubscriptions,
    salesTargetHistory,
    stokSnapshot,
    updateItem,
    users,
    viewMode,
  ]);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
