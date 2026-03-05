import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '../lib/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    supabaseUser: SupabaseUser | null;
    hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUserProfile = async (authUser: SupabaseUser) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', authUser.email)
                .single();

            if (data) {
                return {
                    id: data.id,
                    username: data.username,
                    nama: data.nama,
                    email: data.email,
                    telepon: data.telepon,
                    roles: data.roles as UserRole[],
                    cabangId: data.cabang_id,
                    karyawanId: data.karyawan_id,
                    avatarUrl: data.avatar_url,
                    isActive: data.is_active,
                    createdAt: new Date(data.created_at),
                } as User;
            }
            return null;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSupabaseUser(session?.user ?? null);
            if (session?.user) {
                loadUserProfile(session.user).then((profile) => {
                    setUser(profile);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSupabaseUser(session?.user ?? null);
            if (session?.user) {
                const profile = await loadUserProfile(session.user);
                setUser(profile);
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return false;
            if (data.user) {
                const profile = await loadUserProfile(data.user);
                setUser(profile);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const logout = async (): Promise<void> => {
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user && user.isActive === true,
                isLoading,
                login,
                logout,
                supabaseUser,
                hasRole: (roles: UserRole[]) => {
                    if (!user || !user.isActive) return false;
                    return roles.some(role => user.roles.includes(role));
                },
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
