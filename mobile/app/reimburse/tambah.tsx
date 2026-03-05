import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Camera, Paperclip } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function TambahReimburseScreen() {
    const router = useRouter();
    const [form, setForm] = useState({ jumlah: '', jenis: '', keterangan: '' });
    const update = (k: string, v: string) => setForm({ ...form, [k]: v });

    const types = ['BBM', 'Uang Makan', 'Transport', 'Operasional', 'Lainnya'];

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Jenis Reimburse *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {types.map(t => (
                        <TouchableOpacity key={t} onPress={() => update('jenis', t)}
                            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: form.jenis === t ? TEAL : '#f4f4f5' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: form.jenis === t ? '#fff' : '#52525b' }}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Jumlah *</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, fontWeight: '700', color: '#18181b' }}
                    placeholder="Rp 0"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="numeric"
                    value={form.jumlah}
                    onChangeText={v => update('jumlah', v)}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Keterangan</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', textAlignVertical: 'top' }}
                    placeholder="Detail pengeluaran..."
                    placeholderTextColor="#a1a1aa"
                    multiline
                    numberOfLines={3}
                    value={form.keterangan}
                    onChangeText={v => update('keterangan', v)}
                />
            </View>

            {/* Bukti */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Lampiran Bukti</Text>
            <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#f4f4f5', alignItems: 'center', gap: 8, marginBottom: 16, borderStyle: 'dashed' }}>
                <Paperclip size={28} color="#a1a1aa" />
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#71717a' }}>Upload Bukti Pengeluaran</Text>
                <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Format: JPG, PNG, PDF (maks 5MB)</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 }}
                onPress={() => {
                    if (!form.jumlah || !form.jenis) return Alert.alert('Error', 'Jenis dan jumlah wajib diisi');
                    Alert.alert('Sukses', 'Reimburse berhasil diajukan!', [{ text: 'OK', onPress: () => router.back() }]);
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Ajukan Reimburse</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
