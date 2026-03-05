import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Phone, MessageCircle, MapPin, CreditCard, ShoppingCart } from 'lucide-react-native';
import { Linking } from 'react-native';

const TEAL = '#0d9488';

export default function DetailPelangganScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [customer, setCustomer] = useState<any>(null);
    const [salesHistory, setSalesHistory] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('pelanggan').select('*, kategori:kategori_id(nama)').eq('id', id).single();
            setCustomer(data);
            const { data: sales } = await supabase.from('penjualan').select('id, transaksi, tanggal, total, status').eq('pelanggan_id', id).order('tanggal', { ascending: false }).limit(10);
            setSalesHistory(sales || []);
        })();
    }, [id]);

    if (!customer) return <View className="flex-1 bg-white items-center justify-center"><Text style={{ color: '#a1a1aa' }}>Memuat...</Text></View>;
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Profile Card */}
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${TEAL}15`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: TEAL }}>{customer.nama?.substring(0, 2)?.toUpperCase()}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#18181b', marginTop: 10 }}>{customer.nama}</Text>
                {(customer.kategori as any)?.nama ? (
                    <View style={{ backgroundColor: `${TEAL}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: TEAL }}>{(customer.kategori as any).nama}</Text>
                    </View>
                ) : null}
            </View>

            {/* Contact Buttons */}
            {customer.telepon ? (
                <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 20 }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f4f4f5' }} onPress={() => Linking.openURL(`tel:${customer.telepon}`)}>
                        <Phone size={16} color="#18181b" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>Telepon</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#dcfce7' }} onPress={() => Linking.openURL(`https://wa.me/${customer.telepon?.replace(/^0/, '62')}`)}>
                        <MessageCircle size={16} color="#22c55e" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#22c55e' }}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* Info Cards */}
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
                {customer.alamat ? (
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', flexDirection: 'row', gap: 12 }}>
                        <MapPin size={16} color="#a1a1aa" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase' }}>Alamat</Text>
                            <Text style={{ fontSize: 13, color: '#18181b', marginTop: 2 }}>{customer.alamat}</Text>
                        </View>
                    </View>
                ) : null}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', flexDirection: 'row', gap: 12 }}>
                    <CreditCard size={16} color="#a1a1aa" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase' }}>Piutang / Kredit</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b', marginTop: 2 }}>{formatRp(customer.piutang || 0)}</Text>
                        <Text style={{ fontSize: 11, color: '#a1a1aa' }}>Limit: {formatRp(customer.limit_kredit || 0)}</Text>
                    </View>
                </View>
            </View>

            {/* Sales History */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', marginBottom: 8, paddingLeft: 4 }}>Riwayat Transaksi</Text>
                {salesHistory.map((s, i) => (
                    <TouchableOpacity key={s.id || i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        onPress={() => router.push(`/penjualan/${s.id}` as any)}>
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#18181b' }}>{s.transaksi}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>{new Date(s.tanggal).toLocaleDateString('id-ID')}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{formatRp(s.total || 0)}</Text>
                            <View style={{ backgroundColor: s.status === 'lunas' ? '#dcfce7' : '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: s.status === 'lunas' ? '#15803d' : '#92400e' }}>{s.status}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ height: 24 }} />
        </ScrollView>
    );
}
