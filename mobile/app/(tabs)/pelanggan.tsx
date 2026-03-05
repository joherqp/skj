import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, Linking } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, Plus, Phone, MessageCircle, Users } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function PelangganTab() {
    const router = useRouter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCat, setSelectedCat] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const [c, cat] = await Promise.all([
            supabase.from('pelanggan').select('*, kategori:kategori_id(nama)').eq('is_active', true).order('nama'),
            supabase.from('kategori_pelanggan').select('id, nama'),
        ]);
        setCustomers(c.data || []);
        setCategories(cat.data || []);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const filtered = customers.filter(c => {
        if (search && !c.nama?.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCat && c.kategori_id !== selectedCat) return false;
        return true;
    });

    return (
        <View className="flex-1 bg-white">
            <View style={{ backgroundColor: TEAL, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 }}>Pelanggan</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12 }}>
                    <Search size={16} color="rgba(255,255,255,0.7)" />
                    <TextInput
                        style={{ flex: 1, height: 40, color: '#fff', fontSize: 13, marginLeft: 8 }}
                        placeholder="Cari pelanggan..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

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

            <ScrollView
                className="flex-1 px-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            >
                {filtered.map((c, i) => (
                    <TouchableOpacity
                        key={c.id || i}
                        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}
                        onPress={() => router.push(`/pelanggan/${c.id}` as any)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontWeight: '700', fontSize: 14, color: '#52525b' }}>{c.nama?.substring(0, 2)?.toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }} numberOfLines={1}>{c.nama}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 }}>
                                    {(c.kategori as any)?.nama && (
                                        <View style={{ backgroundColor: `${TEAL}15`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 9, fontWeight: '700', color: TEAL }}>{(c.kategori as any).nama}</Text>
                                        </View>
                                    )}
                                    <Text style={{ fontSize: 10, color: '#a1a1aa' }} numberOfLines={1}>{c.alamat || ''}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {c.telepon && (
                                    <>
                                        <TouchableOpacity
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}
                                            onPress={() => Linking.openURL(`tel:${c.telepon}`)}
                                        >
                                            <Phone size={14} color="#18181b" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}
                                            onPress={() => Linking.openURL(`https://wa.me/${c.telepon?.replace(/^0/, '62')}`)}
                                        >
                                            <MessageCircle size={14} color="#22c55e" />
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
                <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity
                style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push('/pelanggan/tambah' as any)}
            >
                <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
