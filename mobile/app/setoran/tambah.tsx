import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function TambahSetoranScreen() {
    const router = useRouter();
    const [form, setForm] = useState({ jumlah: '', keterangan: '', metode: 'tunai' });
    const update = (k: string, v: string) => setForm({ ...form, [k]: v });
    const methods = ['tunai', 'transfer'];

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Informasi Setoran</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Jumlah Setoran *</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, fontWeight: '700', color: '#18181b' }}
                    placeholder="Rp 0"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="numeric"
                    value={form.jumlah}
                    onChangeText={v => update('jumlah', v)}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Metode *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {methods.map(m => (
                        <TouchableOpacity key={m} onPress={() => update('metode', m)}
                            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: form.metode === m ? TEAL : '#f4f4f5' }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: form.metode === m ? '#fff' : '#52525b', textTransform: 'capitalize' }}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Keterangan</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', textAlignVertical: 'top' }}
                    placeholder="Catatan setoran..."
                    placeholderTextColor="#a1a1aa"
                    multiline
                    numberOfLines={3}
                    value={form.keterangan}
                    onChangeText={v => update('keterangan', v)}
                />
            </View>

            {/* Bukti */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Bukti Setoran</Text>
            <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center', gap: 8, marginBottom: 16, borderStyle: 'dashed' }}>
                <Camera size={28} color="#a1a1aa" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#71717a' }}>Ambil Foto Bukti</Text>
                <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Tap untuk mengambil foto atau pilih dari galeri</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 }}
                onPress={() => {
                    if (!form.jumlah) return Alert.alert('Error', 'Jumlah setoran wajib diisi');
                    Alert.alert('Sukses', 'Setoran berhasil disimpan!', [{ text: 'OK', onPress: () => router.back() }]);
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Simpan Setoran</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
