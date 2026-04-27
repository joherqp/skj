'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, User, Activity, Users, ShoppingCart, Crosshair, Wallet, LogIn, LogOut, Map as MapIcon, Package, Store, PlusCircle, Home, TrendingUp, Coins, Target, CheckCircle, CheckCircle2, ListFilter, Building, Navigation, RotateCcw, Search, AlertTriangle } from 'lucide-react';
import { formatTanggal, formatWaktu, formatRupiah } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';
import { SalesRouteMap } from '@/components/features/components/SalesRouteMap';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay } from "date-fns";
import { Absensi, Pelanggan, Penjualan } from '@/types';

import dynamic from 'next/dynamic';
const MonitoringMapWrapper = dynamic(() => import('./MonitoringMap').then(mod => mod.MonitoringMapWrapper), { ssr: false, loading: () => <div className="h-full w-full bg-muted flex items-center justify-center">Loading Maps...</div> });

import { stringToColor, getDistance } from '@/lib/mapUtils';
import { MapMode, MapMarker, UserLocation, DynamicActivityData, ActivityItem } from './types';





import { Button } from "@/components/ui/button";
import { ExternalLink, Info, Filter, ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



export default function Monitoring() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const {
        users, absensi, cabang: listCabang, pelanggan: listPelanggan, penjualan, setoran, mutasiBarang,
        barang: listBarang, stokPengguna: listStokPengguna, targets: listTargets, kunjungan: listKunjungan, viewMode, kategoriPelanggan, profilPerusahaan, deletePelanggan, refresh
    } = useDatabase();

    const [mapMode, setMapMode] = useState<MapMode>('pelanggan');
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -6.2088, lng: 106.8456 });
    const [selectedCabang, setSelectedCabang] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
    const [colorIndicator, setColorIndicator] = useState<'pengguna' | 'cabang' | 'kategori'>('kategori');
    const [duplicateThreshold, setDuplicateThreshold] = useState(15); // Default 15 meters
    const [duplicateSearch, setDuplicateSearch] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [showNames, setShowNames] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Infinite Scroll States
    const [historyLimit, setHistoryLimit] = useState(10);
    const [sessionLimit, setSessionLimit] = useState(10);

    // Tab State Management
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'explore';

    // Search input states maintained for UI only
    const [mapSearchInput, setMapSearchInput] = useState('');
    const mapSearchRef = useRef<HTMLInputElement>(null);

    // Provide a search mechanism via marker titles or OpenStreetMap Nominatim
    const handleSearchMap = async () => {
        if (!mapSearchInput.trim()) return;

        // First, search in current markers
        const searchLower = mapSearchInput.toLowerCase().trim();
        const localMatch = markers.find(m => 
            m.title.toLowerCase().includes(searchLower) || 
            (m.userName && m.userName.toLowerCase().includes(searchLower)) ||
            (m.detail && m.detail.toLowerCase().includes(searchLower))
        );

        if (localMatch) {
            setMapCenter(localMatch.position);
            setSelectedMarker(localMatch);
            return;
        }

        // Fallback to OpenStreetMap
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchInput)}&countrycodes=id`);
            const data = await res.json();
            if (data && data.length > 0) {
                setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCenterOnMe = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            });
        }
    };

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`?${params.toString()}`);
    };

    // --- ROUTE OPTIMIZATION STATE ---
    const [selectedRouteCustomers, setSelectedRouteCustomers] = useState<Pelanggan[]>([]);
    const toggleCustomerForRoute = (p: Pelanggan) => {
        setSelectedRouteCustomers(prev =>
            prev.find(c => c.id === p.id)
                ? prev.filter(c => c.id !== p.id)
                : [...prev, p]
        );
    };

    // --- SESSION LOGIN TAB LOGIC ---
    const [sessionLocations, setSessionLocations] = useState<UserLocation[]>([]);
    const [selectedSessionUsers, setSelectedSessionUsers] = useState<string[]>([]); // Changed to array for multi-select

    // Helper to filter items based on viewMode
    const filterByViewMode = useCallback(<T extends { userId?: string; salesId?: string; createdBy?: string; id: string }>(items: T[]) => {
        if (viewMode === 'me') {
            return items.filter(item =>
                (item.userId && item.userId === currentUser?.id) ||
                (item.salesId && item.salesId === currentUser?.id) ||
                (item.createdBy && item.createdBy === currentUser?.id) ||
                (item.id === currentUser?.id) // For user-specific items like activeUsers
            );
        }
        return items;
    }, [viewMode, currentUser]);

    // Calculate Team Markers
    const teamMarkers = useMemo(() => {
        const filteredAbsensi = absensi.filter(a => {
            if (!dateRange?.from) return true;
            const d = new Date(a.tanggal);
            const start = startOfDay(dateRange.from);
            const end = endOfDay(dateRange.to || dateRange.from);
            return d >= start && d <= end;
        });

        const userLatestAbsensi = new Map<string, Absensi>();
        filterByViewMode<Absensi>(filteredAbsensi).forEach(a => { // Apply viewMode filter here
            if (a.lokasiCheckIn?.latitude && a.lokasiCheckIn?.longitude) {
                const existing = userLatestAbsensi.get(a.userId);
                if (!existing || new Date(a.checkIn || a.tanggal) > new Date(existing.checkIn || existing.tanggal)) {
                    userLatestAbsensi.set(a.userId, a);
                }
            }
        });

        return Array.from(userLatestAbsensi.values()).map(record => {
            const u = users.find(u => u.id === record.userId);
            if (!u) return null;
            if (selectedCabang.length > 0 && (!u.cabangId || !selectedCabang.includes(u.cabangId))) return null;
            if (selectedUser.length > 0 && !selectedUser.includes(u.id)) return null;

            let color = stringToColor(u.id);
            let userName = u.nama;
            if (colorIndicator === 'cabang') {
                const cbg = listCabang.find(c => c.id === u.cabangId);
                color = cbg ? stringToColor(cbg.id) : stringToColor(u.id);
                userName = cbg ? cbg.nama : u.nama;
            }

            return {
                id: record.id,
                position: { lat: record.lokasiCheckIn!.latitude, lng: record.lokasiCheckIn!.longitude },
                title: u.nama,
                subtitle: `Check-in: ${formatWaktu(new Date(record.checkIn || record.tanggal))}`,
                type: 'team',
                detail: u.roles.join(', '),
                color,
                data: { ...u, absensi: record },
                userName
            };
        }).filter(Boolean) as MapMarker[];
    }, [dateRange, absensi, users, filterByViewMode, selectedCabang, selectedUser, colorIndicator, listCabang]);

    // Calculate Customer Markers
    const customerMarkers = useMemo(() => {
        return filterByViewMode<Pelanggan>(listPelanggan).filter(p => { // Apply viewMode filter here
            if (dateRange?.from) {
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to || dateRange.from);
                const created = new Date(p.createdAt || new Date());
                const updated = new Date(p.updatedAt || new Date());
                const inRange = (created >= start && created <= end) || (updated >= start && updated <= end);
                if (!inRange) return false;
            }

            if (selectedCabang.length > 0 && (!p.cabangId || !selectedCabang.includes(p.cabangId))) return false;
            if (selectedUser.length > 0 && (!p.salesId || !selectedUser.includes(p.salesId))) return false;

            return p.lokasi?.latitude && p.lokasi?.longitude;
        }).map(p => {
            const sales = users.find(u => u.id === p.salesId);
            const cabang = listCabang.find(c => c.id === p.cabangId);
            const kategori = kategoriPelanggan.find(k => k.id === p.kategoriId);

            let color = stringToColor(p.id);
            let userName = p.nama;

            if (colorIndicator === 'pengguna' && sales) {
                color = stringToColor(sales.id);
                userName = sales.nama;
            } else if (colorIndicator === 'cabang' && cabang) {
                color = stringToColor(cabang.id);
                userName = cabang.nama;
            } else if (colorIndicator === 'kategori' && kategori) {
                color = stringToColor(kategori.id);
                userName = kategori.nama;
            } else if (colorIndicator === 'pengguna') {
                userName = 'Umum (Tanpa Sales)';
            } else if (colorIndicator === 'cabang') {
                userName = 'Umum (Tanpa Cabang)';
            } else if (colorIndicator === 'kategori') {
                userName = 'Umum (Tanpa Kategori)';
            }

            return {
                id: p.id,
                position: { lat: p.lokasi!.latitude, lng: p.lokasi!.longitude },
                title: p.nama,
                subtitle: p.telepon,
                type: 'customer',
                detail: `${p.alamat} (Sales: ${sales?.nama || '-'} | Cabang: ${cabang?.nama || '-'})`,
                color,
                data: p,
                userName
            };
        }) as MapMarker[];
    }, [dateRange, listPelanggan, users, filterByViewMode, selectedCabang, selectedUser, colorIndicator, listCabang, kategoriPelanggan]);

    // Calculate Transaction Markers
    const transactionMarkers = useMemo(() => {
        return filterByViewMode<Penjualan>(penjualan).filter(p => { // Apply viewMode filter here
            if (dateRange?.from) {
                const start = startOfDay(dateRange.from);
                const end = endOfDay(dateRange.to || dateRange.from);
                const d = new Date(p.tanggal);
                if (d < start || d > end) return false;
            }

            const saleUser = users.find(u => u.id === p.salesId);
            if (selectedCabang.length > 0) {
                if (!saleUser?.cabangId || !selectedCabang.includes(saleUser.cabangId)) return false;
            }
            if (selectedUser.length > 0 && (!p.salesId || !selectedUser.includes(p.salesId))) return false;
            return p.lokasi?.latitude && p.lokasi?.longitude;
        }).map(p => {
            const cust = listPelanggan.find(c => c.id === p.pelangganId);
            const sales = users.find(u => u.id === p.salesId);
            const cabang = listCabang.find(c => c.id === sales?.cabangId);
            const kategori = kategoriPelanggan.find(k => k.id === cust?.kategoriId);

            let color = sales ? stringToColor(sales.id) : undefined;
            let userName = sales?.nama || 'Umum';

            if (colorIndicator === 'cabang') {
                color = cabang ? stringToColor(cabang.id) : undefined;
                userName = cabang?.nama || 'Umum';
            } else if (colorIndicator === 'kategori') {
                color = kategori ? stringToColor(kategori.id) : undefined;
                userName = kategori?.nama || 'Umum';
            }

            return {
                id: p.id,
                position: { lat: p.lokasi!.latitude, lng: p.lokasi!.longitude },
                title: cust?.nama || 'Umum',
                subtitle: `${sales?.nama || '-'} • ${formatRupiah(p.total)}`,
                type: 'transaction',
                detail: `Nota: ${p.nomorNota}`,
                color,
                data: p,
                userName
            };
        }) as MapMarker[];
    }, [dateRange, penjualan, listPelanggan, users, filterByViewMode, selectedCabang, selectedUser, colorIndicator, listCabang, kategoriPelanggan]);

    // --- HELPER FOR STRING SIMILARITY ---
    const calculateSimilarity = (str1: string, str2: string): number => {
        const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
        const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (s1 === s2) return 100;
        if (s1.includes(s2) || s2.includes(s1)) return 85;

        // Simple Levenshtein distance
        const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
        for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
        for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator
                );
            }
        }
        const distance = track[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);
        return Math.round(((maxLength - distance) / maxLength) * 100);
    };

    // Combine Markers based on Map Mode and View Mode
    // --- DOUBLE STORE DETECTION LOGIC ---
    const duplicateGroups = useMemo(() => {
        if (customerMarkers.length === 0) return [];

        const customersWithLocation = customerMarkers.filter(m => m.type === 'customer');

        const groups: MapMarker[][] = [];
        const visited = new Set<string>();

        customersWithLocation.forEach(m => {
            if (visited.has(m.id)) return;

            const currentGroup: MapMarker[] = [];
            const queue = [m];
            visited.add(m.id);

            while (queue.length > 0) {
                const current = queue.shift()!;
                currentGroup.push(current);

                customersWithLocation.forEach(other => {
                    if (visited.has(other.id)) return;
                    const dist = getDistance(
                        current.position.lat,
                        current.position.lng,
                        other.position.lat,
                        other.position.lng
                    );

                    if (dist <= duplicateThreshold) {
                        visited.add(other.id);
                        queue.push(other);
                    }
                });
            }

            if (currentGroup.length > 1) {
                groups.push(currentGroup);
            }
        });

        return groups;
    }, [customerMarkers, duplicateThreshold]);

    const duplicateMarkerIds = useMemo(() => {
        return new Set(duplicateGroups.flatMap(g => g.map(m => m.id)));
    }, [duplicateGroups]);


    const filteredDuplicateGroups = useMemo(() => {
        const groups = duplicateGroups.map(group => {
            const markersWithSimilarity = group.map((m, idx) => {
                if (idx === 0) return { ...m, similarity: 100 };
                const score = calculateSimilarity(group[0].title, m.title);
                return { ...m, similarity: score };
            });

            const maxSimilarity = Math.max(...markersWithSimilarity.map(m => (m as any).similarity || 0));

            return {
                markers: markersWithSimilarity,
                maxSimilarity
            };
        });

        if (!duplicateSearch.trim()) return groups;

        return groups.filter(group =>
            group.markers.some(m =>
                m.title.toLowerCase().includes(duplicateSearch.toLowerCase())
            )
        );
    }, [duplicateGroups, duplicateSearch]);

    // Combine Markers based on Map Mode and View Mode
    const markers = useMemo(() => {
        let result: MapMarker[] = [];

        if (mapMode === 'team') result = teamMarkers;
        if (mapMode === 'pelanggan') result = customerMarkers;
        if (mapMode === 'transaksi') result = transactionMarkers;

        // Mark duplicates in the final markers list for the map to highlight
        if (mapMode === 'pelanggan') {
            return result.map(m => ({
                ...m,
                isDuplicate: duplicateMarkerIds.has(m.id)
            }));
        }

        return result;
    }, [mapMode, teamMarkers, customerMarkers, transactionMarkers, duplicateMarkerIds]);


    // --- EXISTING LOGIC FOR OTHER TABS ---
    // Get today's check-ins
    const today = new Date();
    const todayStr = today.toDateString();
    const todayAbsensi = absensi.filter(a => new Date(a.tanggal).toDateString() === todayStr);

    // Filter Users based on Role and ViewMode
    const activeUsers = useMemo(() => {
        const filteredUsers = users.filter(u => {
            // 1. Must be active
            if (!u.isActive) return false;
            // 2. Must be relevant roles (Keep Sales & Leader for monitoring)
            if (!(u.roles.includes('sales') || u.roles.includes('leader'))) return false;

            // 3. Permission Check
            // If Admin/Owner/Finance/Manager -> See All
            if (currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner') || currentUser?.roles.includes('finance') || currentUser?.roles.includes('manager')) {
                return true;
            }
            // If Leader -> See only their branch
            if (currentUser?.roles.includes('leader')) {
                return u.cabangId === currentUser.cabangId;
            }
            // If Sales -> See ONLY themselves
            return u.id === currentUser?.id;
        });

        // Apply viewMode filter
        return filterByViewMode(filteredUsers);
    }, [users, filterByViewMode, currentUser]);



    // Fetch User Locations for Session Tab
    useEffect(() => {
        const fetchLocations = async () => {
            if (!currentUser) return;
            // Only Admin/Owner can see all sessions, others only their own
            if (!currentUser.roles.some(r => (['admin', 'owner'] as string[]).includes(r)) && viewMode !== 'me') return;

            let query = supabase
                .from('user_locations')
                .select(`
                  id,
                  latitude,
                  longitude,
                  timestamp,
                  users ( id, nama, roles, cabang_id )
              `)
                .order('timestamp', { ascending: false })
                .limit(100); // Batasi query untuk mencegah performa lemot di tab Tracking

            // Filter Date (Same as global dateRange)
            if (dateRange?.from) {
                const start = startOfDay(dateRange.from).toISOString();
                const end = endOfDay(dateRange.to || dateRange.from).toISOString();
                query = query.gte('timestamp', start).lte('timestamp', end);
            }

            // Apply viewMode filter for session locations
            if (viewMode === 'me') {
                query = query.eq('user_id', currentUser.id);
            } else if (selectedSessionUsers.length > 0) {
                query = query.in('user_id', selectedSessionUsers);
            }

            const { data, error } = await query;
            if (!error && data) {
                // Normalize data structure handling potential array return for joined relation
                // We define the shape of the returning data manually to avoid 'any'
                type LocationResult = {
                    id: string;
                    latitude: number;
                    longitude: number;
                    timestamp: string;
                    users: { id: string; nama: string; roles: string[]; cabang_id: string } | { id: string; nama: string; roles: string[]; cabang_id: string }[];
                };

                const formattedData = (data as unknown as LocationResult[]).map((d) => ({
                    id: d.id,
                    latitude: d.latitude,
                    longitude: d.longitude,
                    timestamp: d.timestamp,
                    users: Array.isArray(d.users) ? d.users[0] : d.users as { id: string; nama: string; roles: string[]; cabang_id: string }
                }));
                setSessionLocations(formattedData);
            }
        };

        if (activeTab !== 'tracking') return;
        fetchLocations();
    }, [dateRange, selectedSessionUsers, currentUser, viewMode, activeTab]); // Re-fetch on filters change

    const sessionMarkers = useMemo(() => {
        return sessionLocations.map(loc => ({
            id: loc.id,
            position: { lat: loc.latitude, lng: loc.longitude },
            title: loc.users?.nama || 'Unknown',
            subtitle: formatWaktu(new Date(loc.timestamp)),
            type: 'active',
            color: loc.users?.id ? stringToColor(loc.users.id) : undefined, // Unique color per user
            detail: `Time: ${formatWaktu(new Date(loc.timestamp))}`,
            data: loc
        }));
    }, [sessionLocations]);

    // COMBINED TIMELINE LOGIC
    const combinedActivities = useMemo(() => {
        if (!dateRange?.from || activeTab !== 'tracking') return [];
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);

        // 1. Collect all raw activities with common structure


        const items: ActivityItem[] = [];

        // Filter by users and date
        const filteredUserIds = selectedSessionUsers.length > 0
            ? selectedSessionUsers
            : users.map(u => u.id);

        // Location Pings
        sessionLocations.forEach(loc => {
            items.push({
                id: loc.id,
                type: 'ping',
                timestamp: new Date(loc.timestamp),
                userId: loc.users?.id || '',
                userName: loc.users?.nama || 'Unknown',
                title: 'Lokasi Ping',
                description: `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`,
                lat: loc.latitude,
                lng: loc.longitude,
                data: loc,
                color: loc.users?.id ? stringToColor(loc.users.id) : undefined
            });
        });

        // Attendance
        absensi.filter(a => {
            const d = new Date(a.tanggal);
            return d >= start && d <= end && filteredUserIds.includes(a.userId);
        }).forEach(a => {
            const u = users.find(u => u.id === a.userId);
            if (a.checkIn) {
                items.push({
                    id: `${a.id}-in`,
                    type: 'checkin',
                    timestamp: new Date(a.checkIn),
                    userId: a.userId,
                    userName: u?.nama || 'Unknown',
                    title: 'Absen Masuk',
                    description: a.lokasiCheckIn?.alamat || 'Check-in Absensi',
                    lat: a.lokasiCheckIn?.latitude,
                    lng: a.lokasiCheckIn?.longitude,
                    data: a
                });
            }
            if (a.checkOut) {
                items.push({
                    id: `${a.id}-out`,
                    type: 'checkout',
                    timestamp: new Date(a.checkOut),
                    userId: a.userId,
                    userName: u?.nama || 'Unknown',
                    title: 'Absen Pulang',
                    description: a.lokasiCheckOut?.alamat || 'Check-out Absensi',
                    lat: a.lokasiCheckOut?.latitude,
                    lng: a.lokasiCheckOut?.longitude,
                    data: a
                });
            }
        });

        // Sales
        penjualan.filter(p => {
            const d = new Date(p.tanggal);
            return d >= start && d <= end && filteredUserIds.includes(p.salesId);
        }).forEach(p => {
            const u = users.find(u => u.id === p.salesId);
            const c = listPelanggan.find(cust => cust.id === p.pelangganId);
            items.push({
                id: p.id,
                type: 'sales',
                timestamp: new Date(p.tanggal),
                userId: p.salesId,
                userName: u?.nama || 'Unknown',
                title: `Penjualan: ${c?.nama || 'Umum'}`,
                description: `Nota: ${p.nomorNota} • ${formatRupiah(p.total)}`,
                lat: p.lokasi?.latitude,
                lng: p.lokasi?.longitude,
                data: p
            });
        });

        // Deposits
        setoran.filter(s => {
            const d = new Date(s.tanggal);
            return d >= start && d <= end && filteredUserIds.includes(s.salesId);
        }).forEach(s => {
            const u = users.find(u => u.id === s.salesId);
            items.push({
                id: s.id,
                type: 'deposit',
                timestamp: new Date(s.tanggal),
                userId: s.salesId,
                userName: u?.nama || 'Unknown',
                title: 'Setoran Uang',
                description: `${formatRupiah(s.jumlah)} • ${s.status.toUpperCase()}`,
                data: s
            });
        });

        // NOO (New Open Outlet / Toko Baru)
        listPelanggan.filter(p => {
            const d = new Date(p.createdAt);
            return d >= start && d <= end && filteredUserIds.includes(p.salesId);
        }).forEach(p => {
            const u = users.find(u => u.id === p.salesId);
            items.push({
                id: `noo-${p.id}`,
                type: 'noo',
                timestamp: new Date(p.createdAt),
                userId: p.salesId,
                userName: u?.nama || 'Unknown',
                title: 'Toko Baru (NOO)',
                description: `Mendaftarkan toko: ${p.nama}`,
                lat: p.lokasi?.latitude,
                lng: p.lokasi?.longitude,
                data: p
            });
        });

        // Terima Barang (Mutasi)
        mutasiBarang.filter(m => {
            const d = new Date(m.tanggal);
            // We show mutation if the user belongs to the target branch or is the one who created it (using createdAt.createdBy)
            // For now, let's simplify and show all relevant to date if admin/owner, or filter by branch
            const isRelevant = currentUser?.roles.some(r => ['admin', 'owner'].includes(r)) ||
                (m.keCabangId === currentUser?.cabangId) ||
                (m.dariCabangId === currentUser?.cabangId);

            return d >= start && d <= end && isRelevant;
        }).forEach(m => {
            const targetCabang = listCabang.find(c => c.id === m.keCabangId);
            items.push({
                id: `mut-${m.id}`,
                type: 'receive',
                timestamp: new Date(m.tanggal),
                userId: 'SYSTEM', // Not tracked by specific user in the same way
                userName: 'Gudang/Logistik',
                title: `Mutasi Barang: ${m.nomorMutasi}`,
                description: `${m.status.toUpperCase()} • Ke: ${targetCabang?.nama || 'N/A'}`,
                data: m
            });
        });

        // 2. Sort all by timestamp descending
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // 3. Process Grouping (Spatial & Temporal)
        // Group pings into "stay" if consecutive and within 100m
        const processed: ActivityItem[] = [];
        let currentStay: ActivityItem | null = null;

        // Process from oldest to newest for grouping logic, then reverse back
        const chronological = [...items].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        chronological.forEach((item) => {
            if (item.type !== 'ping') {
                if (currentStay) {
                    processed.push(currentStay);
                    currentStay = null;
                }
                processed.push(item);
                return;
            }

            // It's a ping
            if (!currentStay) {
                currentStay = { ...item, type: 'stay', duration: 0, title: 'Menetap di Lokasi' };
                return;
            }

            // Compare with current Stay
            const dist = getDistance(currentStay.lat!, currentStay.lng!, item.lat!, item.lng!);
            const timeDiff = differenceInMinutes(item.timestamp, currentStay.timestamp);

            if (dist < 100 && timeDiff < 60) { // Same place within 100m and last ping was < 1hr ago
                const d = currentStay.data as DynamicActivityData;
                currentStay.duration = differenceInMinutes(item.timestamp, d.start || currentStay.timestamp);
                d.end = item.timestamp;
                if (!d.start) d.start = currentStay.timestamp;

                // CHECK FOR NEARBY CABANG (Basecamp Detection)
                const nearbyCabang = listCabang.find(c => {
                    if (!c.koordinat) return false;
                    const [lat, lng] = c.koordinat.split(',').map(s => parseFloat(s.trim()));
                    if (isNaN(lat) || isNaN(lng)) return false;
                    return getDistance(item.lat!, item.lng!, lat, lng) < 100;
                });

                // CHECK FOR HOME (Home Detection for self or colleagues)
                const nearbyUserHome = users.find(u => {
                    if (!u.koordinat) return false;
                    let hLat: number | undefined;
                    let hLng: number | undefined;

                    if (typeof u.koordinat === 'string') {
                        const [lat, lng] = u.koordinat.split(',').map(s => parseFloat(s.trim()));
                        if (!isNaN(lat) && !isNaN(lng)) {
                            hLat = lat;
                            hLng = lng;
                        }
                    } else {
                        hLat = u.koordinat.latitude || u.koordinat.lat;
                        hLng = u.koordinat.longitude || u.koordinat.lng;
                    }
                    if (hLat === undefined || hLng === undefined) return false;
                    return getDistance(item.lat!, item.lng!, hLat, hLng) < 100;
                });

                const isHome = !!nearbyUserHome;
                const isOwnHome = nearbyUserHome?.id === item.userId;

                // CHECK FOR NEARBY CUSTOMER (Proximity/Visit Detection)
                const nearbyCustomer = listPelanggan.find(p => {
                    if (!p.lokasi) return false;
                    return getDistance(item.lat!, item.lng!, p.lokasi.latitude, p.lokasi.longitude) < 100;
                });

                if (isHome) {
                    currentStay.type = 'visit';
                    currentStay.title = `Rumah: ${nearbyUserHome?.nama}`;
                    currentStay.description = isOwnHome
                        ? `Berada di rumah sendiri (${currentStay.duration} mnt)`
                        : `Sedang berkunjung ke rumah ${nearbyUserHome?.nama} (${currentStay.duration} mnt)`;
                    const d = currentStay.data as DynamicActivityData;
                    d.isHome = true;
                    d.ownerName = nearbyUserHome?.nama;
                } else if (nearbyCabang) {
                    currentStay.type = 'visit';
                    currentStay.title = `Basecamp: ${nearbyCabang.nama}`;
                    currentStay.description = `Berada di Basecamp ${nearbyCabang.nama} (${currentStay.duration} mnt)`;
                } else if (nearbyCustomer) {
                    currentStay.type = 'visit';
                    currentStay.title = `Kunjungan: ${nearbyCustomer.nama}`;
                    currentStay.description = `Sedang berkunjung di ${nearbyCustomer.nama} (${currentStay.duration} mnt)`;
                } else {
                    currentStay.description = `Menetap selama ${currentStay.duration} menit`;
                }
            } else {
                // Moved or too long ago
                processed.push(currentStay);
                currentStay = { ...item, type: 'stay', duration: 0, title: 'Menetap di Lokasi' };
            }
        });

        if (currentStay) processed.push(currentStay);

        // Filter out very short stays (pings) if they are just single pings but keep them if they are meaningful
        // Or just return everything sorted
        return processed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [sessionLocations, absensi, penjualan, setoran, mutasiBarang, dateRange, selectedSessionUsers, users, listPelanggan, listCabang, currentUser?.roles, currentUser?.cabangId, activeTab]);


    return (
        <div className="animate-in fade-in duration-500">
            <div className="p-4 space-y-4">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="w-full grid grid-cols-5 h-auto p-1">
                        <TabsTrigger value="explore" className="text-xs md:text-sm py-2">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Jelajahi
                        </TabsTrigger>
                        <TabsTrigger value="double-toko" className="text-xs md:text-sm py-2 relative">
                            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Indikasi
                            {duplicateGroups.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            )}
                        </TabsTrigger>
                        {currentUser?.roles.some(r => (['admin', 'owner'] as string[]).includes(r)) && (
                            <TabsTrigger value="tracking" className="text-xs md:text-sm py-2">
                                <Activity className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                Tracking
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="history" className="text-xs md:text-sm py-2">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Riwayat
                        </TabsTrigger>
                        <TabsTrigger value="route" className="text-xs md:text-sm py-2">
                            <Navigation className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Rute Sales
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="explore" className="mt-4 space-y-4">
                        {/* Quick Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {mapMode === 'team' && (
                                <>
                                    <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mb-1">Total Tim ({selectedCabang.length > 0 ? `${selectedCabang.length} Cabang` : 'Semua'})</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-blue-700">{users.filter(u => (selectedCabang.length === 0 || (u.cabangId && selectedCabang.includes(u.cabangId))) && (selectedUser.length === 0 || selectedUser.includes(u.id))).length}</h4>
                                                <Users className="w-4 h-4 text-blue-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Aktif Sekarang</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-green-700">{activeUsers.filter(u => todayAbsensi.some(a => a.userId === u.id && !a.checkOut)).length}</h4>
                                                <Activity className="w-4 h-4 text-green-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-200/50 col-span-2 md:col-span-1">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mb-1">Selesai/Pulang</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-orange-700">{todayAbsensi.filter(a => !!a.checkOut).length}</h4>
                                                <CheckCircle className="w-4 h-4 text-orange-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}

                            {mapMode === 'pelanggan' && (
                                <>
                                    <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-1">Titik Pelanggan</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-emerald-700">{markers.length}</h4>
                                                <Target className="w-4 h-4 text-emerald-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-cyan-600 font-semibold uppercase tracking-wider mb-1">Total Terdata</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-cyan-700">{listPelanggan.length}</h4>
                                                <ListFilter className="w-4 h-4 text-cyan-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/50 col-span-2 md:col-span-1">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mb-1">Cakupan Wilayah</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-indigo-700">{new Set(listPelanggan.map(p => p.cabangId)).size} Cabang</h4>
                                                <MapPin className="w-4 h-4 text-indigo-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}

                            {mapMode === 'transaksi' && (
                                <>
                                    <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-1">Total Penjualan</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-red-700">{formatRupiah(markers.reduce((sum, m) => sum + ((m.data as { total: number })?.total || 0), 0))}</h4>
                                                <Coins className="w-4 h-4 text-red-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border-orange-200/50">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mb-1">Volume Nota</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-orange-700">{markers.length} Nota</h4>
                                                <ShoppingCart className="w-4 h-4 text-orange-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/50 col-span-2 md:col-span-1">
                                        <CardContent className="p-3">
                                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-1">Rerata Transaksi</p>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xl font-bold text-amber-700">
                                                    {formatRupiah(markers.length > 0 ? markers.reduce((sum, m) => sum + ((m.data as { total: number })?.total || 0), 0) / markers.length : 0)}
                                                </h4>
                                                <TrendingUp className="w-4 h-4 text-amber-400" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>

                        {/* High Visibility Warning Banner */}
                        {duplicateGroups.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-red-800">Perhatian: Potensi Double Toko Terdeteksi!</h4>
                                        <p className="text-xs text-red-600">Ditemukan {duplicateGroups.length} grup lokasi pelanggan yang saling berdekatan (di bawah {duplicateThreshold}m).</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4"
                                    onClick={() => {
                                        handleTabChange('double-toko');
                                        setTimeout(() => {
                                            const element = document.getElementById('duplicate-monitoring-card');
                                            element?.scrollIntoView({ behavior: 'smooth' });
                                        }, 300);
                                    }}
                                >
                                    Periksa Sekarang
                                </Button>
                            </div>
                        )}

                        {/* Map Controls */}
                        <div className="flex flex-col md:flex-row gap-2 p-2 bg-muted/40 rounded-xl border">
                            {(currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner') || currentUser?.roles.includes('finance')) && (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full md:w-[200px] h-9 text-xs justify-between bg-background font-normal px-3">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="truncate">
                                                        {selectedCabang.length === 0
                                                            ? "Semua Cabang"
                                                            : `${selectedCabang.length} Cabang`}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                                            <DropdownMenuLabel>Pilih Cabang</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={selectedCabang.length === 0}
                                                onCheckedChange={() => setSelectedCabang([])}
                                            >
                                                Semua Cabang
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {listCabang.map(cabang => (
                                                <DropdownMenuCheckboxItem
                                                    key={cabang.id}
                                                    checked={selectedCabang.includes(cabang.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedCabang([...selectedCabang, cabang.id]);
                                                        } else {
                                                            setSelectedCabang(selectedCabang.filter(id => id !== cabang.id));
                                                        }
                                                    }}
                                                >
                                                    {cabang.nama}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full md:w-[200px] h-9 text-xs justify-between bg-background font-normal px-3">
                                                <div className="flex items-center gap-2 truncate">
                                                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="truncate">
                                                        {selectedUser.length === 0
                                                            ? "Semua Tim"
                                                            : `${selectedUser.length} Tim`}
                                                    </span>
                                                </div>
                                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                                            <DropdownMenuLabel>Pilih Tim</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuCheckboxItem
                                                checked={selectedUser.length === 0}
                                                onCheckedChange={() => setSelectedUser([])}
                                            >
                                                Semua Tim
                                            </DropdownMenuCheckboxItem>
                                            <DropdownMenuSeparator />
                                            {users
                                                .filter(u => selectedCabang.length === 0 || (u.cabangId && selectedCabang.includes(u.cabangId)))
                                                .map(user => (
                                                    <DropdownMenuCheckboxItem
                                                        key={user.id}
                                                        checked={selectedUser.includes(user.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedUser([...selectedUser, user.id]);
                                                            } else {
                                                                setSelectedUser(selectedUser.filter(id => id !== user.id));
                                                            }
                                                        }}
                                                    >
                                                        {user.nama}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}

                            <Select value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                                <SelectTrigger className="w-full md:w-[160px] h-9 text-xs bg-background">
                                    <SelectValue placeholder="Pilih Mode Peta" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="team">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-xs">Lokasi Tim</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pelanggan">
                                        <div className="flex items-center justify-between gap-4 w-full">
                                            <div className="flex items-center gap-2">
                                                <Crosshair className="w-3.5 h-3.5 text-green-500" />
                                                <span className="text-xs">Lokasi Pelanggan</span>
                                            </div>
                                            {duplicateGroups.length > 0 && (
                                                <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse">
                                                    {duplicateGroups.length}!!
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="transaksi">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="w-3.5 h-3.5 text-red-500" />
                                            <span className="text-xs">Lokasi Transaksi</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={colorIndicator} onValueChange={(v) => setColorIndicator(v as any)}>
                                <SelectTrigger className="w-full md:w-[180px] h-9 text-xs bg-background">
                                    <SelectValue placeholder="Indikator Warna" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pengguna">
                                        <span className="text-xs">Warna: Pengguna</span>
                                    </SelectItem>
                                    <SelectItem value="cabang">
                                        <span className="text-xs">Warna: Cabang</span>
                                    </SelectItem>
                                    <SelectItem value="kategori">
                                        <span className="text-xs">Warna: Kategori</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex-1 min-w-0">
                                <DatePickerWithRange
                                    date={dateRange}
                                    setDate={setDateRange}
                                    className="w-full [&>button]:h-9 [&>button]:text-xs [&>button]:bg-background"
                                />
                            </div>
                        </div>

                        {/* Map Container - Main Explore View */}
                        <Card elevated className="overflow-hidden">
                            <CardContent className="p-0 relative h-[400px] md:h-[600px] z-0">
                                <div className="absolute inset-0 z-0 h-full w-full">
                                        <MonitoringMapWrapper
                                            markers={markers}
                                            mapCenter={mapCenter}
                                            setMapCenter={setMapCenter}
                                            selectedMarker={selectedMarker}
                                            setSelectedMarker={setSelectedMarker}
                                            customerMarkers={customerMarkers}
                                            radiusKunjungan={profilPerusahaan.config?.radiusKunjungan || 100}
                                            duplicateThreshold={duplicateThreshold}
                                            duplicateGroups={duplicateGroups}
                                            showNames={showNames}
                                        >
                                        {/* Map Search Bar Overlay */}
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] sm:w-[350px] md:w-[400px] z-[1000] flex gap-1.5">
                                            <div className="relative flex-1 shadow-lg group">
                                                <input
                                                    ref={mapSearchRef}
                                                    type="text"
                                                    placeholder="Cari nama/tempat..."
                                                    value={mapSearchInput}
                                                    onChange={(e) => setMapSearchInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSearchMap();
                                                        }
                                                    }}
                                                    className="w-full h-9 pl-9 pr-3 rounded-lg border bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary text-[13px] shadow-inner transition-all duration-200"
                                                />
                                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    variant={showNames ? "default" : "secondary"}
                                                    size="icon"
                                                    className={`h-9 w-9 shrink-0 shadow-lg backdrop-blur-sm border-0 ${showNames ? 'bg-primary text-white' : 'bg-white/95 text-slate-600'}`}
                                                    onClick={() => setShowNames(!showNames)}
                                                    title={showNames ? "Sembunyikan Nama" : "Tampilkan Nama"}
                                                >
                                                    <span className="text-[10px] font-bold">Aa</span>
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-9 w-9 shrink-0 shadow-lg bg-white/95 backdrop-blur-sm text-slate-600 border-0"
                                                    onClick={handleCenterOnMe}
                                                    title="Lokasi Saya"
                                                >
                                                    <Navigation className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Dynamic Legend Overlay */}
                                        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border max-w-[200px] max-h-[300px] overflow-y-auto z-[1000]">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-wider">
                                                Legenda ({mapMode === 'team' ? 'Tim' : (mapMode === 'pelanggan' ? 'Pelanggan' : 'Transaksi')})
                                            </p>
                                            <div className="space-y-1.5">
                                                {Array.from(new Set(markers.map((m: any) => m.userName).filter(Boolean))).map(userName => {
                                                    const marker = markers.find((m: any) => m.userName === userName);
                                                    return (
                                                        <div key={userName as string} className="flex items-center gap-2">
                                                            <div
                                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                                style={{ backgroundColor: marker?.color || '#94a3b8' }}
                                                            />
                                                            <span className="text-xs truncate font-medium text-slate-700 capitalize">{userName as string}</span>
                                                        </div>
                                                    );
                                                })}
                                                {markers.length === 0 && <span className="text-[10px] text-muted-foreground italic">Tidak ada data</span>}
                                                {mapMode === 'pelanggan' && duplicateGroups.length > 0 && (
                                                    <div className="pt-2 mt-2 border-t border-dashed">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                                            <span className="text-xs font-bold text-red-600">Potensi Double Toko</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Map Legend Overlay for Duplicate Detection */}
                                        {mapMode === 'pelanggan' && (
                                            <div className="absolute top-1/2 -translate-y-1/2 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-red-100 flex flex-col gap-2 min-w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    <span className="text-[11px] font-bold text-red-800">Legenda Double Toko</span>
                                                </div>
                                                <div className="space-y-1.5 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-600 relative">
                                                            <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse opacity-50"></div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-600">Terindikasi Double</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border border-red-400 border-dashed rounded-full bg-red-100/50"></div>
                                                        <span className="text-[10px] text-slate-600">Radius {duplicateThreshold}m</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </MonitoringMapWrapper>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dynamic List based on Map Mode */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-semibold text-muted-foreground">
                                    {mapMode === 'team' && (currentUser?.roles.includes('sales') ? 'Status Saya' : 'Sales Aktif Hari Ini')}
                                    {mapMode === 'pelanggan' && 'Daftar Pelanggan Terpilih'}
                                    {mapMode === 'transaksi' && 'Daftar Transaksi Terpilih'}
                                </h3>
                                <Badge variant="outline" className="text-[10px] font-normal">
                                    {markers.length} Data
                                </Badge>
                            </div>

                            {markers.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                    Tidak ada data untuk filter ini
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {mapMode === 'team' && activeUsers.map((user) => {
                                        const userAbsensi = todayAbsensi.find(a => a.userId === user.id);
                                        const cabang = listCabang.find(c => c.id === user.cabangId);
                                        const isCheckedIn = !!userAbsensi?.checkIn;
                                        const isCheckedOut = !!userAbsensi?.checkOut;

                                        return (
                                            <Card
                                                key={user.id}
                                                className="bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    const marker = markers.find(m => m.id === user.id);
                                                    if (marker) {
                                                        setMapCenter(marker.position);
                                                        setSelectedMarker(marker);
                                                    }
                                                }}
                                            >
                                                <CardContent className="p-4 flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCheckedIn && !isCheckedOut ? 'bg-blue-500/10' : 'bg-muted'
                                                        }`}>
                                                        <User className={`w-5 h-5 ${isCheckedIn && !isCheckedOut ? 'text-blue-500' : 'text-muted-foreground'
                                                            }`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm truncate">{user.nama} {user.id === currentUser?.id ? '(Saya)' : ''}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{cabang?.nama}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        {isCheckedIn ? (
                                                            <Badge variant={isCheckedOut ? 'muted' : 'success'}>
                                                                {isCheckedOut ? 'Selesai' : 'Aktif'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="warning">Belum Absen</Badge>
                                                        )}
                                                        {isCheckedIn && userAbsensi?.checkIn && (
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {formatWaktu(new Date(userAbsensi.checkIn))}
                                                            </p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    {mapMode === 'pelanggan' && markers.map((marker) => {
                                        const p = listPelanggan.find(item => item.id === marker.id);
                                        return (
                                            <Card
                                                key={marker.id}
                                                className="bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setMapCenter(marker.position);
                                                    setSelectedMarker(marker);
                                                }}
                                            >
                                                <CardContent className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                                        <Crosshair className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-sm truncate">{marker.title}</p>
                                                            {duplicateMarkerIds.has(marker.id) && (
                                                                <Badge className="bg-red-600 hover:bg-red-700 text-[9px] h-4 py-0 animate-pulse">
                                                                    Potensi Double
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">{p?.alamat || marker.subtitle}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {p?.namaPemilik || 'Umum'}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}

                                    {mapMode === 'transaksi' && markers.map((marker) => {
                                        const penjualan = marker.data as Penjualan;
                                        return (
                                            <Card
                                                key={marker.id}
                                                className="bg-card hover:bg-muted/30 transition-colors cursor-pointer group"
                                                onClick={() => {
                                                    setMapCenter(marker.position);
                                                    setSelectedMarker(marker);
                                                }}
                                            >
                                                <CardContent className="p-4 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                                                        <ShoppingCart className="w-5 h-5 text-red-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm truncate capitalize">{marker.title}</p>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <User className="w-3 h-3" />
                                                            <span className="capitalize">{marker.userName || 'Sales'}</span>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{penjualan?.nomorNota || '#'}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className="text-sm font-bold text-primary">{formatRupiah(penjualan?.total || 0)}</p>
                                                        <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                                                            Transaksi
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="double-toko" className="mt-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            {/* Sidebar Controls */}
                            <div className="w-full md:w-80 space-y-4 shrink-0">
                                <Card className="border-red-100 shadow-sm bg-gradient-to-b from-red-50/30 to-transparent">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-800">
                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                            Analisis Duplikasi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                                                <p className="text-2xl font-bold text-red-600">{duplicateGroups.length}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase">Grup Potensial</p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                                                <p className="text-2xl font-bold text-slate-700">{duplicateGroups.reduce((acc, g) => acc + g.length, 0)}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium uppercase">Total Toko</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Radius Deteksi</label>
                                                <Badge variant="outline" className="font-mono text-[10px] h-5 bg-white">{duplicateThreshold}m</Badge>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="150"
                                                step="5"
                                                value={duplicateThreshold}
                                                onChange={(e) => setDuplicateThreshold(parseInt(e.target.value))}
                                                className="w-full accent-red-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                                                <span>5m (Ketat)</span>
                                                <span>150m (Longgar)</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground italic leading-relaxed p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-2">
                                                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                                <p>
                                                    Toko yang berada dalam radius ini akan dikelompokkan sebagai potensi duplikat (Double Input). Gunakan fitur ini untuk memverifikasi keaslian data lapangan.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-blue-100 bg-blue-50/20">
                                    <CardContent className="p-4">
                                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-2">
                                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                                            Apa yang harus dilakukan?
                                        </h4>
                                        <ol className="text-[10px] text-slate-600 space-y-2 list-decimal pl-4">
                                            <li>Periksa nama toko dan alamat di setiap grup.</li>
                                            <li>Gunakan tombol <strong>Pantau di Peta</strong> untuk melihat visualisasi lokasinya.</li>
                                            <li>Jika toko memang sama, silakan koordinasikan dengan sales terkait untuk pembersihan data.</li>
                                        </ol>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main List */}
                            <div className="flex-1 space-y-4 w-full">
                                {duplicateGroups.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-2xl border border-dashed text-center min-h-[400px]">
                                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">Semua Aman!</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                            Tidak ditemukan titik lokasi pelanggan yang tumpang tindih dalam radius {duplicateThreshold} meter. Data Anda terlihat bersih.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4" id="duplicate-monitoring-card">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                                            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                Ringkasan Indikasi Double Toko
                                                <Badge className="bg-red-600 hover:bg-red-700 animate-pulse">{filteredDuplicateGroups.length} Grup</Badge>
                                            </div>

                                            <div className="relative group max-w-xs w-full">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    placeholder="Cari nama toko..."
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
                                                    value={duplicateSearch}
                                                    onChange={(e) => setDuplicateSearch(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <Card className="border-red-100 shadow-sm overflow-hidden bg-white">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-[10px] text-slate-700">
                                                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-left font-bold">No</th>
                                                            <th className="px-4 py-2.5 text-left font-bold">Daftar Toko Terindikasi Sama</th>
                                                            <th className="px-4 py-2.5 text-center font-bold">Total</th>
                                                            <th className="px-4 py-2.5 text-right font-bold">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {filteredDuplicateGroups.map((groupData, idx) => (
                                                            <tr key={idx} className="hover:bg-red-50/30 transition-colors group">
                                                                <td className="px-4 py-3 font-bold text-red-600">#{idx + 1}</td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {groupData.markers.map((m, mIdx) => (
                                                                            <Badge key={m.id} variant="outline" className={`bg-white text-slate-700 border-slate-200 py-0 h-4.5 px-2 font-medium ${mIdx === 0 ? 'border-blue-200 bg-blue-50/30' : ''}`}>
                                                                                {m.title}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                                                                        {groupData.markers.length}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 text-[9px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                                                        onClick={() => {
                                                                            setMapCenter(groupData.markers[0].position);
                                                                            setSelectedMarker(groupData.markers[0]);
                                                                            setMapMode('pelanggan');
                                                                            handleTabChange('explore');
                                                                        }}
                                                                    >
                                                                        Lihat Lokasi
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>

                                        <div className="flex items-center gap-2 px-1 pt-2">
                                            <div className="h-px bg-slate-200 flex-1" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail Per Grup</span>
                                            <div className="h-px bg-slate-200 flex-1" />
                                        </div>

                                        {filteredDuplicateGroups.map((groupData, index) => {
                                            const borderClass = groupData.maxSimilarity > 90 ? 'border-red-300 ring-1 ring-red-100' :
                                                groupData.maxSimilarity > 75 ? 'border-orange-200' : 'border-slate-200';
                                            const headerBg = groupData.maxSimilarity > 90 ? 'from-red-100/80 to-white' :
                                                groupData.maxSimilarity > 75 ? 'from-orange-50 to-white' : 'from-slate-50 to-white';

                                            return (
                                                <Card key={index} className={`overflow-hidden shadow-md group hover:shadow-lg transition-all duration-300 ${borderClass}`}>
                                                    <div className={`bg-gradient-to-r ${headerBg} px-4 py-3 border-b flex items-center justify-between`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-lg ${groupData.maxSimilarity > 90 ? 'bg-red-600 shadow-red-200' : groupData.maxSimilarity > 75 ? 'bg-orange-500 shadow-orange-100' : 'bg-slate-600 shadow-slate-200'}`}>
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                                    Grup Potensi Duplikat
                                                                    {groupData.maxSimilarity > 90 && <Badge className="bg-red-600 text-[8px] h-3.5 py-0 px-1 animate-bounce">Sangat Mirip</Badge>}
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                                                    Terdiri dari {groupData.markers.length} toko • Max Skor: {groupData.maxSimilarity}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="bg-slate-800 hover:bg-slate-900 text-white h-8 text-[10px] px-4 gap-2 shadow-sm transition-all active:scale-95"
                                                            onClick={() => {
                                                                setMapMode('pelanggan');
                                                                setMapCenter(groupData.markers[0].position);
                                                                setSelectedMarker(groupData.markers[0]);
                                                                handleTabChange('explore');
                                                            }}
                                                        >
                                                            <MapIcon className="w-3.5 h-3.5" />
                                                            Pantau di Peta
                                                        </Button>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {groupData.markers.map((m, mIdx) => {
                                                            const p = listPelanggan.find(item => item.id === m.id);
                                                            const sales = users.find(u => u.id === p?.salesId);
                                                            const cabang = listCabang.find(c => c.id === p?.cabangId);

                                                            // Calculate distance from the first store in group
                                                            const distanceToFirst = mIdx === 0 ? 0 : getDistance(
                                                                groupData.markers[0].position.lat,
                                                                groupData.markers[0].position.lng,
                                                                m.position.lat,
                                                                m.position.lng
                                                            );

                                                            const similarityScore = (m as any).similarity;
                                                            const scoreColor = similarityScore > 90 ? 'text-red-600 bg-red-50 border-red-200' :
                                                                similarityScore > 75 ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                                                    'text-slate-600 bg-slate-50 border-slate-200';

                                                            return (
                                                                <div key={m.id} className={`p-4 flex items-start gap-4 transition-colors relative ${mIdx === 0 ? 'bg-blue-50/20' : 'hover:bg-slate-50'}`}>
                                                                    {mIdx > 0 && (
                                                                        <div className="absolute left-9 top-0 bottom-0 w-0.5 border-l border-dashed border-slate-200 -z-10" />
                                                                    )}
                                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 group-hover:border-slate-300 transition-colors z-10">
                                                                        <Store className={`w-5 h-5 ${mIdx === 0 ? 'text-blue-600' : 'text-slate-500'}`} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5">
                                                                            <p className="text-sm font-bold text-slate-800 truncate">{m.title}</p>
                                                                            <Badge variant="outline" className="text-[9px] h-4 py-0 font-mono bg-white">
                                                                                ID: {m.id.substring(0, 8)}
                                                                            </Badge>
                                                                            {mIdx === 0 ? (
                                                                                <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-[9px] h-4 py-0">Referensi Utama</Badge>
                                                                            ) : (
                                                                                <>
                                                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 text-[9px] h-4 py-0">Jarak: {Math.round(distanceToFirst)}m</Badge>
                                                                                    <Badge variant="outline" className={`text-[9px] h-4 py-0 font-bold border ${scoreColor}`}>
                                                                                        Skor: {similarityScore}%
                                                                                    </Badge>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3 shrink-0 text-red-400" />
                                                                            {p?.alamat || m.subtitle}
                                                                        </p>
                                                                        <p className="text-[9px] font-mono text-muted-foreground mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                                                                            LOC: {m.position.lat.toFixed(6)}, {m.position.lng.toFixed(6)}
                                                                        </p>
                                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-md">
                                                                                <User className="w-3 h-3 text-blue-500" />
                                                                                {sales?.nama || 'N/A'}
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-md">
                                                                                <Building className="w-3 h-3 text-orange-500" />
                                                                                {cabang?.nama || 'N/A'}
                                                                            </div>
                                                                            {p?.telepon && (
                                                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-md">
                                                                                    <Activity className="w-3 h-3 text-green-500" />
                                                                                    {p.telepon}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right flex flex-col gap-2">
                                                                        <div className="flex gap-1.5">
                                                                            <a
                                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${m.position.lat},${m.position.lng}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all text-slate-500 hover:text-blue-600"
                                                                                title="Buka di Google Maps"
                                                                            >
                                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                            </a>

                                                                            {mIdx > 0 && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-slate-400"
                                                                                    title="Hapus Duplikat"
                                                                                    onClick={async () => {
                                                                                        if (confirm(`Hapus toko "${m.title}"? Tindakan ini tidak dapat dibatalkan.`)) {
                                                                                            try {
                                                                                                await deletePelanggan(m.id);
                                                                                                refresh();
                                                                                            } catch (err) {
                                                                                                console.error("Failed to delete customer:", err);
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4 space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground px-1">Riwayat Absensi Terkini</h3>

                        {/* Show recent check-ins instead of generic users list */}
                        {absensi
                            .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                            .slice(0, historyLimit)
                            .filter(a => {
                                // Same filtering logic as explore
                                const u = users.find(user => user.id === a.userId);
                                if (!u) return false;
                                if (currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner') || currentUser?.roles.includes('finance')) return true;
                                if (currentUser?.roles.includes('leader')) return u.cabangId === currentUser.cabangId;
                                return u.id === currentUser?.id;
                            })
                            .map((record, index) => {
                                const user = users.find(u => u.id === record.userId);
                                const cabang = listCabang.find(c => c.id === user?.cabangId);

                                if (!user) return null;

                                return (
                                    <Card
                                        key={record.id}
                                        className="animate-slide-up"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-muted">
                                                <Activity className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{user.nama}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {record.status === 'hadir' ? 'Check-In' : record.status} • {cabang?.nama}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground">
                                                    {formatTanggal(new Date(record.tanggal))}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {record.checkIn ? formatWaktu(new Date(record.checkIn)) : '-'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        {absensi.length > historyLimit && (
                            <Button
                                variant="ghost"
                                className="w-full mt-4 border-dashed text-muted-foreground"
                                onClick={() => setHistoryLimit(prev => prev + 10)}
                            >
                                Lihat Lainnya
                            </Button>
                        )}
                    </TabsContent>

                    {/* TRACKING TAB CONTENT */}
                    <TabsContent value="tracking" className="mt-4 space-y-4">
                        {/* Session Controls */}
                        <div className="flex flex-col md:flex-row gap-3 p-3 bg-card rounded-xl border shadow-sm">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full md:w-[250px] justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            <Filter className="w-4 h-4 text-muted-foreground" />
                                            <span>
                                                {selectedSessionUsers.length === 0
                                                    ? "Semua User"
                                                    : `${selectedSessionUsers.length} User terpilih`}
                                            </span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[250px] max-h-[300px] overflow-y-auto">
                                    <DropdownMenuLabel>Pilih User</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem
                                        checked={selectedSessionUsers.length === 0}
                                        onCheckedChange={() => setSelectedSessionUsers([])}
                                    >
                                        Semua User
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuSeparator />
                                    {users.filter(u => u.isActive).map(u => (
                                        <DropdownMenuCheckboxItem
                                            key={u.id}
                                            checked={selectedSessionUsers.includes(u.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedSessionUsers([...selectedSessionUsers, u.id]);
                                                } else {
                                                    setSelectedSessionUsers(selectedSessionUsers.filter(id => id !== u.id));
                                                }
                                            }}
                                        >
                                            {u.nama}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex-1">
                                <DatePickerWithRange
                                    date={dateRange}
                                    setDate={setDateRange}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {/* Session Map */}
                        <Card elevated className="overflow-hidden">
                            <CardContent className="p-0 relative h-[300px] md:h-[450px] z-0">
                                <div className="absolute inset-0 z-0 h-full w-full">
                                    <MonitoringMapWrapper
                                        markers={sessionMarkers}
                                        mapCenter={sessionMarkers.length > 0 ? sessionMarkers[0].position : { lat: -6.2088, lng: 106.8456 }}
                                        setMapCenter={setMapCenter}
                                        selectedMarker={selectedMarker}
                                        setSelectedMarker={setSelectedMarker}
                                        customerMarkers={customerMarkers}
                                        radiusKunjungan={profilPerusahaan.config?.radiusKunjungan || 100}
                                    >
                                        <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg shadow-md text-xs z-[1000] border">
                                            <p className="font-semibold mb-1">Total Logs: {sessionMarkers.length}</p>
                                        </div>
                                        {/* Map Legend Overlay for Duplicate Detection */}
                                        {mapMode === 'pelanggan' && (
                                            <div className="absolute bottom-12 right-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-red-100 flex flex-col gap-2 min-w-[150px]">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    <span className="text-[11px] font-bold text-red-800">Legenda Double Toko</span>
                                                </div>
                                                <div className="space-y-1.5 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-red-600 marker-pulse-mini relative">
                                                            <div className="absolute inset-0 bg-red-600 rounded-full animate-pulse"></div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-600">Terindikasi Double</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 border border-red-400 border-dashed rounded-full bg-red-100/50"></div>
                                                        <span className="text-[10px] text-slate-600">Radius {duplicateThreshold}m</span>
                                                    </div>
                                                </div>
                                                {duplicateGroups.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-red-100">
                                                        <p className="text-[10px] font-bold text-red-600">{duplicateGroups.length} Grup Terdeteksi</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </MonitoringMapWrapper>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground px-1 flex items-center gap-2 mt-6">
                                <Activity className="w-4 h-4" /> Aktivitas
                            </h3>

                            {combinedActivities.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                                    Pilih user dan tanggal untuk melihat linimasa
                                </div>
                            ) : (
                                <Card className="border shadow-sm p-4">
                                    <div className="relative space-y-0 pl-1 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted-foreground/20">
                                        {combinedActivities.slice(0, sessionLimit).map((activity) => {
                                            let Icon = Activity;
                                            let colorClass = 'bg-primary';

                                            if (activity.type === 'sales') { Icon = ShoppingCart; colorClass = 'bg-red-500'; }
                                            if (activity.type === 'deposit') { Icon = Wallet; colorClass = 'bg-green-600'; }
                                            if (activity.type === 'checkin') { Icon = LogIn; colorClass = 'bg-success'; }
                                            if (activity.type === 'checkout') { Icon = LogOut; colorClass = 'bg-orange-500'; }
                                            if (activity.type === 'stay') { Icon = MapIcon; colorClass = activity.color ? '' : 'bg-blue-500'; }
                                            if (activity.type === 'noo') { Icon = PlusCircle; colorClass = 'bg-purple-600'; }
                                            if (activity.type === 'receive') { Icon = Package; colorClass = 'bg-yellow-600'; }
                                            if (activity.type === 'visit') {
                                                Icon = Store;
                                                colorClass = 'bg-cyan-600';
                                                if ((activity.data as DynamicActivityData)?.isHome) {
                                                    Icon = Home;
                                                    colorClass = 'bg-blue-600';
                                                } else if (activity.title.startsWith('Basecamp')) {
                                                    Icon = MapPin;
                                                    colorClass = 'bg-indigo-600';
                                                }
                                            }

                                            return (
                                                <div key={activity.id} className="relative pl-8 pb-8 last:pb-2">
                                                    {/* Timeline dot */}
                                                    <div
                                                        className={`absolute left-[5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background z-10 shadow-sm flex items-center justify-center ${colorClass}`}
                                                        style={activity.color ? { backgroundColor: activity.color } : {}}
                                                    >
                                                        <Icon className="w-2 h-2 text-white" />
                                                    </div>

                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex flex-col">
                                                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{activity.userName}</p>
                                                                <p className="text-sm font-bold tracking-tight">{activity.title}</p>
                                                            </div>
                                                            <Badge variant="secondary" className="text-[10px] font-mono font-medium shrink-0">
                                                                {formatWaktu(activity.timestamp)}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 leading-tight">
                                                                {activity.type === 'stay' ? (
                                                                    <>
                                                                        <Clock className="w-3 h-3 shrink-0" />
                                                                        {activity.duration && activity.duration > 0 ? `Menetap selama ${activity.duration} menit` : 'Singgah sebentar'}
                                                                    </>
                                                                ) : (
                                                                    activity.description
                                                                )}
                                                            </p>

                                                            {(activity.lat && activity.lng) && (
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <a
                                                                        href={`https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 hover:underline transition-colors"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        Lihat Lokasi
                                                                    </a>

                                                                    <span className="text-[9px] text-muted-foreground italic bg-muted px-1.5 py-0.5 rounded">
                                                                        {activity.lat.toFixed(4)}, {activity.lng.toFixed(4)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {combinedActivities.length > sessionLimit && (
                                            <Button
                                                variant="ghost"
                                                className="w-full mt-4 border-dashed text-muted-foreground"
                                                onClick={() => setSessionLimit(prev => prev + 10)}
                                            >
                                                Lihat Lainnya
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="route" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Customer Selection Sidebar */}
                            <div className="lg:col-span-1 space-y-4">
                                <Card>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-sm">Pilih Pelanggan</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="max-h-[600px] overflow-y-auto">
                                            {listPelanggan
                                                .filter(p => (selectedCabang.length === 0 || (p.cabangId && selectedCabang.includes(p.cabangId))) && (selectedUser.length === 0 || (p.salesId && selectedUser.includes(p.salesId))))
                                                .filter(p => p.lokasi?.latitude && p.lokasi?.longitude)
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => toggleCustomerForRoute(p)}
                                                        className={`p-3 border-b cursor-pointer transition-colors hover:bg-muted/50 flex items-start gap-3 ${selectedRouteCustomers.find(c => c.id === p.id) ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                                                    >
                                                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedRouteCustomers.find(c => c.id === p.id) ? 'bg-primary border-primary text-white' : 'bg-background'}`}>
                                                            {selectedRouteCustomers.find(c => c.id === p.id) && <CheckCircle2 className="w-3 h-3" />}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-bold leading-none">{p.nama}</p>
                                                            <p className="text-[10px] text-muted-foreground line-clamp-1">{p.alamat}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                                {selectedRouteCustomers.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs gap-2"
                                        onClick={() => setSelectedRouteCustomers([])}
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset Pilihan ({selectedRouteCustomers.length})
                                    </Button>
                                )}
                            </div>

                            {/* Route Map Component */}
                            <div className="lg:col-span-2 space-y-4">
                                <Card>
                                    <CardContent className="p-4">
                                        {selectedRouteCustomers.length === 0 ? (
                                            <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-3 bg-muted/20 rounded-xl border border-dashed p-6">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Navigation className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-semibold">Siapkan Rute Kunjungan</h3>
                                                    <p className="text-xs text-muted-foreground max-w-[250px]">
                                                        Pilih beberapa pelanggan dari daftar di samping untuk membuat rute perjalanan yang optimal.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <SalesRouteMap
                                                customers={selectedRouteCustomers}
                                            />
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <h4 className="text-xs font-bold text-blue-800 flex items-center gap-2 mb-2">
                                        <Info className="w-3 h-3" /> Tips Optimasi
                                    </h4>
                                    <ul className="text-[10px] text-blue-700 space-y-1 list-disc pl-4">
                                        <li>Urutan rute akan dimulai dari pelanggan pertama yang Anda pilih.</li>
                                        <li>Sistem akan mengurutkan titik tengah untuk memberikan jarak tempuh minimum.</li>
                                        <li>Pastikan semua pelanggan yang dipilih memiliki koordinat lokasi yang valid.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    );
}

