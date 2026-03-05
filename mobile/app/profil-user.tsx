import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { User, Settings, Lock, Info, HelpCircle, LogOut, ChevronRight, Shield } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function ProfilUserScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const menuSections = [
        {
            title: 'Akun',
            items: [
                { icon: User, label: 'Informasi Pribadi', desc: 'Nama, email, telepon' },
                { icon: Lock, label: 'Ubah Password', desc: 'Ganti password akun' },
                { icon: Shield, label: 'Keamanan', desc: 'Pengaturan keamanan' },
            ]
        },
        {
            title: 'Lainnya',
            items: [
                { icon: Info, label: 'Tentang Aplikasi', desc: 'CVSKJ v2.0' },
                { icon: HelpCircle, label: 'Bantuan', desc: 'FAQ & dukungan' },
            ]
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1">
                {/* Profile Header */}
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${TEAL}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: TEAL }}>{user?.nama?.substring(0, 2)?.toUpperCase() || 'U'}</Text>
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#18181b' }}>{user?.nama || 'User'}</Text>
                    <Text style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>{user?.email || ''}</Text>
                    <View style={{ backgroundColor: `${TEAL}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: TEAL, textTransform: 'uppercase' }}>{user?.roles?.join(', ') || 'Staff'}</Text>
                    </View>
                </View>

                {/* Menu Sections */}
                <View style={{ paddingHorizontal: 16, gap: 20 }}>
                    {menuSections.map((sec, si) => (
                        <View key={si} style={{ gap: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#71717a', paddingLeft: 4 }}>{sec.title}</Text>
                            <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f4f4f5', overflow: 'hidden' }}>
                                {sec.items.map((item, ii) => (
                                    <TouchableOpacity
                                        key={ii}
                                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: ii < sec.items.length - 1 ? 1 : 0, borderBottomColor: '#f4f4f5', gap: 12 }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
                                            <item.icon size={16} color="#52525b" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '500', color: '#18181b' }}>{item.label}</Text>
                                            <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{item.desc}</Text>
                                        </View>
                                        <ChevronRight size={16} color="#d4d4d8" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}

                    {/* Logout */}
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fecaca' }}
                        onPress={() => { logout(); router.replace('/'); }}
                    >
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                            <LogOut size={16} color="#ef4444" />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444' }}>Keluar dari Akun</Text>
                    </TouchableOpacity>

                    <View style={{ height: 24 }} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
