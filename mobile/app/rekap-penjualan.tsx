import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Download } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function RekapPenjualanScreen() {
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            {/* Date Range */}
            <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#52525b' }}>1 Feb 2026 - 27 Feb 2026</Text>
            </TouchableOpacity>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                    { label: 'Transaksi', value: '-' },
                    { label: 'Total', value: '-' },
                    { label: 'Rata-rata', value: '-' },
                ].map((s, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '700', textTransform: 'uppercase' }}>{s.label}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#18181b', marginTop: 4 }}>{s.value}</Text>
                    </View>
                ))}
            </View>

            {/* Top Products */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Top 5 Produk</Text>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fafafa' }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#52525b' }}>{i}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, color: '#a1a1aa' }}>Data akan tampil setelah terkoneksi</Text>
                    </View>
                ))}
            </View>

            {/* Payment */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Metode Pembayaran</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                        { label: 'Tunai', color: '#3b82f6', bg: '#dbeafe' },
                        { label: 'Transfer', color: '#22c55e', bg: '#dcfce7' },
                        { label: 'Tempo', color: '#f59e0b', bg: '#fef3c7' },
                    ].map((m, i) => (
                        <View key={i} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: m.color }}>{m.label}</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: m.color, marginTop: 4 }}>-</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Export */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Download size={18} color="#ffffff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Export PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <Download size={18} color="#18181b" />
                    <Text style={{ color: '#18181b', fontWeight: '600', fontSize: 13 }}>Export Excel</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
