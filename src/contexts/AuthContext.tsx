'use client';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const AUTH_TIMEOUT_MS = 60000; // Increased to 60s for poor network conditions

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timeout after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  supabaseUser: SupabaseUser | null;
  updatePassword: (password: string) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  loginWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializingRef = useRef(false);
  const lastFocusRef = useRef<number>(Date.now());
  const router = useRouter();

  const mapProfileToUser = (data: {
    id: string;
    username: string;
    nama: string;
    email: string;
    telepon: string;
    roles: string[];
    cabang_id: string;
    karyawan_id?: string | null;
    avatar_url?: string | null;
    kode_unik?: string | null;
    is_active: boolean;
    created_at: string;
  }): User => ({
    id: data.id,
    username: data.username,
    nama: data.nama,
    email: data.email,
    telepon: data.telepon,
    roles: data.roles as UserRole[],
    cabangId: data.cabang_id,
    karyawanId: data.karyawan_id,
    avatarUrl: data.avatar_url,
    kodeUnik: data.kode_unik || undefined,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
  });

  // Load user profile from database with retry logic
  const loadUserProfile = useCallback(async (authUser: SupabaseUser | string, retryCount = 0): Promise<User | null> => {
    const userId = typeof authUser === 'string' ? authUser : authUser.id;
    const userEmail = typeof authUser === 'string' ? null : authUser.email;

    try {
      const { data: byId, error: byIdError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (byIdError) {
        console.error(`Error finding profile by id (attempt ${retryCount + 1}):`, byIdError);
        if (retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return loadUserProfile(authUser, retryCount + 1);
        }
        return null;
      }

      if (byId) {
        return mapProfileToUser(byId);
      }

      if (userEmail) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();

        if (byEmailError) {
          console.error('Error finding profile by email:', byEmailError);
          return null;
        }

        if (byEmail) {
          return mapProfileToUser(byEmail);
        }
      }

      // User doesn't exist in public.users, create default profile
      const defaultCabangId = '550e8400-e29b-41d4-a716-446655440002';
      
      const emailForProfile = userEmail || '';
      const usernameForProfile = emailForProfile.split('@')[0] || 'user';
      const nameForProfile = typeof authUser !== 'string' ? (authUser.user_metadata?.full_name || usernameForProfile) : usernameForProfile;

      const newProfile = {
        id: userId,
        username: usernameForProfile,
        nama: nameForProfile,
        email: emailForProfile,
        telepon: typeof authUser !== 'string' ? (authUser.phone || '-') : '-',
        roles: ['staff'],
        cabang_id: defaultCabangId,
        is_active: false,
      };

      const { data: newData, error: createError } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError.message || createError);
        return null;
      }

      return newData ? mapProfileToUser(newData) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return loadUserProfile(authUser, retryCount + 1);
      }
      return null;
    }
  }, []);

  const applySessionUser = useCallback(async (sUser: SupabaseUser | null) => {
    if (!sUser) {
      setUser(null);
      setSupabaseUser(null);
      return;
    }

    setSupabaseUser(sUser);
    const profile = await loadUserProfile(sUser);
    if (profile) {
      if (!profile.isActive) {
        toast.error('Akun Anda belum aktif. Silakan hubungi admin untuk aktivasi.');
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
        return;
      }
      setUser({
        ...profile,
        email: sUser.email || profile.email,
      });
    } else {
      console.error('Failed to load user profile after session restoration');
    }
  }, [loadUserProfile]);

  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      await applySessionUser(supabaseUser);
    }
  }, [supabaseUser, applySessionUser]);

  const initialize = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    
    try {
      console.log('Starting auth initialization...');
      const startTime = Date.now();
      
      const { data: { session }, error } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'Auth session check',
      );

      if (error) {
        console.error('Auth session error:', error.message);
        throw error;
      }

      const duration = Date.now() - startTime;
      console.log(`Auth session retrieved in ${duration}ms. Session found:`, !!session);

      await applySessionUser(session?.user ?? null);
    } catch (err) {
      console.warn('Auth initialization warning:', err instanceof Error ? err.message : err);
      if (err instanceof Error && err.message.includes('timeout')) {
        toast.error('Koneksi lambat. Memeriksa sesi...');
      }
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [applySessionUser]);

  useEffect(() => {
    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth State Change Event: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await applySessionUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSupabaseUser(null);
      }
      
      // Only set loading false if we're not already in the middle of initialization
      // to avoid race conditions with the initialize() function
      if (!isInitializingRef.current) {
        setIsLoading(false);
      }
    });

    const handleFocus = () => {
      const now = Date.now();
      // Only check session on focus if it's been more than 30 seconds since last check
      if (now - lastFocusRef.current > 30000) {
        console.log('App focused, re-checking session...');
        lastFocusRef.current = now;
        void supabase.auth.getSession().then(({ data: { session } }) => {
          // If we found a session but didn't have one before, OR if we want to ensure profile is fresh
          if (session) {
            void applySessionUser(session.user);
          }
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [initialize, applySessionUser]);

  const loginWithGoogle = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/beranda` : undefined,
        }
      });
      if (error) {
        console.error('Login error:', error);
        toast.error('Gagal login dengan Google');
      }
    } catch (error) {
      console.error('Login exception:', error);
      toast.error('Terjadi kesalahan, silakan coba lagi');
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.warn('Email/password login is deprecated. Use Google Auth.');
      const email = username.includes('@') ? username : `${username}@cvskj.local`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return false;

      if (data.user) {
        const profile = await loadUserProfile(data.user);
        if (!profile?.isActive) {
          toast.error('Akun Anda dinonaktifkan. Hubungi admin.');
          await supabase.auth.signOut();
          return false;
        }
        setUser(profile);
        setSupabaseUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Email/password login exception:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updatePassword = async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
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
        updatePassword,
        loginWithGoogle,
        refreshUser,
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
