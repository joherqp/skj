import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';

const TEAL = '#0d9488';
const TEAL_LIGHT = '#ccfbf1';

export default function LoginScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Email dan password harus diisi');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await login(email, password);
            router.replace('/(tabs)/beranda');
        } catch (e: any) {
            setError(e.message || 'Email atau password salah');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-center px-6">
                {/* Brand Identity — matches web */}
                <View className="items-center mb-8">
                    <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: TEAL }} className="items-center justify-center mb-3 shadow-lg">
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -1 }}>SKJ</Text>
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#18181b', letterSpacing: -0.5, textTransform: 'uppercase', textAlign: 'center' }}>
                        SURYA KHARISMA JAYA
                    </Text>
                    <Text style={{ fontSize: 13, color: '#71717a', fontWeight: '500', marginTop: 4, letterSpacing: 0.5 }}>
                        Sistem Manajemen Distribusi
                    </Text>
                </View>

                {/* Login Card */}
                <View className="bg-white rounded-2xl p-5 border border-zinc-200" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25 }}>
                    {/* Accent line */}
                    <View style={{ height: 3, backgroundColor: TEAL, opacity: 0.3, borderRadius: 2, marginBottom: 16 }} />

                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#27272a', textAlign: 'center' }}>Selamat Datang Kembali</Text>
                    <Text style={{ fontSize: 13, color: '#71717a', textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>Cepat. Handal. Terintegrasi.</Text>

                    {error ? (
                        <View className="bg-red-50 rounded-xl p-3 mt-4 border border-red-200">
                            <Text className="text-xs text-red-600 text-center font-medium">{error}</Text>
                        </View>
                    ) : null}

                    <View className="mt-5">
                        <TextInput
                            className="bg-zinc-50 rounded-xl px-4 h-12 text-sm border border-zinc-200"
                            style={{ color: '#18181b' }}
                            placeholder="Email atau Username"
                            placeholderTextColor="#a1a1aa"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isLoading}
                        />
                        <TextInput
                            className="bg-zinc-50 rounded-xl px-4 h-12 text-sm border border-zinc-200 mt-3"
                            style={{ color: '#18181b' }}
                            placeholder="Password"
                            placeholderTextColor="#a1a1aa"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!isLoading}
                        />
                    </View>

                    <TouchableOpacity
                        className="mt-5 rounded-xl h-14 items-center justify-center"
                        style={{ backgroundColor: '#18181b' }}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Masuk</Text>
                        )}
                    </TouchableOpacity>

                    {/* Info Alert — matches web */}
                    <View className="mt-4 bg-zinc-50 rounded-xl p-3 border border-zinc-200 flex-row items-start gap-2">
                        <Info size={14} color={TEAL} />
                        <View className="flex-1">
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#71717a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Panduan Akses Baru</Text>
                            <Text style={{ fontSize: 11, color: '#71717a', lineHeight: 16 }}>
                                Belum punya akun? Hubungi <Text style={{ fontWeight: '900', color: '#18181b' }}>ADMIN</Text> untuk aktivasi akun Anda.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <Text style={{ fontSize: 9, color: '#a1a1aa', textAlign: 'center', marginTop: 24, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' }}>
                    © 2026 Surya Kharisma Jaya
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
