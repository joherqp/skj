import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL = '#0d9488';

export default function LaporanPenjualanScreen() {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('penjualan').select('id, transaksi, tanggal, total, status, pelanggan:pelanggan_id(nama)').order('tanggal', { ascending: false }).limit(100);
            setItems(data || []);
        })();
    }, []);
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const total = items.filter(i => i.status !== 'batal').reduce((s, i) => s + (i.total || 0), 0);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Total Penjualan</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: TEAL }}>{formatRp(total)}</Text>
                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>{items.length} transaksi</Text>
                </View>
                {items.map((s, i) => (
                    <View key={s.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '500', color: '#18181b' }}>{(s.pelanggan as any)?.nama || 'Umum'}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{s.transaksi} • {new Date(s.tanggal).toLocaleDateString('id-ID')}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#18181b' }}>{formatRp(s.total || 0)}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
