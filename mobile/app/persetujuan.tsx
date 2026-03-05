import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tag, RotateCcw, Wallet, Check, X } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function PersetujuanScreen() {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [filter, setFilter] = useState('pending');

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('persetujuan').select('*').eq('status', filter).order('tanggal_pengajuan', { ascending: false }).limit(50);
            setApprovals(data || []);
        })();
    }, [filter]);

    const filters = [
        { key: 'pending', label: 'Menunggu' },
        { key: 'disetujui', label: 'Disetujui' },
        { key: 'ditolak', label: 'Ditolak' },
    ];

    const typeIcon = (jenis: string) => {
        if (jenis?.includes('diskon') || jenis?.includes('harga')) return { Icon: Tag, color: '#f59e0b', bg: '#fef3c7' };
        if (jenis?.includes('retur') || jenis?.includes('mutasi')) return { Icon: RotateCcw, color: '#3b82f6', bg: '#dbeafe' };
        return { Icon: Wallet, color: '#a855f7', bg: '#f3e8ff' };
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {filters.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: filter === f.key ? '#18181b' : '#f4f4f5' }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.key ? '#fff' : '#52525b' }}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView className="flex-1 px-4">
                {approvals.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Check size={40} color="#d4d4d8" />
                        <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Tidak ada persetujuan</Text>
                    </View>
                ) : approvals.map((item, i) => {
                    const { Icon, color, bg } = typeIcon(item.jenis);
                    return (
                        <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} color={color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#18181b' }}>{item.jenis?.replace(/_/g, ' ')?.toUpperCase()}</Text>
                                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}</Text>
                                </View>
                            </View>
                            {item.keterangan && <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 12 }}>{item.keterangan}</Text>}
                            {filter === 'pending' && (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                                        <X size={16} color="#ef4444" />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444' }}>Tolak</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ flex: 1, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                                        <Check size={16} color="#ffffff" />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Setujui</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}
                <View style={{ height: 8 }} />
            </ScrollView>
        </View>
    );
}
