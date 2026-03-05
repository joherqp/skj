import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, BarChart3, Package, Wallet, TrendingUp, Clock, Archive, Receipt, Download, ChevronRight } from 'lucide-react-native';

const TEAL = '#0d9488';

const reportCategories = [
    { title: 'Laporan Harian', desc: 'Ringkasan penjualan harian', icon: Calendar, color: `${TEAL}15`, textColor: TEAL, route: '/laporan/harian' },
    { title: 'Laporan Penjualan', desc: 'Detail transaksi penjualan', icon: BarChart3, color: '#22c55e15', textColor: '#22c55e', route: '/laporan/penjualan' },
    { title: 'Laporan Stok', desc: 'Status stok barang', icon: Package, color: '#f59e0b15', textColor: '#f59e0b', route: '/laporan/stok' },
    { title: 'Laporan Piutang', desc: 'Saldo piutang pelanggan', icon: Wallet, color: '#ef444415', textColor: '#ef4444', route: '/laporan/piutang' },
    { title: 'Sales Performance', desc: 'Performa tim sales', icon: TrendingUp, color: '#a855f715', textColor: '#a855f7', route: '/laporan/sales-performance' },
    { title: 'Laporan Absensi', desc: 'Kehadiran karyawan', icon: Clock, color: '#06b6d415', textColor: '#06b6d4', route: '/laporan/absensi' },
    { title: 'Laporan Reimburse', desc: 'Penggantian biaya', icon: Receipt, color: '#6366f115', textColor: '#6366f1', route: '/laporan/reimburse' },
];

export default function LaporanScreen() {
    const router = useRouter();

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ gap: 8 }}>
                {reportCategories.map((cat, i) => (
                    <TouchableOpacity
                        key={i}
                        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        activeOpacity={0.7}
                        onPress={() => router.push(cat.route as any)}
                    >
                        <View style={{ padding: 10, borderRadius: 12, backgroundColor: cat.color }}>
                            <cat.icon size={20} color={cat.textColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }}>{cat.title}</Text>
                            <Text style={{ fontSize: 11, color: '#71717a' }}>{cat.desc}</Text>
                        </View>
                        <ChevronRight size={16} color="#d4d4d8" />
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={{ marginTop: 16, marginBottom: 32, backgroundColor: '#18181b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Download size={18} color="#ffffff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Export ke Excel</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
