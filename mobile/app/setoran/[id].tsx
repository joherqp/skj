import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wallet } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function DetailSetoranScreen() {
    const { id } = useLocalSearchParams();
    const [deposit, setDeposit] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('setoran').select('*').eq('id', id).single();
            setDeposit(data);
        })();
    }, [id]);

    if (!deposit) return <View className="flex-1 bg-white items-center justify-center"><Text style={{ color: '#a1a1aa' }}>Memuat...</Text></View>;
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const ss = deposit.status === 'diterima' || deposit.status === 'disetujui' ? { bg: '#dcfce7', text: '#15803d', label: 'Dikonfirmasi' } : deposit.status === 'ditolak' ? { bg: '#fee2e2', text: '#b91c1c', label: 'Ditolak' } : { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' };

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ alignItems: 'center', paddingVertical: 16, marginBottom: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${TEAL}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Wallet size={24} color={TEAL} />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#18181b' }}>{formatRp(deposit.jumlah || 0)}</Text>
                <View style={{ backgroundColor: ss.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: ss.text }}>{ss.label}</Text>
                </View>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', gap: 12 }}>
                {[
                    { label: 'Nomor Setoran', value: deposit.nomor_setoran || '-' },
                    { label: 'Tanggal', value: new Date(deposit.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'Metode', value: deposit.metode || 'Tunai' },
                    { label: 'Keterangan', value: deposit.keterangan || '-' },
                ].map((r, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 12, color: '#a1a1aa' }}>{r.label}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#18181b', maxWidth: '60%', textAlign: 'right' }}>{r.value}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}
