import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package } from 'lucide-react-native';

const TEAL = '#0d9488';

export default function DetailBarangScreen() {
    const { id } = useLocalSearchParams();
    const [product, setProduct] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from('barang').select('*, kategori:kategori_id(nama)').eq('id', id).single();
            setProduct(data);
        })();
    }, [id]);

    if (!product) return <View className="flex-1 bg-white items-center justify-center"><Text style={{ color: '#a1a1aa' }}>Memuat...</Text></View>;
    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const stockColor = (stok: number) => {
        if (stok <= 5) return '#ef4444';
        if (stok <= 20) return '#f59e0b';
        return '#22c55e';
    };

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-4">
            {/* Header */}
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Package size={28} color="#a1a1aa" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#18181b', textAlign: 'center' }}>{product.nama}</Text>
                <Text style={{ fontSize: 12, color: '#a1a1aa', marginTop: 4 }}>{product.kode || 'No SKU'}</Text>
                {(product.kategori as any)?.nama ? (
                    <View style={{ backgroundColor: `${TEAL}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: TEAL }}>{(product.kategori as any).nama}</Text>
                    </View>
                ) : null}
            </View>

            {/* Pricing */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Harga</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                        <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Jual</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#18181b' }}>{formatRp(product.harga_jual || 0)}</Text>
                    </View>
                    {product.harga_beli ? (
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Beli</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#52525b' }}>{formatRp(product.harga_beli)}</Text>
                        </View>
                    ) : null}
                </View>
            </View>

            {/* Stock */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Stok</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: stockColor(product.stok || 0) }} />
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#18181b' }}>{product.stok || 0}</Text>
                        <Text style={{ fontSize: 13, color: '#a1a1aa' }}>{product.satuan || 'pcs'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 10, color: '#a1a1aa' }}>Min. Stok</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#52525b' }}>{product.min_stok || 0}</Text>
                    </View>
                </View>
            </View>

            {/* Details */}
            {product.deskripsi ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f4f4f5', marginBottom: 12 }}>
                    <Text style={{ fontSize: 10, color: '#a1a1aa', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Deskripsi</Text>
                    <Text style={{ fontSize: 13, color: '#52525b', lineHeight: 20 }}>{product.deskripsi}</Text>
                </View>
            ) : null}
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}
