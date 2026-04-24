'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserCog, MapPin, Save, ArrowLeft, Locate, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentLocation } from '@/lib/gps';
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
import { LocationPicker, extractAddressFromCoordinates } from '@/components/map/components/LocationPicker';
import { formatWhatsAppNumber } from '@/lib/utils';

export default function EditPelanggan() {
  const router = useRouter();
  const { id } = useParams();
  const idStr = Array.isArray(id) ? id[0] : (id as string);
  const { user } = useAuth();
  const { pelanggan, updatePelanggan, addRiwayatPelanggan, kategoriPelanggan, profilPerusahaan } = useDatabase();
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama: '',
    namaPemilik: '',
    kode: '',
    alamat: '',
    telepon: '',
    email: '',
    namaBank: '',
    noRekening: '',
    kategoriId: '',
    limitKredit: '0',
    latitude: 0,
    longitude: 0,
    salesId: '',
    cabangId: ''
  });

  useEffect(() => {
    if (idStr && pelanggan.length > 0) {
      const customer = pelanggan.find(p => p.id === idStr);
      if (customer) {
        setFormData({
          nama: customer.nama,
          namaPemilik: customer.namaPemilik || '',
          kode: customer.kode,
          alamat: customer.alamat,
          telepon: customer.telepon,
          email: customer.email || '',
          namaBank: customer.namaBank || '',
          noRekening: customer.noRekening || '',
          kategoriId: customer.kategoriId || '',
          limitKredit: customer.limitKredit?.toString() || '0',
          latitude: customer.lokasi?.latitude || 0,
          longitude: customer.lokasi?.longitude || 0,
          salesId: customer.salesId || '',
          cabangId: customer.cabangId || ''
        });
      } else {
        toast.error('Data pelanggan tidak ditemukan');
        router.push('/pelanggan');
      }
    }
  }, [idStr, pelanggan, router]);

  const handleGetLocation = async () => {
    setLoadingLoc(true);
    try {
      const loc = await getCurrentLocation();
      const address = loc.alamat;

      setFormData(prev => ({
        ...prev,
        latitude: loc.latitude,
        longitude: loc.longitude,
        alamat: address ? address : prev.alamat,
      }));

      if (address) {
        toast.success('Lokasi berhasil ditemukan');
      } else {
        toast.warning('Koordinat GPS berhasil tersimpan.');
      }
    } catch (error) {
      console.error('GPS Error:', error);
      toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
    }
    setLoadingLoc(false);
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setLoadingLoc(true);
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    try {
      const address = await extractAddressFromCoordinates(lat, lng);
      if (address) {
        setFormData(prev => ({ ...prev, alamat: address }));
        toast.success('Alamat diperbarui dari peta');
      }
    } catch (error) {
      console.error(error);
    }
    setLoadingLoc(false);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!formData.nama || !formData.kategoriId) {
      toast.error('Nama dan Kategori wajib diisi');
      return;
    }
    if (!formData.alamat) {
      toast.error('Alamat wajib diisi');
      return;
    }

    // Check duplicates (exclude current user)
    if (formData.telepon) {
      const normalizedNew = formatWhatsAppNumber(formData.telepon);
      const duplicatePhone = pelanggan.find(p => p.id !== idStr && p.telepon && formatWhatsAppNumber(p.telepon) === normalizedNew);
      if (duplicatePhone) {
        toast.error(`Nomor telepon sudah digunakan oleh pelanggan: ${duplicatePhone.nama}`);
        return;
      }
    }

    if (formData.noRekening) {
      const cleanedNewRek = formData.noRekening.replace(/\D/g, '');
      const duplicateRek = pelanggan.find(p => p.id !== idStr && p.noRekening && p.noRekening.replace(/\D/g, '') === cleanedNewRek);
      if (duplicateRek) {
        toast.error(`Nomor rekening sudah digunakan oleh pelanggan: ${duplicateRek.nama}`);
        return;
      }
    }

    setShowConfirm(true);
  };

  const isAdminOrOwner = user?.roles.includes('admin') || user?.roles.includes('owner');

  const handleExecuteSubmit = async () => {
    if (!idStr) return;

    setIsSubmitting(true);
    try {
      if (!formData.nama || !formData.kategoriId) {
        toast.error('Nama dan Kategori wajib diisi');
        setIsSubmitting(false);
        return;
      }

      const { latitude, longitude, ...rest } = formData;

      // Request Approval instead of direct update
      const changes = {
        ...rest,
        limitKredit: Number(formData.limitKredit),
        lokasi: {
          latitude,
          longitude,
          alamat: formData.alamat
        },
        namaPemilik: formData.namaPemilik,
        namaBank: formData.namaBank,
        noRekening: formData.noRekening
      };

      await updatePelanggan(idStr, changes);

      await addRiwayatPelanggan({
        pelangganId: idStr,
        userId: user?.id || 'unknown',
        tanggal: new Date(),
        aksi: 'edit',
        dataSebelumnya: {
          nama: (pelanggan.find(p => p.id === idStr))?.nama,
          alamat: (pelanggan.find(p => p.id === idStr))?.alamat,
          telepon: (pelanggan.find(p => p.id === idStr))?.telepon,
          kategoriId: (pelanggan.find(p => p.id === idStr))?.kategoriId,
          limitKredit: (pelanggan.find(p => p.id === idStr))?.limitKredit,
          lokasi: (pelanggan.find(p => p.id === idStr))?.lokasi,
          namaPemilik: (pelanggan.find(p => p.id === idStr))?.namaPemilik,
          namaBank: (pelanggan.find(p => p.id === idStr))?.namaBank,
          noRekening: (pelanggan.find(p => p.id === idStr))?.noRekening
        },
        dataBaru: changes
      });

      toast.success('Data pelanggan berhasil diperbarui.');
      router.push(`/pelanggan/${id}`);
    } catch (error) {
      console.error('Error requesting update:', error);
      toast.error('Gagal mengirim/memperbarui data. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/pelanggan/' + id)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Pelanggan</h1>
              <p className="text-muted-foreground">
                Perbarui data pelanggan
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Form Edit Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kode Pelanggan</Label>
                  <Input
                    value={formData.kode}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama Pelanggan / Toko <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.nama}
                    onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Nama lengkap/toko..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nomor Telepon / WA</Label>
                  <Input
                    value={formData.telepon}
                    onChange={(e) => setFormData(prev => ({ ...prev, telepon: e.target.value.replace(/\D/g, '') }))}
                    placeholder="08..."
                    type="tel"
                    inputMode="numeric"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Bank</Label>
                  <Input
                    value={formData.namaBank}
                    onChange={(e) => setFormData(prev => ({ ...prev, namaBank: e.target.value }))}
                    placeholder="Contoh: BCA, Mandiri..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nomor Rekening</Label>
                  <Input
                    value={formData.noRekening}
                    onChange={(e) => setFormData(prev => ({ ...prev, noRekening: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Nomor rekening..."
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nama Pemilik (Sesuai Rekening)</Label>
                <Input
                  value={formData.namaPemilik}
                  onChange={(e) => setFormData(prev => ({ ...prev, namaPemilik: e.target.value }))}
                  placeholder="Nama lengkap sesuai buku tabungan..."
                />
                <p className="text-[10px] text-muted-foreground italic">
                  *Pastikan nama ini sama dengan nama pada rekening bank.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Alamat Lengkap <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                    placeholder="Alamat lengkap..."
                    className="min-h-[80px] pr-12"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 text-primary hover:bg-primary/10"
                    onClick={handleGetLocation}
                    disabled={loadingLoc}
                    title="Ambil Lokasi GPS"
                  >
                    <Locate className={`h-4 w-4 ${loadingLoc ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {formData.latitude !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Koordinat: {formData.latitude}, {formData.longitude}
                  </p>
                )}
                <div className="mt-4">
                  <Label className="mb-2 block text-sm text-muted-foreground">Peta Lokasi (Klik Peta atau geser marker untuk memindahkan lokasi secara visual)</Label>
                  <LocationPicker
                    position={{ lat: formData.latitude, lng: formData.longitude }}
                    onLocationSelect={handleMapLocationSelect}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    key={formData.kategoriId ? `kategori-${formData.kategoriId}` : 'kategori-empty'}
                    value={formData.kategoriId}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, kategoriId: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoriPelanggan.length > 0 ? (
                        kategoriPelanggan.map(k => (
                          <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default" disabled>Belum ada kategori</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

              </div>
              <div className="space-y-2">
                <Label>Limit Kredit (Rp.)</Label>
                <Input
                  value={profilPerusahaan?.config?.useGlobalLimit ? profilPerusahaan.config.globalLimitAmount : formData.limitKredit}
                  onChange={(e) => setFormData(prev => ({ ...prev, limitKredit: e.target.value }))}
                  placeholder="0"
                  type="number"
                  inputMode="numeric"
                  disabled={profilPerusahaan?.config?.useGlobalLimit}
                  className={profilPerusahaan?.config?.useGlobalLimit ? "bg-muted font-semibold text-primary" : ""}
                />
                {profilPerusahaan?.config?.useGlobalLimit && (
                  <p className="text-[10px] text-primary font-medium animate-pulse">
                    *Menggunakan Limit Global Aktif
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                <Save className={`w-4 h-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Simpan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menyimpan perubahan data pelanggan ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              handleExecuteSubmit();
            }} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
