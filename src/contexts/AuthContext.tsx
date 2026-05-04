'use client';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string, currentPassword: string) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  loginWithGoogle: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { data: session, isPending: isLoadingSession, error: sessionError } = authClient.useSession();
  const router = useRouter();

  // Map Better Auth user to our User type
  useEffect(() => {
    if (session?.user) {
      const u = session.user as any; // Better Auth user extended with custom fields
      setUser({
        id: u.id,
        username: u.username || u.email.split('@')[0],
        nama: u.nama || u.name,
        email: u.email,
        telepon: u.telepon || '',
        roles: (u.roles || ['staff']) as UserRole[],
        cabangId: u.cabangId || null,
        avatarUrl: u.image || u.avatarUrl,
        kodeUnik: u.kodeUnik,
        isActive: u.isActive ?? true,
        createdAt: new Date(u.createdAt),
        posisi: u.posisi,
        alamat: u.alamat,
        provinsi: u.provinsi,
        kota: u.kota,
        kecamatan: u.kecamatan,
        kelurahan: u.kelurahan,
        kodePos: u.kodePos,
        isDemo: u.isDemo || false,
        startDate: u.startDate ? new Date(u.startDate) : undefined,
        endDate: u.endDate ? new Date(u.endDate) : undefined,
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/beranda`,
      });
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Gagal login dengan Google');
    }
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string): Promise<boolean> => {
    try {
      const isEmail = usernameOrEmail.includes('@');
      
      const { error } = isEmail 
        ? await authClient.signIn.email({
            email: usernameOrEmail.toLowerCase(),
            password,
          })
        : await authClient.signIn.username({
            username: usernameOrEmail.toLowerCase(),
            password,
          });

      if (error) {
        toast.error(error.message || 'Gagal login');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login exception:', error);
      return false;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authClient.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const updatePassword = useCallback(async (newPassword: string, currentPassword: string): Promise<void> => {
    const { error } = await authClient.changePassword({
        newPassword: newPassword,
        currentPassword: currentPassword,
    });
    if (error) {
        toast.error(error.message);
        throw error;
    }
    toast.success('Password berhasil diperbarui');
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!user || !user.isActive) return false;
    return roles.some(role => user.roles.includes(role));
  }, [user]);

  const refreshUser = useCallback(async () => {
    // Better Auth useSession hook handles refresh automatically, 
    // but we can trigger a manual re-fetch if needed.
    await authClient.getSession();
  }, []);

  const [isLoading, setIsLoading] = useState(true);

  // Unified loading state management
  useEffect(() => {
    if (isLoadingSession) {
      setIsLoading(true);
      return;
    }

    // If session exists but user state isn't mapped yet, stay in loading
    if (session?.user && !user) {
      setIsLoading(true);
      return;
    }

    // Once we've determined session status (either mapped or confirmed null)
    setIsLoading(false);
  }, [isLoadingSession, session, user]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user && user.isActive === true,
    isLoading: isLoading,
    login,
    logout,
    updatePassword,
    loginWithGoogle,
    refreshUser,
    hasRole,
  }), [
    user,
    isLoading,
    login,
    logout,
    updatePassword,
    loginWithGoogle,
    refreshUser,
    hasRole,
  ]);

  return (
    <AuthContext.Provider value={value}>
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

