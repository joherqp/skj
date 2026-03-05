import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Plus, Paperclip } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function ReimburseScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('reimburse').select('*').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const statusStyle = (s: string) => {
        if (s === 'disetujui' || s === 'dibayar') return { bg: '#dcfce7', text: '#15803d', label: s === 'dibayar' ? 'Dibayar' : 'Disetujui' };
        if (s === 'ditolak') return { bg: '#fee2e2', text: '#b91c1c', label: 'Ditolak' };
        return { bg: '#fef3c7', text: '#92400e', label: 'Menunggu' };
    };
    const total = items.reduce((s, i) => s + (i.jumlah || 0), 0);
    const pending = items.filter(i => i.status === 'pending').reduce((s, i) => s + (i.jumlah || 0), 0);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="px-4 pt-4">
                {/* Summary */}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Total Reimburse</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#18181b' }}>{formatRp(total)}</Text>
                    </View>
                    {pending > 0 && (
                        <View>
                            <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase' }}>Menunggu</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b' }}>{formatRp(pending)}</Text>
                        </View>
                    )}
                </View>

                {/* Items */}
                {items.map((item, i) => {
                    const ss = statusStyle(item.status);
                    return (
                        <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{item.jenis?.toUpperCase() || '-'}</Text>
                                <View style={{ backgroundColor: ss.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: ss.text }}>{ss.label}</Text>
                                </View>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b' }}>{formatRp(item.jumlah || 0)}</Text>
                            <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>{item.keterangan || ''}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
                                {(item.bukti || item.bukti_url) && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Paperclip size={12} color="#a1a1aa" />
                                        <Text style={{ fontSize: 10, color: '#a1a1aa' }}>1 lampiran</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
                <View style={{ height: 80 }} />
            </ScrollView>

            <TouchableOpacity
                style={{ position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
                onPress={() => router.push('/reimburse/tambah' as any)}
            >
                <Plus size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    );
}
