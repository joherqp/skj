import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, CheckCircle, AlertTriangle } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function NotifikasiScreen() {
    const { user } = useAuth();
    const [notifs, setNotifs] = useState<any[]>([]);
    const [filter, setFilter] = useState('semua');

    useEffect(() => {
        (async () => {
            let query = supabase.from('notifikasi').select('*').order('tanggal', { ascending: false }).limit(50);
            if (user?.id) query = query.eq('user_id', user.id);
            const { data } = await query;
            setNotifs(data || []);
        })();
    }, [user]);

    const filters = ['Semua', 'Belum Dibaca', 'Persetujuan'];
    const unreadCount = notifs.filter(n => !n.dibaca).length;

    const iconForType = (jenis: string) => {
        switch (jenis) {
            case 'success': return { Icon: CheckCircle, color: '#22c55e', bg: '#dcfce7' };
            case 'warning': return { Icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' };
            case 'error': return { Icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2' };
            default: return { Icon: Bell, color: TEAL, bg: `${TEAL}15` };
        }
    };

    const filtered = filter === 'belum dibaca' ? notifs.filter(n => !n.dibaca)
        : filter === 'persetujuan' ? notifs.filter(n => n.link?.includes('persetujuan'))
            : notifs;

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} menit lalu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} jam lalu`;
        return `${Math.floor(hours / 24)} hari lalu`;
    };

    return (
        <View className="flex-1 bg-white">
            {/* Filter Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                {filters.map(f => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f.toLowerCase())}
                        style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: filter === f.toLowerCase() ? '#18181b' : '#f4f4f5' }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: filter === f.toLowerCase() ? '#fff' : '#52525b' }}>{f}</Text>
                        {f === 'Belum Dibaca' && unreadCount > 0 && (
                            <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginLeft: 2 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{unreadCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView className="flex-1 px-4">
                {filtered.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                        <Bell size={40} color="#d4d4d8" />
                        <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 12 }}>Tidak ada notifikasi</Text>
                    </View>
                ) : filtered.map((notif, i) => {
                    const { Icon, color, bg } = iconForType(notif.jenis);
                    return (
                        <View
                            key={notif.id || i}
                            style={{ borderRadius: 16, padding: 14, marginBottom: 8, flexDirection: 'row', backgroundColor: !notif.dibaca ? `${TEAL}08` : '#fff', borderWidth: 1, borderColor: !notif.dibaca ? `${TEAL}20` : '#f4f4f5' }}
                        >
                            {!notif.dibaca && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL, marginTop: 4, marginRight: 8 }} />}
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Icon size={18} color={color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{notif.judul}</Text>
                                <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }} numberOfLines={2}>{notif.pesan}</Text>
                                <Text style={{ fontSize: 10, color: '#a1a1aa', marginTop: 4 }}>{timeAgo(notif.tanggal)}</Text>
                            </View>
                        </View>
                    );
                })}
                <View style={{ height: 8 }} />
            </ScrollView>
        </View>
    );
}
