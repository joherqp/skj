import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpDown } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function MutasiPelangganScreen() {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('mutasi_pelanggan').select('*, pelanggan:pelanggan_id(nama)').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                {items.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <ArrowUpDown size={40} color="#d4d4d8" />
                        <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Belum ada mutasi pelanggan</Text>
                    </View>
                ) : items.map((item, i) => (
                    <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{(item.pelanggan as any)?.nama || '-'}</Text>
                        <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{item.jenis} • {new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
                        {item.keterangan && <Text style={{ fontSize: 11, color: '#71717a', marginTop: 4 }}>{item.keterangan}</Text>}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
