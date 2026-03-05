import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { MapPin } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function EditPelangganScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [form, setForm] = useState({ nama: '', namaPemilik: '', telepon: '', alamat: '', limitKredit: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('pelanggan').select('*').eq('id', id).single();
            if (data) setForm({ nama: data.nama || '', namaPemilik: data.nama_pemilik || '', telepon: data.telepon || '', alamat: data.alamat || '', limitKredit: String(data.limit_kredit || 0) });
            setLoading(false);
        })();
    }, [id]);

    const update = (k: string, v: string) => setForm({ ...form, [k]: v });

    if (loading) return <View className="flex-1 bg-white items-center justify-center"><Text style={{ color: '#a1a1aa' }}>Memuat...</Text></View>;

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Nama Toko *</Text>
                <TextInput style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', marginBottom: 12 }} value={form.nama} onChangeText={v => update('nama', v)} />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Nama Pemilik</Text>
                <TextInput style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', marginBottom: 12 }} value={form.namaPemilik} onChangeText={v => update('namaPemilik', v)} />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>No. Telepon</Text>
                <TextInput style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', marginBottom: 12 }} value={form.telepon} onChangeText={v => update('telepon', v)} keyboardType="phone-pad" />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Alamat</Text>
                <TextInput style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b', marginBottom: 12, textAlignVertical: 'top' }} value={form.alamat} onChangeText={v => update('alamat', v)} multiline numberOfLines={3} />

                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52525b', marginBottom: 4 }}>Limit Kredit</Text>
                <TextInput style={{ backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 13, color: '#18181b' }} value={form.limitKredit} onChangeText={v => update('limitKredit', v)} keyboardType="numeric" />
            </View>

            <TouchableOpacity style={{ backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 }}
                onPress={() => { if (!form.nama) return Alert.alert('Error', 'Nama wajib diisi'); Alert.alert('Sukses', 'Pelanggan berhasil diupdate!', [{ text: 'OK', onPress: () => router.back() }]); }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Simpan Perubahan</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
