import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Share2 } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function DetailPenjualanScreen() {
    const { id } = useLocalSearchParams();
    const [sale, setSale] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('penjualan').select('*, pelanggan:pelanggan_id(nama, telepon)').eq('id', id).single();
            setSale(data);
            const { data: lineItems } = await supabase.from('penjualan_items').select('*, barang:barang_id(nama)').eq('penjualan_id', id);
            setItems(lineItems || []);
        })();
    }, [id]);

    if (!sale) return <View className="flex-1 bg-white items-center justify-center"><Text style={{ color: '#a1a1aa' }}>Memuat...</Text></View>;
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const statusColor = sale.status === 'lunas' ? { bg: '#dcfce7', text: '#15803d' } : sale.status === 'batal' ? { bg: '#fee2e2', text: '#b91c1c' } : { bg: '#fef3c7', text: '#92400e' };

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Invoice Header */}
            <View style={{ alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
                <Text style={{ fontSize: 9, color: '#a1a1aa', fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>No. Nota</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#18181b', fontFamily: 'monospace', marginTop: 4 }}>{sale.transaksi || '-'}</Text>
                <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>{new Date(sale.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                <View style={{ backgroundColor: statusColor.bg, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor.text, textTransform: 'capitalize' }}>{sale.status}</Text>
                </View>
            </View>

            <View className="px-4 pt-4" style={{ gap: 12 }}>
                {/* Customer */}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5' }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Pelanggan</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#18181b' }}>{(sale.pelanggan as any)?.nama || 'Pelanggan Umum'}</Text>
                    {(sale.pelanggan as any)?.telepon && <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{(sale.pelanggan as any).telepon}</Text>}
                </View>

                {/* Items */}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5' }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Item Barang</Text>
                    {items.map((item, i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: '#fafafa' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: '#18181b' }}>{(item.barang as any)?.nama || '-'}</Text>
                                <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{item.jumlah} x {formatRp(item.harga || 0)}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{formatRp(item.subtotal || 0)}</Text>
                        </View>
                    ))}
                </View>

                {/* Payment Summary */}
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: '#71717a' }}>Subtotal</Text>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#18181b' }}>{formatRp(sale.subtotal || sale.total || 0)}</Text>
                    </View>
                    {sale.diskon > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ fontSize: 12, color: '#ef4444' }}>Diskon</Text>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#ef4444' }}>-{formatRp(sale.diskon)}</Text>
                        </View>
                    )}
                    <View style={{ height: 1, backgroundColor: '#f4f4f5', marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#18181b' }}>Total</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: TEAL }}>{formatRp(sale.total || 0)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#a1a1aa' }}>Pembayaran</Text>
                        <View style={{ backgroundColor: '#f4f4f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#52525b', textTransform: 'capitalize' }}>{sale.metode_pembayaran || 'tunai'}</Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
                    <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                        <FileText size={16} color="#18181b" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>Cetak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                        <Share2 size={16} color="#ffffff" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Kirim</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
