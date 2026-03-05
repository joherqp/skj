import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function SetoranTab() {
    const { user } = useAuth();
    const router = useRouter();
    const [deposits, setDeposits] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        const { data } = await supabase.from('setoran').select('*').order('tanggal', { ascending: false }).limit(50);
        setDeposits(data || []);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const total = deposits.reduce((s, d) => s + (d.jumlah || 0), 0);
    const statusStyle = (s: string) => {
        if (s === 'diterima' || s === 'disetujui') return { bg: '#dcfce7', text: '#15803d', label: 'Dikonfirmasi' };
        if (s === 'ditolak') return { bg: '#fee2e2', text: '#b91c1c', label: 'Ditolak' };
        return { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' };
    };

    return (
        <View className="flex-1 bg-white">
            <View style={{ backgroundColor: TEAL, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Total Setoran</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 }}>{formatRp(total)}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{deposits.length} transaksi</Text>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
            >
                {deposits.map((d, i) => {
                    const ss = statusStyle(d.status);
                    return (
                        <View key={d.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 11, color: '#a1a1aa', fontFamily: 'monospace' }}>{d.nomor_setoran || '-'}</Text>
                                <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{new Date(d.tanggal).toLocaleDateString('id-ID')}</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b' }}>{formatRp(d.jumlah || 0)}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ fontSize: 11, color: '#a1a1aa', flex: 1 }} numberOfLines={1}>{d.keterangan || ''}</Text>
                                <View style={{ backgroundColor: ss.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: ss.text }}>{ss.label}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })}
                <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity
                style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            >
                <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
