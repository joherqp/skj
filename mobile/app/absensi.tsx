import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { MapPin, Camera, Clock } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function AbsensiScreen() {
    const [isClockedIn, setIsClockedIn] = useState(false);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const summary = [
        { label: 'Hadir', value: 0, color: '#22c55e' },
        { label: 'Terlambat', value: 0, color: '#f59e0b' },
        { label: 'Izin', value: 0, color: '#3b82f6' },
        { label: 'Alpha', value: 0, color: '#ef4444' },
    ];

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            {/* Date & Time */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#71717a' }}>{dateStr}</Text>
                <Text style={{ fontSize: 48, fontWeight: '800', color: '#18181b', marginTop: 8 }}>{timeStr}</Text>
            </View>

            {/* Status */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isClockedIn ? '#22c55e' : '#d4d4d8', marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#18181b' }}>
                        {isClockedIn ? 'Sudah Clock In' : 'Anda belum absen hari ini'}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <MapPin size={14} color="#a1a1aa" />
                    <Text style={{ fontSize: 11, color: '#a1a1aa', marginLeft: 4 }}>Mendeteksi lokasi...</Text>
                </View>
            </View>

            {/* Clock Button */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <TouchableOpacity
                    style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: isClockedIn ? '#ef4444' : TEAL, alignItems: 'center', justifyContent: 'center', shadowColor: isClockedIn ? '#ef4444' : TEAL, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}
                    onPress={() => setIsClockedIn(!isClockedIn)}
                >
                    <Camera size={32} color="#ffffff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 4 }}>{isClockedIn ? 'Clock Out' : 'Clock In'}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 11, color: '#a1a1aa', marginTop: 12 }}>Ambil foto selfie untuk absensi</Text>
            </View>

            {/* Summary */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {summary.map((s, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>{s.value}</Text>
                        <Text style={{ fontSize: 9, color: '#a1a1aa', fontWeight: '600' }}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Week Calendar */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 32 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#18181b', marginBottom: 12 }}>Minggu Ini</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    {days.map((d, i) => (
                        <View key={i} style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4 }}>{d}</Text>
                            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: i === now.getDay() - 1 ? TEAL : '#f4f4f5' }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: i === now.getDay() - 1 ? '#fff' : '#52525b' }}>
                                    {new Date(now.getTime() - (now.getDay() - 1 - i) * 86400000).getDate()}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}
