import { View, Text, ScrollView } from 'react-native';
import { TrendingUp, Medal } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function LaporanSalesPerformanceScreen() {
    const mockData = [
        { name: 'Ahmad Ridwan', target: 50000000, actual: 42000000 },
        { name: 'Budi Santoso', target: 50000000, actual: 38000000 },
        { name: 'Siti Nurhaliza', target: 40000000, actual: 35000000 },
    ];
    const formatRp = (n: number) => `Rp ${(n / 1000000).toFixed(0)}jt`;

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ alignItems: 'center', paddingVertical: 16, marginBottom: 16 }}>
                <TrendingUp size={32} color={TEAL} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#18181b', marginTop: 8 }}>Sales Performance</Text>
                <Text style={{ fontSize: 11, color: '#a1a1aa' }}>Periode: Februari 2026</Text>
            </View>

            {mockData.map((s, i) => {
                const pct = Math.round((s.actual / s.target) * 100);
                return (
                    <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {i === 0 && <Medal size={16} color="#f59e0b" />}
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#18181b' }}>{s.name}</Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>{pct}%</Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#f4f4f5', borderRadius: 3 }}>
                            <View style={{ height: 6, borderRadius: 3, width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444' }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Actual: {formatRp(s.actual)}</Text>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Target: {formatRp(s.target)}</Text>
                        </View>
                    </View>
                );
            })}
        </ScrollView>
    );
}
