'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Mail, Phone, MapPin, Shield,
  LogOut, ChevronRight, Beaker, BellRing
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  const { user, logout } = useAuth();
  const { karyawan, cabang: listCabang, dbMode, setDbMode } = useDatabase();
  const router = useRouter();

  const linkedKaryawan = karyawan.find(k => k.userAccountId === user?.id);

  const [mounted, setMounted] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [isSystemPushLoading, setIsSystemPushLoading] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

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
  }, []);

  // Get Cabang from Karyawan data (priority) or User data
  const displayCabangId = linkedKaryawan?.cabangId || user?.cabangId;
  const displayCabang = displayCabangId ? listCabang.find(c => c.id === displayCabangId) : null;

  const profileItems = [
    { icon: User, label: 'Nama Lengkap', value: linkedKaryawan?.nama || user?.nama },
    { icon: User, label: 'Username', value: user?.username },
    { icon: Shield, label: 'Jabatan', value: linkedKaryawan?.posisi || '-' },
    { icon: Shield, label: 'Peran', value: user?.roles ? user.roles.map(r => roleLabels[r]).join(', ') : '-' },
    { icon: MapPin, label: 'Cabang', value: displayCabang?.nama || '-' },
    { icon: Phone, label: 'Telepon', value: linkedKaryawan?.telepon || user?.telepon || '-' },
    { icon: Mail, label: 'Email', value: user?.email || '-' }, // Email usually in Account

    // Detailed Location from Karyawan (New)
    { icon: MapPin, label: 'Alamat', value: linkedKaryawan?.alamat || '-' },
    { icon: MapPin, label: 'Kota/Kab', value: linkedKaryawan?.kota ? `${linkedKaryawan.kota}, ${linkedKaryawan.provinsi || ''}` : '-' },
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
              <h2 className="text-xl font-bold">{linkedKaryawan?.nama || user?.nama}</h2>
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
            <div className="flex items-center justify-between p-2">
              <div className="space-y-0.5">
                <Label htmlFor="demo-mode" className="text-sm font-medium">Beralih ke Demo</Label>
                <p className="text-xs text-muted-foreground">
                  Gunakan schema 'demo' untuk uji coba tanpa merusak data real.
                </p>
              </div>
              <Switch
                id="demo-mode"
                disabled={!mounted}
                checked={mounted && dbMode === 'demo'}
                onCheckedChange={(checked) => setDbMode(checked ? 'demo' : 'public')}
              />
            </div>
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
              {/* Edit disallowed as per requirement: "Informasi Akun tidak bisa di ubah" */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Terproteksi
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
