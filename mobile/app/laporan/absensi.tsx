import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL = '#0d9488';

export default function LaporanAbsensiScreen() {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('absensi').select('*, karyawan:karyawan_id(nama)').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);

    const statusColor = (s: string) => s === 'hadir' ? '#22c55e' : s === 'terlambat' ? '#f59e0b' : s === 'izin' ? '#3b82f6' : '#ef4444';

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                {items.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Text style={{ fontSize: 13, color: '#a1a1aa' }}>Belum ada data absensi</Text>
                    </View>
                ) : items.map((item, i) => (
                    <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor(item.status), marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{(item.karyawan as any)?.nama || '-'}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{new Date(item.tanggal).toLocaleDateString('id-ID')} • {item.jam_masuk || '-'}</Text>
                        </View>
                        <View style={{ backgroundColor: `${statusColor(item.status)}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: statusColor(item.status), textTransform: 'capitalize' }}>{item.status}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
