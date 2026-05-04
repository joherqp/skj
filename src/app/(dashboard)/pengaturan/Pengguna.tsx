'use client';
import Link from 'next/link';
import { SettingsCrud } from '@/components/settings/components/SettingsCrud';
import { User, Lock, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDatabase } from '@/contexts/DatabaseContext';
import { User as UserType, UserRole } from '@/types'; // Updated import
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LocationPicker, extractAddressFromCoordinates } from '@/components/map/components/LocationPicker';
import { MapPin, Locate, Search, Key, Copy, Check, ShieldAlert, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Local UserRole removed, using imported one


// Module augmentation removed as types.ts is updated


export default function Pengguna() {
  const { users, addUser, updateUser, deleteUser, isAdminOrOwner, cabang } = useDatabase();

  const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    owner: 'Owner',
    gudang: 'Gudang',
    leader: 'Leader',
    sales: 'Sales',
    staff: 'Staff',
    finance: 'Finance',
    driver: 'Driver',
    manager: 'Manager',
  };

  const [activeTab, setActiveTab] = useState('aktif');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user => {
    const matchTab = activeTab === 'all' ? true : 
                     activeTab === 'aktif' ? user.isActive : !user.isActive;
    
    const matchSearch = searchQuery === '' || 
                        user.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        user.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchQuery.toLowerCase());
                        
    return matchTab && matchSearch;
  }).sort((a, b) => a.nama.localeCompare(b.nama));
  
  const [resetDialog, setResetDialog] = useState<{
    open: boolean;
    user: UserType | null;
    password: string;
    isSuccess: boolean;
  }>({
    open: false,
    user: null,
    password: '',
    isSuccess: false
  });
  const [isResetting, setIsResetting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const handleOpenResetDialog = (user: UserType) => {
    const defaultPassword = 'skj' + Math.floor(100000 + Math.random() * 900000);
    setResetDialog({
      open: true,
      user,
      password: defaultPassword,
      isSuccess: false
    });
    setHasCopied(false);
  };

  const handleConfirmReset = async () => {
    if (!resetDialog.user) return;
    
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetDialog.user.id,
          newPassword: resetDialog.password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mereset password');

      setResetDialog(prev => ({ ...prev, isSuccess: true }));
      toast.success(`Password ${resetDialog.user.nama} berhasil direset`);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Terjadi kesalahan saat mereset password');
      setResetDialog(prev => ({ ...prev, open: false }));
    } finally {
      setIsResetting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetDialog.password);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    toast.info('Password disalin ke clipboard');
  };

  const copyFullInfo = () => {
    if (!resetDialog.user) return;
    const text = `Halo ${resetDialog.user.nama},
Password akun SKJ Anda telah direset oleh Admin.

Berikut informasi login Anda:
Username: ${resetDialog.user.username}
Password Baru: ${resetDialog.password}

Silakan login di: ${window.location.origin}/login
Demi keamanan, harap segera ubah password Anda di menu Profil setelah login.

Terima kasih.`;
    navigator.clipboard.writeText(text);
    toast.success('Informasi lengkap disalin ke clipboard');
  };

  return (
    <>
      <SettingsCrud<UserType>
      title="Pengelolaan Pengguna"
      icon={User}
      items={filteredUsers}
      extraContent={
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                    <TabsTrigger value="aktif">Aktif</TabsTrigger>
                    <TabsTrigger value="nonaktif">Nonaktif</TabsTrigger>
                    <TabsTrigger value="all">Semua</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari Nama / Username / Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                />
            </div>
        </div>
      }
      columns={[
        { key: 'nama', label: 'Nama Lengkap' },
        { key: 'username', label: 'Username' },
        { 
          key: 'cabangId', 
          label: 'Cabang',
          render: (item) => {
             const c = cabang.find(c => c.id === item.cabangId);
             return c ? c.nama : '-';
          }
        },
        {
          key: 'roles',
          label: 'Peran',
          render: (item) => (
            <div className="flex flex-wrap gap-1">
              {item.roles && item.roles.map(r => (
                <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                  {roleLabels[r] || r}
                </span>
              ))}
            </div>
          )
        },
        {
          key: 'kodeUnik',
          label: 'ID Sales',
          render: (item) => (
            <span className="font-mono font-bold text-primary">{item.kodeUnik || '-'}</span>
          )
        },
        {
          key: 'id',
          label: 'Akses',
          render: (item) => isAdminOrOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-[10px] bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700 font-bold"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenResetDialog(item);
              }}
            >
              <Key className="w-3 h-3 mr-1" />
              Reset Password
            </Button>
          )
        }
      ]}
      initialFormState={{ 
        nama: '', 
        namaPanggilan: '',
        username: '', 
        email: '', 
        telepon: '',
        roles: ['staff'], 
        cabangId: '', 
        isActive: true, 
        kodeUnik: '', 
        posisi: '',
        alamat: '',
        koordinat: { lat: 0, lng: 0 },
        startDate: undefined, 
        endDate: undefined 
      } as unknown as UserType}
      onSave={(item) => {
        // Validation: Kode Unik must be unique
        if (item.kodeUnik) {
          const kodeToCheck = item.kodeUnik.toUpperCase().trim();
          const duplicate = users.find(u => 
            u.id !== item.id && 
            u.kodeUnik?.toUpperCase() === kodeToCheck
          );
          
          if (duplicate) {
            toast.error(`Kode Unik "${kodeToCheck}" sudah digunakan oleh ${duplicate.nama}!`);
            return false;
          }
        }

        const exists = users.find(u => u.id === item.id);
        const isUserAdminOrOwner = item.roles?.some((r: UserRole) => ['admin', 'owner'].includes(r));
        const finalCabangId = isUserAdminOrOwner ? null : (item.cabangId || null);

        if (exists) {
          updateUser(item.id, {
            ...item,
            cabangId: finalCabangId,
            kodeUnik: item.kodeUnik?.toUpperCase().trim()
          });
        } else {
          addUser({
            ...item,
            id: self.crypto.randomUUID(),
            cabangId: finalCabangId,
            kodeUnik: item.kodeUnik?.toUpperCase().trim()
          });
        }
        
        setActiveTab(item.isActive ? 'aktif' : 'nonaktif');
      }}
      onDelete={(id) => deleteUser(id)}
      renderForm={(formData, handleChange) => {
        const handleRoleChange = (role: UserRole, checked: boolean) => {
          const currentRoles = formData.roles || [];
          const newRoles = checked
            ? [...currentRoles, role]
            : currentRoles.filter((r: UserRole) => r !== role);
          handleChange({
            target: {
              name: 'roles',
              value: newRoles,
              type: 'checkbox-group'
            }
          } as unknown as React.ChangeEvent<HTMLInputElement>);
        };

        return (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            {/* Login Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                <Lock className="w-4 h-4" /> Informasi Akun & Login
              </h3>
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-[11px] text-yellow-800">
                  <strong>Penting:</strong> Email harus sama persis dengan yang didaftarkan di Supabase Auth.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="sales_jkt_01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Login</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    placeholder="sales1@cvskj.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cabangId">Penempatan Cabang</Label>
                  <select
                    id="cabangId"
                    name="cabangId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={formData.cabangId || ''}
                    onChange={handleChange}
                    disabled={formData.roles?.some((r: UserRole) => ['admin', 'owner'].includes(r))}
                  >
                    <option value="">Pilih Cabang...</option>
                    {[...cabang].sort((a, b) => a.nama.localeCompare(b.nama)).map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kodeUnik">Kode Unik Sales (3 Huruf)</Label>
                  <Input
                    id="kodeUnik"
                    name="kodeUnik"
                    value={formData.kodeUnik || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
                      handleChange({ target: { name: 'kodeUnik', value } } as any);
                    }}
                    placeholder="ABC"
                    maxLength={3}
                    className="font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Peran (Bisa lebih dari satu)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 border rounded-md p-3 bg-muted/10">
                  {(Object.keys(roleLabels) as UserRole[]).map((roleKey) => (
                    <div key={roleKey} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${roleKey}`}
                        checked={formData.roles?.includes(roleKey)}
                        onCheckedChange={(checked) => handleRoleChange(roleKey, checked as boolean)}
                      />
                      <Label htmlFor={`role-${roleKey}`} className="text-xs">
                        {roleLabels[roleKey]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Employee Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 border-b pb-2">
                <UserCheck className="w-4 h-4" /> Data Diri Pengguna
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama">Nama Lengkap</Label>
                  <Input
                    id="nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    placeholder="Nama sesuai KTP"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="namaPanggilan">Nama Panggilan</Label>
                  <Input
                    id="namaPanggilan"
                    name="namaPanggilan"
                    value={formData.namaPanggilan || ''}
                    onChange={handleChange}
                    placeholder="Nama panggilan..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="posisi">Posisi / Jabatan</Label>
                  <Input
                    id="posisi"
                    name="posisi"
                    value={formData.posisi || ''}
                    onChange={handleChange}
                    placeholder="Contoh: Sales Marketing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telepon">Nomor Telepon</Label>
                  <Input
                    id="telepon"
                    name="telepon"
                    value={formData.telepon || ''}
                    onChange={handleChange}
                    placeholder="08..."
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status Akun</Label>
                  <div className="flex items-center space-x-2 border h-10 px-3 rounded-md bg-muted/20">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => handleChange({
                        target: { name: 'isActive', value: checked, type: 'checkbox', checked: checked }
                      } as any)}
                    />
                    <Label htmlFor="isActive" className="text-xs cursor-pointer">
                      {formData.isActive ? 'Aktif' : 'Nonaktif'}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat Lengkap & Titik GPS</Label>
                <div className="relative">
                  <Input
                    id="alamat"
                    name="alamat"
                    value={formData.alamat || ''}
                    onChange={handleChange}
                    placeholder="Jl. Contoh No. 123..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0 h-10 w-10 text-primary hover:bg-primary/10"
                    onClick={async () => {
                      try {
                        const { getCurrentLocation } = await import('@/lib/gps');
                        const loc = await getCurrentLocation();
                        handleChange({ target: { name: 'koordinat', value: { lat: loc.latitude, lng: loc.longitude } } } as any);
                        if (loc.alamat) {
                          handleChange({ target: { name: 'alamat', value: loc.alamat } } as any);
                        }
                        toast.success('Lokasi berhasil ditemukan');
                      } catch (error) {
                        toast.error('Gagal mendapatkan lokasi');
                      }
                    }}
                  >
                    <Locate className="h-4 w-4" />
                  </Button>
                </div>
                {formData.koordinat && typeof formData.koordinat !== 'string' && (formData.koordinat.lat !== 0 || formData.koordinat.latitude !== 0) && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Koordinat: {formData.koordinat.lat || formData.koordinat.latitude}, {formData.koordinat.lng || formData.koordinat.longitude}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Label className="mb-2 block text-sm text-muted-foreground italic">Klik Peta untuk pin lokasi pengguna</Label>
                <LocationPicker
                  position={typeof formData.koordinat === 'string' ? { lat: 0, lng: 0 } : { lat: formData.koordinat?.lat || formData.koordinat?.latitude || 0, lng: formData.koordinat?.lng || formData.koordinat?.longitude || 0 }}
                  onLocationSelect={async (lat, lng) => {
                    handleChange({ target: { name: 'koordinat', value: { lat, lng } } } as any);
                    try {
                      const address = await extractAddressFromCoordinates(lat, lng);
                      if (address) {
                        handleChange({ target: { name: 'alamat', value: address } } as any);
                        toast.success('Alamat diperbarui dari peta');
                      }
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Tanggal Masuk</Label>
                    <Input 
                      type="date" 
                      value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange({ target: { name: 'startDate', value: e.target.value ? new Date(e.target.value) : null } } as any)}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Tanggal Resign</Label>
                    <Input 
                      type="date"
                      value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleChange({ target: { name: 'endDate', value: e.target.value ? new Date(e.target.value) : null } } as any)}
                    />
                 </div>
              </div>
            </section>
          </div>
        );
      }}
      />

      <AlertDialog 
        open={resetDialog.open} 
        onOpenChange={(open) => !isResetting && setResetDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <AlertDialogTitle>Reset Password Pengguna</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left space-y-3">
              {resetDialog.isSuccess ? (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">Password berhasil direset! Berikut adalah password baru untuk <span className="font-bold">{resetDialog.user?.nama}</span>:</p>
                  
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border group relative">
                    <code className="flex-1 font-mono text-lg font-bold tracking-wider text-center">
                      {resetDialog.password}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={copyToClipboard}
                    >
                      {hasCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-[12px] text-blue-700 leading-relaxed">
                    <strong>Penting:</strong> Harap catat atau salin password di atas dan berikan kepada pengguna. Password ini tidak akan ditampilkan lagi setelah jendela ini ditutup.
                  </div>

                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-primary/20 text-primary hover:bg-primary/5"
                    onClick={copyFullInfo}
                  >
                    <Send className="w-4 h-4" />
                    Salin Info Login (Kirim ke User)
                  </Button>
                </div>
              ) : (
                <>
                  <p>Anda akan mereset password untuk <strong>{resetDialog.user?.nama}</strong>.</p>
                  <p>Sistem telah menyiapkan password default sementara:</p>
                  <div className="p-2 bg-muted rounded text-center font-mono font-bold border">
                    {resetDialog.password}
                  </div>
                  <p className="text-[12px] text-muted-foreground italic">
                    * Password ini dapat disalin setelah konfirmasi dilakukan.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {resetDialog.isSuccess ? (
              <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => setResetDialog(prev => ({ ...prev, open: false }))}>
                Selesai
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel disabled={isResetting}>Batal</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirmReset();
                  }}
                  disabled={isResetting}
                >
                  {isResetting ? "Memproses..." : "Ya, Reset Sekarang"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
