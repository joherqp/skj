import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Search, Package, ClipboardList } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function PenyesuaianBarangScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('penyesuaian_stok').select('*, barang:barang_id(nama)').order('tanggal', { ascending: false }).limit(50);
            setItems(data || []);
        })();
    }, []);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                {items.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <ClipboardList size={40} color="#d4d4d8" />
                        <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Belum ada penyesuaian stok</Text>
                    </View>
                ) : items.map((item, i) => (
                    <View key={item.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{(item.barang as any)?.nama || '-'}</Text>
                            <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{new Date(item.tanggal).toLocaleDateString('id-ID')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                            <View>
                                <Text style={{ fontSize: 9, color: '#a1a1aa', fontWeight: '700' }}>SEBELUM</Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#71717a' }}>{item.stok_sebelum || 0}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#d4d4d8', alignSelf: 'flex-end' }}>→</Text>
                            <View>
                                <Text style={{ fontSize: 9, color: '#a1a1aa', fontWeight: '700' }}>SESUDAH</Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#18181b' }}>{item.stok_sesudah || 0}</Text>
                            </View>
                        </View>
                        {item.keterangan && <Text style={{ fontSize: 11, color: '#71717a', marginTop: 6 }}>{item.keterangan}</Text>}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
