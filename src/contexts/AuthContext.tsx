'use client';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';

const AUTH_TIMEOUT_MS = 20000;
const USER_CACHE_KEY = 'cvskj:user_profile_cache';

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
}

function saveCachedUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (!user) {
    localStorage.removeItem(USER_CACHE_KEY);
    return;
  }
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function readCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as User & { createdAt?: string | Date };
    if (!parsed?.id) return null;
    return {
      ...parsed,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
    } as User;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
  });

  // Load user profile from database
  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    try {
      const { data: byId, error: byIdError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (byIdError) {
        console.error('Error finding profile by id:', byIdError);
        return null;
      }

      if (byId) {
        return mapProfileToUser(byId);
      }

      if (authUser.email) {
        const { data: byEmail, error: byEmailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
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
      // Default to Pusat Branch
      const defaultCabangId = '550e8400-e29b-41d4-a716-446655440002';

      const newProfile = {
        id: authUser.id, // Link to Auth ID
        username: authUser.email?.split('@')[0] || 'user',
        nama: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        telepon: authUser.phone || '-',
        roles: ['staff'],
        cabang_id: defaultCabangId,
        is_active: false, // Inactive by default, needs admin approval
      };

      const { data: newData, error: createError } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        return null;
      }

      if (newData) {
        return mapProfileToUser(newData);
      }

      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }, []);

  const applySessionUser = useCallback(async (sessionUser: SupabaseUser | null) => {
    setSupabaseUser(sessionUser);
    if (!sessionUser) {
      setUser(null);
      saveCachedUser(null);
      return;
    }

    const profile = await loadUserProfile(sessionUser);
    if (!profile) {
      const cachedUser = readCachedUser();
      if (cachedUser && cachedUser.id === sessionUser.id && cachedUser.isActive) {
        setUser(cachedUser);
        return;
      }
      setUser(null);
      return;
    }

    if (!profile.isActive) {
      toast.error('Akun Anda belum aktif. Silakan hubungi admin untuk aktivasi.');
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
      saveCachedUser(null);
      return;
    }

    setUser(profile);
    saveCachedUser(profile);
  }, [loadUserProfile]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const cachedUser = readCachedUser();
        if (isMounted && cachedUser?.isActive) {
          setUser(cachedUser);
        }

        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Auth session check',
        );
        if (!isMounted) return;
        await applySessionUser(session?.user ?? null);
      } catch (err) {
        console.warn('Auth initialization warning:', err);
        if (isMounted) {
          const cachedUser = readCachedUser();
          setUser(cachedUser && cachedUser.isActive ? cachedUser : null);
          setSupabaseUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      try {
        await applySessionUser(session?.user ?? null);
      } catch (error) {
        console.warn('Auth state change warning:', error);
        const cachedUser = readCachedUser();
        setUser(cachedUser && cachedUser.isActive ? cachedUser : null);
        setSupabaseUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySessionUser]);

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

  // Keep a dummy login for backward compatibility in case it's called elsewhere, 
  // but we won't use it in our new UI.
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.warn('Email/password login is deprecated. Use Google Auth.');
      // For demo/development: Use email format for Supabase auth
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
      saveCachedUser(null);
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
