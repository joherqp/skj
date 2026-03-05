import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Package } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function LaporanStokScreen() {
    const [items, setItems] = useState<any[]>([]);
    const [filter, setFilter] = useState('semua');

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('barang').select('id, nama, kode, stok, min_stok, kategori:kategori_id(nama)').eq('is_active', true).order('stok');
            setItems(data || []);
        })();
    }, []);

    const filtered = filter === 'rendah' ? items.filter(i => (i.stok || 0) <= (i.min_stok || 10)) : filter === 'kosong' ? items.filter(i => (i.stok || 0) === 0) : items;
    const stockColor = (s: number, m: number) => s === 0 ? '#ef4444' : s <= m ? '#f59e0b' : '#22c55e';

    return (
        <View className="flex-1 bg-white">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {['Semua', 'Rendah', 'Kosong'].map(f => (
                    <TouchableOpacity key={f} onPress={() => setFilter(f.toLowerCase())} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f.toLowerCase() ? '#18181b' : '#f4f4f5' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.toLowerCase() ? '#fff' : '#52525b' }}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView className="flex-1 px-4">
                {filtered.map((item, i) => (
                    <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stockColor(item.stok || 0, item.min_stok || 10) }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{item.nama}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{item.kode || '-'} • {(item.kategori as any)?.nama || '-'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: stockColor(item.stok || 0, item.min_stok || 10) }}>{item.stok || 0}</Text>
                            <Text style={{ fontSize: 9, color: '#a1a1aa' }}>Min: {item.min_stok || 0}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
