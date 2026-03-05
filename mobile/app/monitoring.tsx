import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function MonitoringScreen() {
    const teamMembers = [
        { name: 'Ahmad Ridwan', status: 'online', location: 'Sukabumi Kota', time: '5 menit lalu', distance: '2.3 km' },
        { name: 'Budi Santoso', status: 'online', location: 'Cibadak', time: '12 menit lalu', distance: '8.1 km' },
        { name: 'Siti Nurhaliza', status: 'offline', location: 'Parung Kuda', time: '2 jam lalu', distance: '15 km' },
    ];

    return (
        <View className="flex-1 bg-white">
            {/* Map Placeholder */}
            <View style={{ height: '55%', backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={48} color="#a1a1aa" />
                <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 8 }}>Peta akan tampil di sini</Text>
                <Text style={{ fontSize: 10, color: '#d4d4d8' }}>Memerlukan Google Maps API Key</Text>
            </View>

            {/* Bottom Sheet */}
            <View style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, paddingHorizontal: 16, paddingTop: 12 }}>
                <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#18181b', borderRadius: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Tim Saya</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f4f4f5', borderRadius: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b' }}>Rute</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    {teamMembers.map((member, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#fafafa' }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#52525b' }}>{member.name.substring(0, 2)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>{member.name}</Text>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: member.status === 'online' ? '#22c55e' : '#d4d4d8' }} />
                                </View>
                                <Text style={{ fontSize: 11, color: '#a1a1aa' }}>{member.location} • {member.time}</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#71717a' }}>{member.distance}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}
