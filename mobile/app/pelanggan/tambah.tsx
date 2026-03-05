import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { MapPin } from 'lucide-react-native';

export default function TambahPelanggan() {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [form, setForm] = useState({ nama: '', namaPemilik: '', telepon: '', alamat: '', kategoriId: '', areaId: '', limitKredit: '', catatan: '' });

    useEffect(() => {
        (async () => {
            const [c, a] = await Promise.all([
                supabase.from('kategori_pelanggan').select('id, nama'),
                supabase.from('area').select('id, nama'),
            ]);
            setCategories(c.data || []);
            setAreas(a.data || []);
        })();
    }, []);

    const update = (key: string, val: string) => setForm({ ...form, [key]: val });

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            {/* Informasi Toko */}
            <Text className="text-xs font-bold text-zinc-400 uppercase mb-2">Informasi Toko</Text>
            <View className="bg-white rounded-2xl p-4 border border-zinc-100 mb-4">
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Nama Toko *</Text>
                <TextInput className="bg-zinc-50 rounded-xl px-3 h-11 text-sm text-zinc-900 border border-zinc-200 mb-3" value={form.nama} onChangeText={v => update('nama', v)} placeholder="Masukkan nama toko" placeholderTextColor="#a1a1aa" />
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Nama Pemilik</Text>
                <TextInput className="bg-zinc-50 rounded-xl px-3 h-11 text-sm text-zinc-900 border border-zinc-200 mb-3" value={form.namaPemilik} onChangeText={v => update('namaPemilik', v)} placeholder="Masukkan nama pemilik" placeholderTextColor="#a1a1aa" />
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Kategori *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
                    {categories.map(cat => (
                        <TouchableOpacity key={cat.id} onPress={() => update('kategoriId', cat.id)} className={`px-4 py-2 rounded-full border`} style={{ backgroundColor: form.kategoriId === cat.id ? '#0d9488' : '#fff', borderColor: form.kategoriId === cat.id ? '#0d9488' : '#e5e7eb' }}>
                            <Text className="text-xs font-semibold" style={{ color: form.kategoriId === cat.id ? '#fff' : '#52525b' }}>{cat.nama}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <Text className="text-xs text-zinc-600 font-semibold mb-1">No. Telepon</Text>
                <TextInput className="bg-zinc-50 rounded-xl px-3 h-11 text-sm text-zinc-900 border border-zinc-200" value={form.telepon} onChangeText={v => update('telepon', v)} placeholder="08xx" placeholderTextColor="#a1a1aa" keyboardType="phone-pad" />
            </View>

            {/* Alamat */}
            <Text className="text-xs font-bold text-zinc-400 uppercase mb-2">Alamat</Text>
            <View className="bg-white rounded-2xl p-4 border border-zinc-100 mb-4">
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Alamat Lengkap</Text>
                <TextInput className="bg-zinc-50 rounded-xl px-3 py-3 text-sm text-zinc-900 border border-zinc-200 mb-3" value={form.alamat} onChangeText={v => update('alamat', v)} placeholder="Jl. ..." placeholderTextColor="#a1a1aa" multiline numberOfLines={3} textAlignVertical="top" />
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Area/Wilayah *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
                    {areas.map(area => (
                        <TouchableOpacity key={area.id} onPress={() => update('areaId', area.id)} className={`px-4 py-2 rounded-full border`} style={{ backgroundColor: form.areaId === area.id ? '#0d9488' : '#fff', borderColor: form.areaId === area.id ? '#0d9488' : '#e5e7eb' }}>
                            <Text className="text-xs font-semibold" style={{ color: form.areaId === area.id ? '#fff' : '#52525b' }}>{area.nama}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity className="flex-row items-center bg-zinc-50 rounded-xl px-3 py-3 border border-zinc-200">
                    <MapPin size={16} color="#a1a1aa" />
                    <Text className="text-sm text-zinc-400 ml-2">Pin Lokasi di Peta</Text>
                </TouchableOpacity>
            </View>

            {/* Kredit */}
            <Text className="text-xs font-bold text-zinc-400 uppercase mb-2">Pengaturan Kredit</Text>
            <View className="bg-white rounded-2xl p-4 border border-zinc-100 mb-4">
                <Text className="text-xs text-zinc-600 font-semibold mb-1">Limit Kredit</Text>
                <TextInput className="bg-zinc-50 rounded-xl px-3 h-11 text-sm text-zinc-900 border border-zinc-200" value={form.limitKredit} onChangeText={v => update('limitKredit', v)} placeholder="Rp 0" placeholderTextColor="#a1a1aa" keyboardType="numeric" />
            </View>

            {/* Submit */}
            <TouchableOpacity
                className="rounded-xl py-3.5 items-center mb-8"
                style={{ backgroundColor: '#0d9488' }}
                onPress={() => {
                    if (!form.nama) return Alert.alert('Error', 'Nama toko wajib diisi');
                    Alert.alert('Sukses', 'Pelanggan berhasil disimpan!', [{ text: 'OK', onPress: () => router.back() }]);
                }}
            >
                <Text className="text-white font-bold">Simpan Pelanggan</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
