import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const TEAL = '#0d9488';

export default function LaporanPiutangScreen() {
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('pelanggan').select('id, nama, piutang, limit_kredit').gt('piutang', 0).order('piutang', { ascending: false });
            setItems(data || []);
        })();
    }, []);

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const totalPiutang = items.reduce((s, i) => s + (i.piutang || 0), 0);

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4">
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Total Piutang</Text>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#ef4444' }}>{formatRp(totalPiutang)}</Text>
                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>{items.length} pelanggan</Text>
                </View>

                {items.map((c, i) => {
                    const pct = c.limit_kredit > 0 ? Math.min(100, (c.piutang / c.limit_kredit) * 100) : 0;
                    return (
                        <View key={c.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{c.nama}</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ef4444' }}>{formatRp(c.piutang || 0)}</Text>
                            </View>
                            {c.limit_kredit > 0 && (
                                <>
                                    <View style={{ height: 4, backgroundColor: '#f4f4f5', borderRadius: 2, marginTop: 8 }}>
                                        <View style={{ height: 4, borderRadius: 2, width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : TEAL }} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: '#a1a1aa', marginTop: 4 }}>Limit: {formatRp(c.limit_kredit)} ({Math.round(pct)}%)</Text>
                                </>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}
