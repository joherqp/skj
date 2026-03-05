import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Minus } from 'lucide-react-native';

export default function TambahPenjualan() {
    const router = useRouter();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [items, setItems] = useState<{ barangId: string; nama: string; jumlah: number; harga: number }[]>([]);
    const [searchCust, setSearchCust] = useState('');
    const [searchProd, setSearchProd] = useState('');

    useEffect(() => {
        (async () => {
            const [c, p] = await Promise.all([
                supabase.from('pelanggan').select('id, nama, alamat, kategori:kategori_id(nama)').eq('is_active', true).order('nama').limit(100),
                supabase.from('barang').select('id, nama, kode, harga_jual, stok').eq('is_active', true).order('nama').limit(200),
            ]);
            setCustomers(c.data || []);
            setProducts(p.data || []);
        })();
    }, []);

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const total = items.reduce((sum, i) => sum + i.jumlah * i.harga, 0);

    const addItem = (prod: any) => {
        if (items.find(i => i.barangId === prod.id)) return;
        setItems([...items, { barangId: prod.id, nama: prod.nama, jumlah: 1, harga: prod.harga_jual || 0 }]);
    };

    const updateQty = (idx: number, delta: number) => {
        const updated = [...items];
        updated[idx].jumlah = Math.max(1, updated[idx].jumlah + delta);
        setItems(updated);
    };

    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const steps = [
        { num: 1, label: 'Pelanggan' },
        { num: 2, label: 'Barang' },
        { num: 3, label: 'Ringkasan' },
    ];

    const filteredCust = searchCust ? customers.filter(c => c.nama?.toLowerCase().includes(searchCust.toLowerCase())) : customers;
    const filteredProd = searchProd ? products.filter(p => p.nama?.toLowerCase().includes(searchProd.toLowerCase())) : products;

    return (
        <View className="flex-1 bg-white">
            {/* Step Indicator */}
            <View className="flex-row items-center justify-center py-4 px-6 bg-white border-b border-zinc-100">
                {steps.map((s, i) => (
                    <View key={s.num} className="flex-row items-center">
                        <View className={`w-8 h-8 rounded-full items-center justify-center`} style={{ backgroundColor: step >= s.num ? '#0d9488' : '#e5e7eb' }}>
                            <Text className={`text-xs font-bold ${step >= s.num ? 'text-white' : 'text-zinc-500'}`}>{s.num}</Text>
                        </View>
                        <Text className={`text-xs ml-1 ${step >= s.num ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}`}>{s.label}</Text>
                        {i < steps.length - 1 && <View className="w-8 h-0.5 bg-zinc-200 mx-2" />}
                    </View>
                ))}
            </View>

            <ScrollView className="flex-1 px-4 pt-4">
                {/* Step 1: Customer */}
                {step === 1 && (
                    <>
                        <TextInput
                            className="bg-white rounded-xl border border-zinc-200 px-4 h-11 text-sm text-zinc-900 mb-3"
                            placeholder="Cari pelanggan..."
                            placeholderTextColor="#a1a1aa"
                            value={searchCust}
                            onChangeText={setSearchCust}
                        />
                        {selectedCustomer && (
                            <View className="bg-blue-50 rounded-xl p-3 border border-blue-200 mb-3">
                                <Text className="text-sm font-bold text-zinc-900">{selectedCustomer.nama}</Text>
                                <Text className="text-xs text-zinc-500">{selectedCustomer.alamat}</Text>
                            </View>
                        )}
                        {filteredCust.map(c => (
                            <TouchableOpacity
                                key={c.id}
                                className={`bg-white rounded-xl p-3 border mb-2`}
                                style={{ borderColor: selectedCustomer?.id === c.id ? '#0d9488' : '#f4f4f5' }}
                                onPress={() => setSelectedCustomer(c)}
                            >
                                <Text className="text-sm font-semibold text-zinc-900">{c.nama}</Text>
                                <Text className="text-xs text-zinc-400">{c.alamat || ''}</Text>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* Step 2: Products */}
                {step === 2 && (
                    <>
                        <TextInput
                            className="bg-white rounded-xl border border-zinc-200 px-4 h-11 text-sm text-zinc-900 mb-3"
                            placeholder="Cari barang..."
                            placeholderTextColor="#a1a1aa"
                            value={searchProd}
                            onChangeText={setSearchProd}
                        />
                        {items.length > 0 && (
                            <View className="mb-3">
                                <Text className="text-xs font-bold text-zinc-400 uppercase mb-2">Item Dipilih ({items.length})</Text>
                                {items.map((item, idx) => (
                                    <View key={idx} className="bg-white rounded-xl p-3 border border-zinc-100 mb-2">
                                        <View className="flex-row justify-between items-start">
                                            <Text className="text-sm font-semibold text-zinc-900 flex-1">{item.nama}</Text>
                                            <TouchableOpacity onPress={() => removeItem(idx)}>
                                                <Trash2 size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                        <View className="flex-row items-center justify-between mt-2">
                                            <View className="flex-row items-center bg-zinc-100 rounded-lg">
                                                <TouchableOpacity className="px-3 py-2" onPress={() => updateQty(idx, -1)}><Minus size={14} color="#18181b" /></TouchableOpacity>
                                                <Text className="text-sm font-bold text-zinc-900 w-8 text-center">{item.jumlah}</Text>
                                                <TouchableOpacity className="px-3 py-2" onPress={() => updateQty(idx, 1)}><Plus size={14} color="#18181b" /></TouchableOpacity>
                                            </View>
                                            <Text className="text-sm font-bold text-zinc-900">{formatRp(item.jumlah * item.harga)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text className="text-xs font-bold text-zinc-400 uppercase mb-2">Semua Barang</Text>
                        {filteredProd.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                className="bg-white rounded-xl p-3 border border-zinc-100 mb-2 flex-row items-center"
                                onPress={() => addItem(p)}
                            >
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-zinc-900">{p.nama}</Text>
                                    <Text className="text-xs text-zinc-400">Stok: {p.stok || 0}</Text>
                                </View>
                                <Text className="text-sm font-bold text-zinc-900">{formatRp(p.harga_jual || 0)}</Text>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* Step 3: Summary */}
                {step === 3 && (
                    <>
                        <View className="bg-white rounded-2xl p-4 border border-zinc-100 mb-3">
                            <Text className="text-xs text-zinc-400 font-bold uppercase mb-2">Pelanggan</Text>
                            <Text className="text-sm font-bold text-zinc-900">{selectedCustomer?.nama}</Text>
                        </View>
                        <View className="bg-white rounded-2xl p-4 border border-zinc-100 mb-3">
                            <Text className="text-xs text-zinc-400 font-bold uppercase mb-2">Item ({items.length})</Text>
                            {items.map((item, i) => (
                                <View key={i} className="flex-row justify-between py-2 border-b border-zinc-50">
                                    <Text className="text-sm text-zinc-900">{item.nama} x{item.jumlah}</Text>
                                    <Text className="text-sm font-semibold text-zinc-900">{formatRp(item.jumlah * item.harga)}</Text>
                                </View>
                            ))}
                            <View className="flex-row justify-between mt-3 pt-2 border-t border-zinc-200">
                                <Text className="text-base font-bold text-zinc-900">Total</Text>
                                <Text className="text-base font-bold text-zinc-900">{formatRp(total)}</Text>
                            </View>
                        </View>
                    </>
                )}
                <View className="h-28" />
            </ScrollView>

            {/* Bottom Bar */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-4 py-4">
                {total > 0 && step !== 1 && (
                    <Text className="text-center text-sm font-bold text-zinc-900 mb-2">{items.length} item • {formatRp(total)}</Text>
                )}
                <View className="flex-row gap-3">
                    {step > 1 && (
                        <TouchableOpacity className="flex-1 border border-zinc-200 rounded-xl py-3 items-center" onPress={() => setStep(step - 1)}>
                            <Text className="text-sm font-semibold text-zinc-900">Sebelumnya</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        className="flex-1 rounded-xl py-3 items-center"
                        style={{ backgroundColor: '#0d9488' }}
                        onPress={() => {
                            if (step === 1 && !selectedCustomer) return Alert.alert('Error', 'Pilih pelanggan terlebih dahulu');
                            if (step === 2 && items.length === 0) return Alert.alert('Error', 'Tambahkan minimal 1 barang');
                            if (step < 3) setStep(step + 1);
                            else Alert.alert('Sukses', 'Penjualan berhasil disimpan!', [{ text: 'OK', onPress: () => router.back() }]);
                        }}
                    >
                        <Text className="text-sm font-semibold text-white">{step === 3 ? 'Simpan Penjualan' : 'Selanjutnya'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
