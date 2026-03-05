import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function TambahPettyCashScreen() {
    const router = useRouter();
    const [form, setForm] = useState({ jumlah: '', kategori: '', keterangan: '', jenis: 'pengeluaran' });
    const update = (k: string, v: string) => setForm({ ...form, [k]: v });

    const categories = ['Transport', 'Makan', 'BBM', 'Operasional', 'Lainnya'];

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Jenis Transaksi</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {['pengeluaran', 'pemasukan'].map(j => (
                    <TouchableOpacity key={j} onPress={() => update('jenis', j)}
                        style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: form.jenis === j ? (j === 'pengeluaran' ? '#ef4444' : '#22c55e') : '#f4f4f5' }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: form.jenis === j ? '#fff' : '#52525b', textTransform: 'capitalize' }}>{j}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Jumlah *</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, fontWeight: '700', color: '#18181b' }}
                    placeholder="Rp 0"
                    placeholderTextColor="#a1a1aa"
                    keyboardType="numeric"
                    value={form.jumlah}
                    onChangeText={v => update('jumlah', v)}
                />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Kategori</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {categories.map(c => (
                        <TouchableOpacity key={c} onPress={() => update('kategori', c)}
                            style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: form.kategori === c ? '#18181b' : '#f4f4f5' }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: form.kategori === c ? '#fff' : '#52525b' }}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginTop: 12, marginBottom: 4 }}>Keterangan</Text>
                <TextInput
                    style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', textAlignVertical: 'top' }}
                    placeholder="Catatan..."
                    placeholderTextColor="#a1a1aa"
                    multiline
                    numberOfLines={3}
                    value={form.keterangan}
                    onChangeText={v => update('keterangan', v)}
                />
            </View>

            <TouchableOpacity
                style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 }}
                onPress={() => {
                    if (!form.jumlah) return Alert.alert('Error', 'Jumlah wajib diisi');
                    Alert.alert('Sukses', 'Berhasil disimpan!', [{ text: 'OK', onPress: () => router.back() }]);
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Simpan</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
