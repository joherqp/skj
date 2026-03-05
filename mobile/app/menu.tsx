import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import {
    Clock, Package, Users, ShoppingCart, Wallet, BarChart3,
    MapPin, Settings, CheckCircle, Bell, User, LogOut
} from 'lucide-react-native';

const TEAL = '#0d9488';

interface MenuItemData {
    icon: any;
    label: string;
    description: string;
    path: string;
    badge?: number;
    color: string;
    textColor: string;
}

function MenuCard({ item, onPress }: { item: MenuItemData; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f4f4f5' }}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={{ padding: 10, borderRadius: 12, backgroundColor: item.color }}>
                <item.icon size={20} color={item.textColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: '#18181b' }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: '#71717a' }}>{item.description}</Text>
            </View>
            {item.badge !== undefined && item.badge > 0 && (
                <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, minWidth: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{item.badge}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function MenuScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const mainMenuItems: MenuItemData[] = [
        { icon: Clock, label: 'Absensi', description: 'Check in & check out harian', path: '/absensi', color: '#06b6d415', textColor: '#06b6d4' },
        { icon: Package, label: 'Barang', description: 'Stok, mutasi, permintaan', path: '/(tabs)/barang', color: `${TEAL}15`, textColor: TEAL },
        { icon: Users, label: 'Pelanggan', description: 'Data pelanggan & mutasi', path: '/(tabs)/pelanggan', color: '#22c55e15', textColor: '#22c55e' },
        { icon: ShoppingCart, label: 'Penjualan', description: 'Buat nota & ringkasan', path: '/(tabs)/penjualan', color: '#f59e0b15', textColor: '#f59e0b' },
        { icon: Wallet, label: 'Setoran', description: 'Setor & riwayat setoran', path: '/setoran', color: '#a855f715', textColor: '#a855f7' },
        { icon: Wallet, label: 'Petty Cash', description: 'Pengeluaran operasional', path: '/petty-cash', color: '#6366f115', textColor: '#6366f1' },
        { icon: Wallet, label: 'Reimburse', description: 'Ajukan penggantian biaya', path: '/reimburse', color: '#ec489915', textColor: '#ec4899' },
    ];

    const reportMenuItems: MenuItemData[] = [
        { icon: BarChart3, label: 'Laporan', description: 'Penjualan, stok, setoran', path: '/laporan', color: `${TEAL}15`, textColor: TEAL },
        { icon: BarChart3, label: 'Rekap Penjualan', description: 'Ringkasan & export', path: '/rekap-penjualan', color: '#f59e0b15', textColor: '#f59e0b' },
        { icon: MapPin, label: 'Monitoring', description: 'Tracking & live map', path: '/monitoring', color: '#06b6d415', textColor: '#06b6d4' },
        { icon: CheckCircle, label: 'Persetujuan', description: 'Pusat approval request', path: '/persetujuan', color: '#22c55e15', textColor: '#22c55e', badge: 0 },
    ];

    const accountMenuItems: MenuItemData[] = [
        { icon: Bell, label: 'Notifikasi', description: 'Pemberitahuan sistem', path: '/notifikasi', color: '#f59e0b15', textColor: '#f59e0b', badge: 0 },
        { icon: User, label: 'Profil', description: 'Kelola akun Anda', path: '/profil-user', color: '#f4f4f5', textColor: '#71717a' },
        { icon: Settings, label: 'Pengaturan', description: 'Konfigurasi sistem', path: '/pengaturan', color: '#f4f4f5', textColor: '#71717a' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ gap: 20 }}>
                {/* Section: Menu Utama */}
                <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', paddingLeft: 4 }}>Menu Utama</Text>
                    {mainMenuItems.map((item, i) => (
                        <MenuCard key={i} item={item} onPress={() => router.push(item.path as any)} />
                    ))}
                </View>

                {/* Section: Laporan & Monitoring */}
                <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', paddingLeft: 4 }}>Laporan & Monitoring</Text>
                    {reportMenuItems.map((item, i) => (
                        <MenuCard key={i} item={item} onPress={() => router.push(item.path as any)} />
                    ))}
                </View>

                {/* Section: Akun & Pengaturan */}
                <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', paddingLeft: 4 }}>Akun & Pengaturan</Text>
                    {accountMenuItems.map((item, i) => (
                        <MenuCard key={i} item={item} onPress={() => router.push(item.path as any)} />
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#fecaca' }}
                    onPress={() => { logout(); router.replace('/'); }}
                    activeOpacity={0.7}
                >
                    <View style={{ padding: 10, borderRadius: 12, backgroundColor: '#fee2e2' }}>
                        <LogOut size={20} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 13, color: '#ef4444' }}>Keluar</Text>
                        <Text style={{ fontSize: 11, color: '#71717a' }}>Logout dari aplikasi</Text>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
