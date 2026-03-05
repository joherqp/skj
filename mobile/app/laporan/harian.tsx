import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL = '#0d9488';

export default function LaporanHarianScreen() {
    const [data, setData] = useState<any>(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        (async () => {
            const { data: sales } = await supabase.from('penjualan').select('total, status').gte('tanggal', today).neq('status', 'batal');
            const total = (sales || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
            setData({ total, count: (sales || []).length });
        })();
    }, []);

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ fontSize: 13, color: '#71717a' }}>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase' }}>Omset Hari Ini</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: TEAL, marginTop: 4 }}>{formatRp(data?.total || 0)}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase' }}>Transaksi</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#18181b', marginTop: 4 }}>{data?.count || 0}</Text>
                </View>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Ringkasan</Text>
                {[
                    { label: 'Rata-rata per Nota', value: data?.count > 0 ? formatRp(Math.round((data?.total || 0) / data.count)) : '-' },
                    { label: 'Target Harian', value: '-' },
                    { label: 'Pencapaian', value: '-' },
                ].map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fafafa' }}>
                        <Text style={{ fontSize: 12, color: '#71717a' }}>{r.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#18181b' }}>{r.value}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
