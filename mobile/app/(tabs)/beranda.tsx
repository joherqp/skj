import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MapPin, ShoppingCart, Wallet, Users, QrCode,
    TrendingUp, Package, AlertCircle, CheckCircle, ArrowRight, Clock
} from 'lucide-react-native';

const TEAL = '#0d9488';

export default function Beranda() {
    const { user } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ omset: 0, qty: 0, nota: 0, lowStock: 0, pendingApproval: 0 });
    const [recentSales, setRecentSales] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const [salesRes, lowStockRes, approvalRes] = await Promise.all([
                supabase.from('penjualan').select('id, transaksi, tanggal, total, status, pelanggan:pelanggan_id(nama)').order('tanggal', { ascending: false }).limit(10),
                supabase.from('barang').select('id').eq('is_active', true).lte('stok', 10),
                supabase.from('persetujuan').select('id').eq('status', 'pending'),
            ]);
            const sales = salesRes.data || [];
            const todaySales = sales.filter(s => s.tanggal?.startsWith(todayStr) && s.status !== 'batal');
            setStats({
                omset: todaySales.reduce((s, p) => s + (p.total || 0), 0),
                qty: 0,
                nota: todaySales.length,
                lowStock: lowStockRes.data?.length || 0,
                pendingApproval: approvalRes.data?.length || 0,
            });
            setRecentSales(sales.filter(s => s.status !== 'batal').slice(0, 3));
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Selamat Pagi';
        if (h < 15) return 'Selamat Siang';
        if (h < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const quickActions = [
        { label: 'Scan QR', icon: QrCode, color: `${TEAL}15`, textColor: TEAL },
        { label: 'Buat Nota', icon: ShoppingCart, color: '#22c55e15', textColor: '#22c55e', route: '/penjualan/tambah' },
        { label: 'Setoran', icon: Wallet, color: '#f59e0b15', textColor: '#f59e0b', route: '/setoran' },
        { label: 'Pelanggan', icon: Users, color: `${TEAL}15`, textColor: TEAL, route: '/(tabs)/pelanggan' },
    ];

    const statItems = [
        { label: 'Omset Hari Ini', value: formatRp(stats.omset), icon: TrendingUp, color: '#22c55e' },
        { label: 'Total Nota', value: stats.nota.toString(), icon: ShoppingCart, color: '#3b82f6' },
        { label: 'Stok Menipis', value: stats.lowStock.toString(), icon: AlertCircle, color: stats.lowStock > 0 ? '#f59e0b' : '#a1a1aa' },
        { label: 'Perlu Persetujuan', value: stats.pendingApproval.toString(), icon: CheckCircle, color: stats.pendingApproval > 0 ? '#06b6d4' : '#a1a1aa' },
    ];

    return (
        <ScrollView
            className="flex-1 bg-white"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
        >
            {/* Gradient Hero Card — matches web gradient-hero */}
            <View style={{ backgroundColor: TEAL, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 }}>
                {/* Decorative circles like web */}
                <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                <View style={{ position: 'absolute', right: -20, bottom: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>{getGreeting()}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 }}>{user?.nama || 'User'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <MapPin size={12} color="#fff" />
                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700', marginLeft: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>Lokasi</Text>
                </View>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
            </View>

            <View className="px-4 pt-4" style={{ gap: 16 }}>
                {/* Attendance Alert — matches web */}
                <TouchableOpacity
                    style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fbbf2430', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    onPress={() => router.push('/absensi' as any)}
                >
                    <View style={{ padding: 8, borderRadius: 10, backgroundColor: '#f59e0b15' }}>
                        <Clock size={20} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }}>Anda belum absen hari ini</Text>
                        <Text style={{ fontSize: 11, color: '#71717a' }}>Tap untuk melakukan absensi</Text>
                    </View>
                    <View style={{ backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Absen</Text>
                    </View>
                </TouchableOpacity>

                {/* Quick Actions — 4 cols like web */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {quickActions.map(a => (
                        <TouchableOpacity
                            key={a.label}
                            style={{ flex: 1, alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f4f4f5' }}
                            onPress={() => a.route && router.push(a.route as any)}
                            activeOpacity={0.7}
                        >
                            <View style={{ padding: 10, borderRadius: 12, backgroundColor: a.color }}>
                                <a.icon size={20} color={a.textColor} />
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '500', textAlign: 'center', color: '#18181b' }}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stats — card list like web */}
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', marginBottom: 8, paddingLeft: 4 }}>Ringkasan</Text>
                    <View style={{ gap: 8 }}>
                        {statItems.map((stat, i) => (
                            <TouchableOpacity
                                key={i}
                                style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#f4f4f5' }}
                                activeOpacity={0.7}
                            >
                                <View style={{ padding: 10, borderRadius: 12, backgroundColor: '#f4f4f5' }}>
                                    <stat.icon size={20} color={stat.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, color: '#71717a' }}>{stat.label}</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#18181b', marginTop: 2 }}>{stat.value}</Text>
                                </View>
                                <ArrowRight size={16} color="#d4d4d8" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Sales — matches web */}
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a' }}>Penjualan Terakhir</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/penjualan')}>
                            <Text style={{ fontSize: 12, color: TEAL, fontWeight: '600' }}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ gap: 8 }}>
                        {recentSales.map((p, i) => (
                            <TouchableOpacity
                                key={p.id || i}
                                style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#f4f4f5' }}
                                onPress={() => router.push(`/penjualan/${p.id}` as any)}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '500', fontSize: 13, color: '#18181b' }} numberOfLines={1}>{(p.pelanggan as any)?.nama || 'Pelanggan Umum'}</Text>
                                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{p.transaksi} • {new Date(p.tanggal).toLocaleDateString('id-ID')}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }}>{formatRp(p.total || 0)}</Text>
                                    <View style={{ backgroundColor: p.status === 'lunas' ? '#dcfce7' : '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 }}>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: p.status === 'lunas' ? '#15803d' : '#92400e' }}>{p.status}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </View>
        </ScrollView>
    );
}
