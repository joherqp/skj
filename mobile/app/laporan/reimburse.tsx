import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function LaporanReimburseScreen() {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('reimburse').select('*').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const total = items.reduce((s, i) => s + (i.jumlah || 0), 0);

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Total Reimburse</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#18181b' }}>{formatRp(total)}</Text>
            </View>
            {items.map((item, i) => (
                <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{item.jenis || '-'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#18181b' }}>{formatRp(item.jumlah || 0)}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', marginTop: 4 }}>{new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.status}</Text>
                </View>
            ))}
        </ScrollView>
    );
}
