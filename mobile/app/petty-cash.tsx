import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function PettyCashScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('petty_cash').select('*').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const saldo = items.length > 0 ? items[0].saldo_akhir || 0 : 0;
    const totalPengeluaran = items.filter(i => i.jenis === 'pengeluaran').reduce((s, i) => s + (i.jumlah || 0), 0);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="px-4 pt-4">
                {/* Balance Card */}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Saldo Petty Cash</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#18181b', marginTop: 4 }}>{formatRp(saldo)}</Text>
                    <View style={{ height: 6, backgroundColor: '#f4f4f5', borderRadius: 3, marginTop: 12 }}>
                        <View style={{ height: 6, backgroundColor: TEAL, borderRadius: 3, width: '60%' }} />
                    </View>
                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Pengeluaran: {formatRp(totalPengeluaran)}</Text>
                </View>

                {/* Items */}
                {items.map((item, i) => (
                    <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.jenis === 'pengeluaran' ? '#fee2e2' : '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 14 }}>{item.jenis === 'pengeluaran' ? '📤' : '📥'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{item.kategori || item.keterangan || '-'}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: item.jenis === 'pengeluaran' ? '#ef4444' : '#22c55e' }}>
                            {item.jenis === 'pengeluaran' ? '-' : '+'}{formatRp(item.jumlah || 0)}
                        </Text>
                    </View>
                ))}
                <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity
                style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push('/petty-cash/tambah' as any)}
            >
                <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
