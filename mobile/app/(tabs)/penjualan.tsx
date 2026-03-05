import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, Plus, ShoppingCart } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function PenjualanTab() {
    const router = useRouter();
    const [sales, setSales] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const { data } = await supabase.from('penjualan').select('*, pelanggan:pelanggan_id(nama)').order('tanggal', { ascending: false }).limit(50);
        setSales(data || []);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const validSales = sales.filter(s => s.status !== 'batal' && s.status !== 'draft');
    const totalOmset = validSales.reduce((s, p) => s + (p.total || 0), 0);

    const filtered = sales.filter(s => {
        if (search) {
            const q = search.toLowerCase();
            if (!(s.transaksi?.toLowerCase().includes(q) || (s.pelanggan as any)?.nama?.toLowerCase().includes(q))) return false;
        }
        return true;
    });

    const statusStyle = (s: string) => {
        if (s === 'lunas') return { bg: '#dcfce7', text: '#15803d' };
        if (s === 'batal') return { bg: '#fee2e2', text: '#b91c1c' };
        return { bg: '#fef3c7', text: '#92400e' };
    };

    return (
        <View className="flex-1 bg-white">
            <View style={{ backgroundColor: TEAL, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Penjualan</Text>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                        onPress={() => router.push('/rekap-penjualan' as any)}
                    >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Rekap</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Search size={16} color="rgba(255,255,255,0.7)" />
                    <TextInput
                        style={{ flex: 1, height: 40, color: '#fff', fontSize: 13, marginLeft: 8 }}
                        placeholder="Cari nota / pelanggan..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>Total Omset</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{formatRp(totalOmset)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>Total Nota</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{validSales.length}</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-3"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            >
                {filtered.map((p, i) => {
                    const ss = statusStyle(p.status);
                    return (
                        <TouchableOpacity
                            key={p.id || i}
                            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            onPress={() => router.push(`/penjualan/${p.id}` as any)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '500', fontSize: 13, color: '#18181b' }} numberOfLines={1}>{(p.pelanggan as any)?.nama || 'Pelanggan Umum'}</Text>
                                <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{p.transaksi} • {new Date(p.tanggal).toLocaleDateString('id-ID')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }}>{formatRp(p.total || 0)}</Text>
                                <View style={{ backgroundColor: ss.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: ss.text }}>{p.status}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
                <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity
                style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push('/penjualan/tambah' as any)}
            >
                <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
