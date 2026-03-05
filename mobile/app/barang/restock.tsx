import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, Plus, Minus, Package } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function RestockScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<{ id: string; nama: string; qty: number; stok: number }[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('barang').select('id, nama, kode, stok').eq('is_active', true).order('nama');
            setProducts(data || []);
        })();
    }, []);

    const filtered = search ? products.filter(p => p.nama?.toLowerCase().includes(search.toLowerCase())) : products;
    const addToCart = (p: any) => {
        if (cart.find(c => c.id === p.id)) return;
        setCart([...cart, { id: p.id, nama: p.nama, qty: 1, stok: p.stok || 0 }]);
    };
    const updateQty = (id: string, delta: number) => setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
    const removeFromCart = (id: string) => setCart(cart.filter(c => c.id !== id));

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                {cart.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Item Restock ({cart.length})</Text>
                        {cart.map(c => (
                            <View key={c.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b', flex: 1 }}>{c.nama}</Text>
                                    <TouchableOpacity onPress={() => removeFromCart(c.id)}><Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Hapus</Text></TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 11, color: '#a1a1aa' }}>Stok saat ini: {c.stok}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 8 }}>
                                        <TouchableOpacity style={{ padding: 8 }} onPress={() => updateQty(c.id, -1)}><Minus size={14} color="#18181b" /></TouchableOpacity>
                                        <Text style={{ fontSize: 14, fontWeight: '700', width: 32, textAlign: 'center', color: '#18181b' }}>{c.qty}</Text>
                                        <TouchableOpacity style={{ padding: 8 }} onPress={() => updateQty(c.id, 1)}><Plus size={14} color="#18181b" /></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Pilih Barang</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 }}>
                    <Search size={16} color="#a1a1aa" />
                    <TextInput style={{ flex: 1, height: 40, fontSize: 13, color: '#18181b', marginLeft: 8 }} placeholder="Cari barang..." placeholderTextColor="#a1a1aa" value={search} onChangeText={setSearch} />
                </View>
                {filtered.map(p => (
                    <TouchableOpacity key={p.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => addToCart(p)}>
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}><Package size={16} color="#a1a1aa" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{p.nama}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Stok: {p.stok || 0}</Text>
                        </View>
                        <Plus size={18} color={TEAL} />
                    </TouchableOpacity>
                ))}
                <View style={{ height: 80 }} />
            </ScrollView>

            {cart.length > 0 && (
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f4f4f5', padding: 16 }}>
                    <TouchableOpacity style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                        onPress={() => Alert.alert('Sukses', 'Restock berhasil disimpan!', [{ text: 'OK', onPress: () => router.back() }])}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Simpan Restock ({cart.length} item)</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
