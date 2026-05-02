'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Mail, Phone, MapPin, Shield,
  LogOut, ChevronRight, Beaker, BellRing, Key, Edit2, Check, X,
  Eye, EyeOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isSoundNotificationEnabled, setSoundNotificationEnabled } from '@/lib/notificationSound';
import {
  setSystemPushEnabled,
  subscribeSystemPush,
  unsubscribeSystemPush,
} from '@/lib/systemPush';
import { playNotificationSound } from '@/lib/notificationSound';

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  owner: 'Owner',
  gudang: 'Gudang',
  leader: 'Leader',
  sales: 'Sales',
  staff: 'Staff',
};

export default function Profil() {
  const { user, logout, refreshUser, updatePassword } = useAuth();
  const { cabang: listCabang, updateUser, users } = useDatabase();
  const router = useRouter();

  const displayUser = users.find(u => u.id === user?.id);

  const [mounted, setMounted] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [isSystemPushLoading, setIsSystemPushLoading] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isEditingKode, setIsEditingKode] = useState(false);
  const [newKode, setNewKode] = useState(user?.kodeUnik || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  useEffect(() => {
    setMounted(true);
    setNotificationEnabled(isSoundNotificationEnabled());
    if (user?.kodeUnik) setNewKode(user.kodeUnik);
  }, [user?.kodeUnik]);

  const handleUpdateKode = async () => {
    if (!user) return;
    
    if (!user.roles.includes('admin')) {
      toast.error('Hanya Administrator yang dapat mengubah kode unik.');
      return;
    }
    const cleanKode = newKode.toUpperCase().trim();
    if (cleanKode.length !== 3) {
      toast.error('Kode unik harus tepat 3 karakter huruf.');
      return;
    }

    if (!/^[A-Z]{3}$/.test(cleanKode)) {
      toast.error('Kode unik hanya boleh berisi huruf A-Z.');
      return;
    }

    // Local uniqueness check
    const isUsed = users.some(u => u.id !== user.id && u.kodeUnik?.toUpperCase() === cleanKode);
    if (isUsed) {
      toast.error(`Kode "${cleanKode}" sudah digunakan oleh user lain. Silakan pilih kode lain.`);
      return;
    }

    try {
      await updateUser(user.id, { kodeUnik: cleanKode });
      await refreshUser();
      toast.success('Kode unik sales berhasil diperbarui');
      setIsEditingKode(false);
    } catch (error: any) {
      console.error('Error updating kode unik:', error);
      if (error?.message?.includes('unique constraint') || error?.code === '23505') {
        toast.error(`Kode "${cleanKode}" sudah terdaftar di sistem. Pilih kombinasi lain.`);
      } else {
        toast.error('Gagal memperbarui kode unik');
      }
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Silakan isi semua kolom password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword, currentPassword);
      toast.success('Password berhasil diperbarui');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Gagal memperbarui password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Get Cabang from User data
  const displayCabangId = displayUser?.cabangId || user?.cabangId;
  const displayCabang = displayCabangId ? listCabang.find(c => c.id === displayCabangId) : null;

  const profileItems = [
    { icon: User, label: 'Nama Lengkap', value: displayUser?.nama || user?.nama },
    { icon: User, label: 'Username', value: user?.username },
    { icon: Shield, label: 'Jabatan', value: displayUser?.posisi || '-' },
    { icon: Shield, label: 'Peran', value: user?.roles ? user.roles.map(r => roleLabels[r]).join(', ') : '-' },
    { icon: MapPin, label: 'Cabang', value: displayCabang?.nama || '-' },
    { icon: Phone, label: 'Telepon', value: displayUser?.telepon || user?.telepon || '-' },
    { icon: Mail, label: 'Email', value: user?.email || '-' }, // Email usually in Account

    // Detailed Location
    { icon: MapPin, label: 'Alamat', value: displayUser?.alamat || '-' },
    { icon: MapPin, label: 'Kota/Kab', value: displayUser?.kota ? `${displayUser.kota}, ${displayUser.provinsi || ''}` : '-' },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-5">
        {/* Profile Header */}
        <Card elevated className="overflow-hidden">
          <div className="h-20 gradient-hero" />
          <CardContent className="relative pb-5">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <Avatar className="w-20 h-20 border-4 border-card shadow-lg">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user ? getInitials(user.nama) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="pt-12 text-center">
              <h2 className="text-xl font-bold">{displayUser?.nama || user?.nama}</h2>
              <Badge variant="default" className="mt-2">
                {user?.roles ? user.roles.map(r => roleLabels[r]).join(', ') : '-'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                {displayCabang?.nama || '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card elevated className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Beaker className="w-4 h-4 text-primary" />
              Preferensi Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent>

            <div className="flex items-center justify-between p-2 border-t mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="all-notif" className="text-sm font-medium flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-primary" />
                  Notifikasi
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aktifkan suara dan notifikasi sistem saat aplikasi di background/ditutup.
                </p>
              </div>
              <Switch
                id="all-notif"
                disabled={!mounted || isSystemPushLoading || !user?.id}
                checked={mounted && notificationEnabled}
                onCheckedChange={async (checked) => {
                  if (!user?.id) return;
                  setIsSystemPushLoading(true);
                  try {
                    if (checked) {
                      setSoundNotificationEnabled(true);
                      setNotificationEnabled(true);

                      const ok = await subscribeSystemPush(user.id);
                      if (ok) {
                        setSystemPushEnabled(true);
                        toast.success('Notifikasi aktif');
                      } else {
                        setSystemPushEnabled(false);
                        toast.warning('Suara notifikasi aktif. Notifikasi sistem belum aktif (cek izin browser).');
                      }
                    } else {
                      setSoundNotificationEnabled(false);
                      setNotificationEnabled(false);
                      setSystemPushEnabled(false);

                      const ok = await unsubscribeSystemPush(user.id);
                      if (ok) {
                        toast.success('Notifikasi nonaktif');
                      } else {
                        toast.warning('Suara sudah nonaktif, tapi gagal hapus subscription sistem.');
                      }
                    }
                  } finally {
                    setIsSystemPushLoading(false);
                  }
                }}
              />
            </div>
            <div className="p-2 border-t mt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!user?.id || isTestingNotification}
                onClick={async () => {
                  if (!user?.id) return;
                  setIsTestingNotification(true);
                  try {
                    playNotificationSound();
                    const res = await fetch('/api/push/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: user.id,
                        title: 'Tes Notifikasi',
                        body: 'Jika ini muncul saat app di background, push sistem sudah aktif.',
                        url: '/notifikasi',
                      }),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(`Tes notifikasi gagal: ${json?.error || 'unknown error'}`);
                      return;
                    }
                    const sent = Number(json?.sent || 0);
                    if (sent > 0) {
                      toast.success(`Tes notifikasi terkirim ke ${sent} perangkat.`);
                    } else {
                      toast.warning('Tes dikirim, tapi belum ada subscription perangkat. Aktifkan izin notifikasi browser dulu.');
                    }
                  } finally {
                    setIsTestingNotification(false);
                  }
                }}
              >
                {isTestingNotification ? 'Mengirim Tes Notifikasi...' : 'Tes Notifikasi'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card elevated>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Informasi Akun</CardTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Terproteksi
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Custom Unique Code Field */}
            <div className="flex items-center gap-3 py-2 border-b border-dashed">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Kode Unik Sales (untuk Penomoran)</p>
                {isEditingKode ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={newKode}
                      onChange={(e) => setNewKode(e.target.value.toUpperCase().slice(0, 3))}
                      className="h-8 w-24 text-sm font-bold uppercase"
                      placeholder="ABC"
                      maxLength={3}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingKode(false)} className="h-8 w-8 p-0">
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleUpdateKode} className="h-8 w-8 p-0">
                      <Check className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-primary">{user?.kodeUnik || '-'}</p>
                    {user?.roles.includes('admin') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditingKode(true)}
                        className="h-7 text-xs flex items-center gap-1 hover:text-primary"
                      >
                        <Edit2 className="w-3 h-3" />
                        Ubah
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {profileItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 py-2 animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value || '-'}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">

          {/* Change Password Card */}
          <Card elevated>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Ganti Password
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="h-8"
                >
                  {showPasswordForm ? 'Batal' : 'Ubah'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPasswordForm ? (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Password Saat Ini</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Masukkan password saat ini"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-9 pr-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password Baru</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Min. 6 karakter"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-9 pr-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Konfirmasi Password Baru</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Ulangi password baru"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 pr-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-9" 
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                  >
                    {isUpdatingPassword ? 'Memperbarui...' : 'Simpan Password Baru'}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-1">
                  Klik tombol ubah jika Anda ingin memperbarui password akun Anda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-destructive/20 hover:bg-destructive/5 transition-all"
            onClick={handleLogout}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm font-medium text-destructive">Keluar</span>
              </div>
              <ChevronRight className="w-4 h-4 text-destructive" />
            </CardContent>
          </Card>
        </div>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          CVSKJ v1.0.0
        </p>
      </div>
    </div>
  );
}
