import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Building, GitBranch, Users2, UserCog, Package, Tag, Ruler, DollarSign, Percent, MapPin, CreditCard, Target, Database, ShieldCheck, ChevronRight } from 'lucide-react-native';

const TEAL = '#0d9488';

const sections = [
    {
        title: 'Data Master',
        items: [
            { label: 'Profil Perusahaan', icon: Building },
            { label: 'Cabang', icon: GitBranch },
            { label: 'Karyawan', icon: Users2 },
            { label: 'Pengguna', icon: UserCog },
        ]
    },
    {
        title: 'Produk & Harga',
        items: [
            { label: 'Master Produk', icon: Package },
            { label: 'Kategori Produk', icon: Tag },
            { label: 'Satuan', icon: Ruler },
            { label: 'Harga', icon: DollarSign },
            { label: 'Promo', icon: Percent },
        ]
    },
    {
        title: 'Pelanggan',
        items: [
            { label: 'Kategori Pelanggan', icon: Users2 },
            { label: 'Area/Wilayah', icon: MapPin },
        ]
    },
    {
        title: 'Keuangan',
        items: [
            { label: 'Rekening Bank', icon: CreditCard },
            { label: 'Target Penjualan', icon: Target },
        ]
    },
    {
        title: 'Sistem',
        items: [
            { label: 'Backup Data', icon: Database },
            { label: 'Data Integrity', icon: ShieldCheck },
        ]
    },
];

export default function PengaturanScreen() {
    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            {sections.map((section, si) => (
                <View key={si} style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{section.title}</Text>
                    <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f4f4f5', overflow: 'hidden' }}>
                        {section.items.map((item, ii) => (
                            <TouchableOpacity
                                key={ii}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: ii < section.items.length - 1 ? 1 : 0, borderBottomColor: '#fafafa', gap: 12 }}
                            >
                                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
                                    <item.icon size={16} color="#52525b" />
                                </View>
                                <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: '#18181b' }}>{item.label}</Text>
                                <ChevronRight size={16} color="#d4d4d8" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}
