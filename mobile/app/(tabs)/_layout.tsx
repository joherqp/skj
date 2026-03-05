import { Tabs } from 'expo-router';
import { Home, Package, Users, ShoppingCart, Wallet } from 'lucide-react-native';

const TEAL = '#0d9488';
const GRAY = '#9ca3af';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: TEAL,
                tabBarInactiveTintColor: GRAY,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen name="beranda" options={{ title: 'Beranda', tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }} />
            <Tabs.Screen name="barang" options={{ title: 'Barang', tabBarIcon: ({ color, size }) => <Package size={size} color={color} /> }} />
            <Tabs.Screen name="pelanggan" options={{ title: 'Pelanggan', tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }} />
            <Tabs.Screen name="penjualan" options={{ title: 'Penjualan', tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} /> }} />
            <Tabs.Screen name="profil" options={{ title: 'Setoran', tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} /> }} />
        </Tabs>
    );
}
