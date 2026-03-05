import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function Layout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <Stack screenOptions={{ headerShown: false, headerTintColor: '#0d9488' }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="menu" options={{ presentation: 'modal', title: 'Menu' }} />
                    <Stack.Screen name="profil-user" options={{ headerShown: true, title: 'Profil' }} />
                    <Stack.Screen name="penjualan/[id]" options={{ headerShown: true, title: 'Detail Penjualan' }} />
                    <Stack.Screen name="penjualan/tambah" options={{ headerShown: true, title: 'Tambah Penjualan' }} />
                    <Stack.Screen name="pelanggan/[id]" options={{ headerShown: true, title: 'Detail Pelanggan' }} />
                    <Stack.Screen name="pelanggan/tambah" options={{ headerShown: true, title: 'Tambah Pelanggan' }} />
                    <Stack.Screen name="barang/[id]" options={{ headerShown: true, title: 'Detail Barang' }} />
                    <Stack.Screen name="monitoring" options={{ headerShown: true, title: 'Monitoring' }} />
                    <Stack.Screen name="laporan" options={{ headerShown: true, title: 'Laporan' }} />
                    <Stack.Screen name="absensi" options={{ headerShown: true, title: 'Absensi' }} />
                    <Stack.Screen name="setoran" options={{ headerShown: true, title: 'Setoran' }} />
                    <Stack.Screen name="petty-cash" options={{ headerShown: true, title: 'Petty Cash' }} />
                    <Stack.Screen name="reimburse" options={{ headerShown: true, title: 'Reimburse' }} />
                    <Stack.Screen name="persetujuan" options={{ headerShown: true, title: 'Persetujuan' }} />
                    <Stack.Screen name="notifikasi" options={{ headerShown: true, title: 'Notifikasi' }} />
                    <Stack.Screen name="pengaturan" options={{ headerShown: true, title: 'Pengaturan' }} />
                    <Stack.Screen name="rekap-penjualan" options={{ headerShown: true, title: 'Rekap Penjualan' }} />
                    <Stack.Screen name="setoran/tambah" options={{ headerShown: true, title: 'Tambah Setoran' }} />
                    <Stack.Screen name="petty-cash/tambah" options={{ headerShown: true, title: 'Tambah Petty Cash' }} />
                    <Stack.Screen name="reimburse/tambah" options={{ headerShown: true, title: 'Ajukan Reimburse' }} />
                    <Stack.Screen name="barang/restock" options={{ headerShown: true, title: 'Restock Barang' }} />
                    <Stack.Screen name="barang/mutasi" options={{ headerShown: true, title: 'Mutasi Barang' }} />
                    <Stack.Screen name="barang/penyesuaian" options={{ headerShown: true, title: 'Penyesuaian Stok' }} />
                    <Stack.Screen name="pelanggan/mutasi" options={{ headerShown: true, title: 'Mutasi Pelanggan' }} />
                    <Stack.Screen name="pelanggan/edit/[id]" options={{ headerShown: true, title: 'Edit Pelanggan' }} />
                    <Stack.Screen name="setoran/[id]" options={{ headerShown: true, title: 'Detail Setoran' }} />
                    <Stack.Screen name="laporan/stok" options={{ headerShown: true, title: 'Laporan Stok' }} />
                    <Stack.Screen name="laporan/piutang" options={{ headerShown: true, title: 'Laporan Piutang' }} />
                    <Stack.Screen name="laporan/absensi" options={{ headerShown: true, title: 'Laporan Absensi' }} />
                    <Stack.Screen name="laporan/penjualan" options={{ headerShown: true, title: 'Laporan Penjualan' }} />
                    <Stack.Screen name="laporan/harian" options={{ headerShown: true, title: 'Laporan Harian' }} />
                    <Stack.Screen name="laporan/sales-performance" options={{ headerShown: true, title: 'Sales Performance' }} />
                    <Stack.Screen name="laporan/reimburse" options={{ headerShown: true, title: 'Laporan Reimburse' }} />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
