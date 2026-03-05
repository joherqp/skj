import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, Package, ArrowRightLeft } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function MutasiBarangScreen() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [mutasiList, setMutasiList] = useState<any[]>([]);
    const [tab, setTab] = useState<'riwayat' | 'baru'>('riwayat');

    useEffect(() => {
        (async () => {
            const [p, m] = await Promise.all([
                supabase.from('barang').select('id, nama, stok').eq('is_active', true).order('nama'),
                supabase.from('mutasi_barang').select('*, barang:barang_id(nama)').order('tanggal', { ascending: false }).limit(50),
            ]);
            setProducts(p.data || []);
            setMutasiList(m.data || []);
        })();
    }, []);

    return (
        <View className="flex-1 bg-white">
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
                {(['riwayat', 'baru'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: tab === t ? '#18181b' : '#f4f4f5' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: tab === t ? '#fff' : '#52525b', textTransform: 'capitalize' }}>{t === 'riwayat' ? 'Riwayat' : 'Buat Mutasi'}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView className="flex-1 px-4">
                {tab === 'riwayat' ? (
                    mutasiList.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                            <ArrowRightLeft size={40} color="#d4d4d8" />
                            <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Belum ada mutasi barang</Text>
                        </View>
                    ) : mutasiList.map((m, i) => (
                        <View key={m.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{(m.barang as any)?.nama || '-'}</Text>
                                <View style={{ backgroundColor: m.jenis === 'masuk' ? '#dcfce7' : '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: m.jenis === 'masuk' ? '#15803d' : '#b91c1c' }}>{m.jenis}</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 11, color: '#a1a1aa' }}>Qty: {m.jumlah} • {new Date(m.tanggal).toLocaleDateString('id-ID')}</Text>
                            {m.keterangan && <Text style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>{m.keterangan}</Text>}
                        </View>
                    ))
                ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <ArrowRightLeft size={40} color="#d4d4d8" />
                        <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Pilih barang untuk dimutasi</Text>
                        <Text style={{ fontSize: 11, color: '#d4d4d8', marginTop: 4 }}>Fitur ini akan segera tersedia</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
