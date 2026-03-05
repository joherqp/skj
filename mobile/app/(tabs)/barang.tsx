import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, ScanLine, Plus, Package } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function BarangTab() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCat, setSelectedCat] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const [p, c] = await Promise.all([
            supabase.from('barang').select('*, kategori:kategori_id(nama)').eq('is_active', true).order('nama'),
            supabase.from('kategori').select('id, nama'),
        ]);
        setProducts(p.data || []);
        setCategories(c.data || []);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const filtered = products.filter(p => {
        if (search && !p.nama?.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCat && p.kategori_id !== selectedCat) return false;
        return true;
    });

    const stockColor = (stok: number, minStok: number = 10) => {
        if (stok <= minStok * 0.5) return '#ef4444';
        if (stok <= minStok) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View style={{ backgroundColor: TEAL, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 }}>Barang</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12 }}>
                        <Search size={16} color="rgba(255,255,255,0.7)" />
                        <TextInput
                            style={{ flex: 1, height: 40, color: '#fff', fontSize: 13, marginLeft: 8 }}
                            placeholder="Cari barang..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <ScanLine size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Category Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                <TouchableOpacity
                    style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: !selectedCat ? '#18181b' : '#f4f4f5' }}
                    onPress={() => setSelectedCat('')}
                >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: !selectedCat ? '#fff' : '#52525b' }}>Semua</Text>
                </TouchableOpacity>
                {categories.map(c => (
                    <TouchableOpacity
                        key={c.id}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: selectedCat === c.id ? '#18181b' : '#f4f4f5' }}
                        onPress={() => setSelectedCat(selectedCat === c.id ? '' : c.id)}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCat === c.id ? '#fff' : '#52525b' }}>{c.nama}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            <ScrollView
                className="flex-1 px-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            >
                {filtered.map((p, i) => (
                    <TouchableOpacity
                        key={p.id || i}
                        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        onPress={() => router.push(`/barang/${p.id}` as any)}
                    >
                        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={20} color="#a1a1aa" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }} numberOfLines={1}>{p.nama}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa', marginTop: 2 }}>{p.kode || 'No SKU'} • {(p.kategori as any)?.nama || '-'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#18181b' }}>{formatRp(p.harga_jual || 0)}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stockColor(p.stok || 0, p.min_stok || 10) }} />
                                <Text style={{ fontSize: 10, color: stockColor(p.stok || 0, p.min_stok || 10), fontWeight: '600' }}>Stok: {p.stok || 0}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
                <View style={{ height: 80 }} />
            </ScrollView>
        </View>
    );
}
