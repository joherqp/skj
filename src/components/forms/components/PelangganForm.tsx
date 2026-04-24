import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserPlus, MapPin, Save, Locate, AlertTriangle } from 'lucide-react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentLocation, calculateDistance } from '@/lib/gps';
import { Pelanggan } from '@/types';
import { formatWhatsAppNumber } from '@/lib/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PelangganFormProps {
  onSuccess?: (newPelangganId: string) => void;
  onCancel?: () => void;
  className?: string;
  isDialog?: boolean;
  initialName?: string;
}

export function PelangganForm({ onSuccess, onCancel, className, isDialog = false, initialName = '' }: PelangganFormProps) {
  const { user } = useAuth();
  const { addPelanggan, updatePelanggan, kategoriPelanggan, pelanggan, profilPerusahaan, addRiwayatPelanggan } = useDatabase();
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [inactiveMatch, setInactiveMatch] = useState<Pelanggan | null>(null);
  const [radiusViolation, setRadiusViolation] = useState<{
    detected: boolean;
    nearestCustomer?: Pelanggan;
    distance?: number;
    behavior: 'allow' | 'reject';
  }>({ detected: false, behavior: 'allow' });
  const [reason, setReason] = useState('');

  const [formData, setFormData] = useState({
    nama: initialName,
    namaPemilik: '',
    kode: '', // Initialized empty, set by useEffect
    alamat: '',
    telepon: '',
    email: '',
    namaBank: '',
    noRekening: '',
    kategoriId: '',
    limitKredit: '0',
    latitude: 0,
    longitude: 0
  });

  // Automated Code Generation logic
  useEffect(() => {
    if (!user || !pelanggan) return;
    
    // Only generate if kode is empty (initial state)
    if (formData.kode) return;

    // 1. Determine the Prefix (3 letters)
    let prefix = '';
    
    // PRIORITY 1: Use user.kodeUnik from the new database column
    if (user.kodeUnik && user.kodeUnik.length === 3) {
      prefix = user.kodeUnik.toUpperCase();
    } 
    // PRIORITY 2: Check if this user already has customers and an established prefix
    else {
      const userCustomers = pelanggan.filter(p => p.salesId === user.id && p.kode && p.kode.includes('-'));
      
      if (userCustomers.length > 0) {
        // Use their existing prefix
        const existingPrefix = userCustomers[0].kode.split('-')[0];
        if (existingPrefix && existingPrefix.length === 3) {
          prefix = existingPrefix;
        }
      }
    }

    // PRIORITY 3: Fallback generation if no prefix found yet
    if (!prefix) {
      // Generate new unique prefix based on name
      const name = user.nama.toUpperCase().replace(/[^A-Z]/g, '');
      const allUsedPrefixes = new Set(
        pelanggan
          .map(p => p.kode?.split('-')[0])
          .filter(p => p && p.length === 3)
      );

      const generateCandidates = (n: string) => {
        const c = [];
        if (n.length >= 3) {
          const consonants = n.replace(/[AEIOU]/g, '');
          
          // User's specific examples
          if (n.includes('IRFAN')) c.push('IRN');
          if (n.includes('IRVAN')) c.push('IVN');
          if (n.includes('IVAN')) c.push('IAN');
          
          // Strategy: First + Middle + Last
          c.push(n[0] + n[Math.floor(n.length / 2)] + n[n.length - 1]);
          
          // Strategy: First + next 2 consonants
          if (consonants.length >= 2) c.push(n[0] + consonants.substring(0, 2));
          
          // Strategy: First 3 consonants
          if (consonants.length >= 3) c.push(consonants.substring(0, 3));
          
          // Strategy: First 3 letters
          c.push(n.substring(0, 3));
        } else {
          c.push((n + 'XXX').substring(0, 3));
        }
        return c;
      };

      const candidates = generateCandidates(name);
      let found = false;
      for (const cand of candidates) {
        if (!allUsedPrefixes.has(cand)) {
          prefix = cand;
          found = true;
          break;
        }
      }

      // If still not found, brute force combinations of name letters
      if (!found && name.length >= 3) {
        for (let i = 1; i < name.length - 1 && !found; i++) {
          for (let j = i + 1; j < name.length && !found; j++) {
            const cand = name[0] + name[i] + name[j];
            if (!allUsedPrefixes.has(cand)) {
              prefix = cand;
              found = true;
            }
          }
        }
      }

      // Final fallback if absolutely nothing works
      if (!prefix) prefix = 'CST';
    }

    // 2. Generate a unique full code (Prefix + 4 digits)
    const generateUniqueFullKode = (pfx: string) => {
      let attempts = 0;
      while (attempts < 50) {
        const suffix = Math.floor(1000 + Math.random() * 9000).toString();
        const full = `${pfx}-${suffix}`;
        if (!pelanggan.some(p => p.kode === full)) {
          return full;
        }
        attempts++;
      }
      // Ultimate fallback with timestamp if random fails many times
      return `${pfx}-${Date.now().toString().slice(-4)}`;
    };

    const finalKode = generateUniqueFullKode(prefix);
    setFormData(prev => ({ ...prev, kode: finalKode }));
  }, [user, pelanggan, formData.kode]);

  useEffect(() => {
    if (kategoriPelanggan.length > 0 && !formData.kategoriId) {
      const retailCategory = kategoriPelanggan.find(k => k.nama.toLowerCase() === 'retail');
      if (retailCategory) {
        setFormData(prev => ({ ...prev, kategoriId: retailCategory.id }));
      } else {
        setFormData(prev => ({ ...prev, kategoriId: kategoriPelanggan[0].id }));
      }
    }
  }, [kategoriPelanggan, formData.kategoriId]);

  // Check for inactive matches by name
  useEffect(() => {
    if (formData.nama.trim().length >= 3) {
      const match = pelanggan.find(p => 
        !p.isActive && 
        p.nama.toLowerCase() === formData.nama.trim().toLowerCase()
      );
      setInactiveMatch(match || null);
    } else {
      setInactiveMatch(null);
    }
  }, [formData.nama, pelanggan]);

  // Check for inactive matches by location
  useEffect(() => {
    if (formData.latitude !== 0 && formData.longitude !== 0) {
      const match = pelanggan.find(p => {
        if (p.isActive || !p.lokasi || !p.lokasi.latitude || !p.lokasi.longitude) return false;
        const dist = calculateDistance(formData.latitude, formData.longitude, p.lokasi.latitude, p.lokasi.longitude);
        return dist < 5; // Within 5 meters
      });
      if (match) {
        setInactiveMatch(match);
      }
    }
  }, [formData.latitude, formData.longitude, pelanggan]);

  const handleReactivate = async () => {
    if (!inactiveMatch) return;
    try {
      await updatePelanggan(inactiveMatch.id, { isActive: true });
      
      // Add history
      await addRiwayatPelanggan({
        pelangganId: inactiveMatch.id,
        userId: user?.id || '',
        tanggal: new Date(),
        aksi: 'aktifkan',
        keterangan: 'Pelanggan diaktifkan kembali melalui form tambah pelanggan',
        dataBaru: { ...inactiveMatch, isActive: true } as unknown as Record<string, unknown>,
        dataSebelumnya: inactiveMatch as unknown as Record<string, unknown>
      });

      toast.success(`Pelanggan ${inactiveMatch.nama} berhasil diaktifkan kembali`);
      
      if (onSuccess) {
        onSuccess(inactiveMatch.id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengaktifkan pelanggan');
    }
  };

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
        toast.warning('Koordinat GPS berhasil tersimpan, namun nama alamat tidak ditemukan. Silakan isi alamat manual.');
      }
    } catch (error) {
      console.error('GPS Error:', error);
      toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
    }
    setLoadingLoc(false);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.kategoriId) {
      toast.error('Nama dan Kategori wajib diisi');
      return;
    }
    if (!formData.alamat) {
      toast.error('Alamat wajib diisi');
      return;
    }

    // Check Coordinates
    if (formData.latitude === 0 || formData.longitude === 0) {
      toast.error('Titik koordinat (GPS) wajib diambil. Klik tombol lokasi pada kolom alamat.');
      return;
    }

    // Check duplicates
    if (formData.telepon) {
      const normalizedNew = formatWhatsAppNumber(formData.telepon);
      const duplicatePhone = pelanggan.find(p => p.telepon && formatWhatsAppNumber(p.telepon) === normalizedNew);
      if (duplicatePhone) {
        toast.error(`Nomor telepon sudah digunakan oleh pelanggan: ${duplicatePhone.nama}`);
        return;
      }
    }

    if (formData.noRekening) {
      const cleanedNewRek = formData.noRekening.replace(/\D/g, '');
      const duplicateRek = pelanggan.find(p => p.noRekening && p.noRekening.replace(/\D/g, '') === cleanedNewRek);
      if (duplicateRek) {
        toast.error(`Nomor rekening sudah digunakan oleh pelanggan: ${duplicateRek.nama}`);
        return;
      }
    }

    // Check Radius
    if (formData.latitude !== 0 && formData.longitude !== 0) {
      const radius = profilPerusahaan?.config?.radiusKunjungan || 100;
      const behavior = profilPerusahaan?.config?.radiusBehavior || 'allow';

      let nearest = null;
      let minDist = Infinity;

      pelanggan.forEach(p => {
        if (p.lokasi && p.lokasi.latitude && p.lokasi.longitude) {
           const dist = calculateDistance(formData.latitude, formData.longitude, p.lokasi.latitude, p.lokasi.longitude);
           if (dist <= radius) {
             if (dist < minDist) {
               minDist = dist;
               nearest = p;
             }
           }
        }
      });

      if (nearest) {
        setRadiusViolation({
          detected: true,
          nearestCustomer: nearest,
          distance: minDist,
          behavior: behavior as 'allow' | 'reject'
        });
      } else {
         setRadiusViolation({ detected: false, behavior: 'allow' });
      }
    }

    setShowConfirm(true);
  };

  const isAdminOrOwner = user?.roles.includes('admin') || user?.roles.includes('owner');

  const handleExecuteSubmit = async () => {
    try {
      const { latitude, longitude, ...rest } = formData;

      if (!user) {
        toast.error('User data not found');
        return;
      }

      const radiusNote = radiusViolation.detected 
        ? `[RADIUS WARNING] Dekat dengan ${radiusViolation.nearestCustomer?.nama} (${Math.round(radiusViolation.distance || 0)}m). Alasan: ${reason}` 
        : '';

      const newPelangganData = {
        ...rest,
        limitKredit: Number(formData.limitKredit),
        sisaKredit: 0,
        salesId: user.id,
        cabangId: user.cabangId,
        isActive: true,
        lokasi: {
          latitude,
          longitude,
          alamat: formData.alamat
        },
        namaPemilik: formData.namaPemilik,
        namaBank: formData.namaBank,
        noRekening: formData.noRekening
      };

      const createdPelanggan = await addPelanggan(newPelangganData);

      // Create history record
      await addRiwayatPelanggan({
        pelangganId: createdPelanggan.id,
        userId: user.id,
        tanggal: new Date(),
        aksi: 'buat',
        keterangan: radiusNote || 'Pelanggan baru dibuat',
        dataBaru: newPelangganData
      });

      toast.success(isAdminOrOwner ? 'Pelanggan berhasil ditambahkan dan disetujui (Admin)' : 'Pelanggan berhasil ditambahkan');

      if (onSuccess && createdPelanggan?.id) {
        setTimeout(() => {
          onSuccess(createdPelanggan.id);
        }, 100);
      }

    } catch (error) {
      console.error('Error adding pelanggan:', error);
      toast.error('Gagal menambahkan pelanggan');
    } finally {
      setShowConfirm(false);
    }
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

  return (
    <>
      <Card className={isDialog ? "border-0 shadow-none" : ""}>
        {!isDialog && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Form Pelanggan
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={isDialog ? "p-0" : ""}>
          {inactiveMatch && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4 flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Pelanggan Nonaktif Ditemukan</p>
                  <p className="text-xs text-blue-700">
                    Pelanggan <strong>{inactiveMatch.nama}</strong> sudah terdaftar namun dalam status nonaktif. 
                    Apakah Anda ingin mengaktifkan kembali pelanggan ini?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => setInactiveMatch(null)}
                >
                  Abaikan
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleReactivate}
                >
                  Aktifkan Kembali
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Pelanggan</Label>
                  <Input
                    value={formData.kode}
                    readOnly
                    className="bg-muted"
                    placeholder="Generating code..."
                  />
              </div>

              <div className="space-y-2">
                <Label>Kategori Pelanggan <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.kategoriId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, kategoriId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriPelanggan.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Pelanggan <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.nama}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Nama lengkap/toko..."
                  required
                />
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
                  type="text"
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
              <Label>Alamat Lengkap & Titik GPS <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  placeholder="Alamat lengkap..."
                  className="min-h-[80px] pr-12"
                  required
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
              {isAdminOrOwner && (
                <div className="mt-4">
                  <Label className="mb-2 block text-sm text-muted-foreground">Peta Lokasi (Khusus Admin/Owner - Klik Peta untuk pin lokasi)</Label>
                  <LocationPicker
                    position={{ lat: formData.latitude, lng: formData.longitude }}
                    onLocationSelect={handleMapLocationSelect}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Simpan Pelanggan
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {radiusViolation.detected ? 'Peringatan Lokasi Berdekatan' : 'Konfirmasi Simpan'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left">
                {radiusViolation.detected ? (
                  <>
                    <div className={`p-3 border rounded-md text-sm ${radiusViolation.behavior === 'reject' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        {radiusViolation.behavior === 'reject' ? 'Gagal: Lokasi Terlalu Dekat!' : 'Peringatan: Lokasi Berdekatan'}
                      </div>
                      <p>
                        Lokasi pelanggan ini berjarak <strong>{Math.round(radiusViolation.distance || 0)} meter</strong> dari pelanggan lain:
                      </p>
                      <p className="font-medium mt-1">"{radiusViolation.nearestCustomer?.nama}"</p>
                      <p className="mt-2 text-xs opacity-80">
                        Batas radius aman: {profilPerusahaan?.config?.radiusKunjungan || 100} meter.
                      </p>
                      {radiusViolation.behavior === 'reject' && (
                        <p className="mt-2 font-semibold">
                          Pengaturan sistem menolak penambahan pelanggan baru di lokasi yang terlalu dekat.
                        </p>
                      )}
                    </div>
                    
                    {radiusViolation.behavior === 'allow' && (
                      <div className="space-y-2">
                        <Label>Alasan tetap menambahkan (Wajib):</Label>
                        <Textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Contoh: Beda pemilik, ruko bersebelahan, dll..."
                          className="text-sm"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p>
                    Apakah Anda yakin ingin menyimpan data pelanggan ini?
                    Pastikan data yang dimasukkan sudah benar.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              {radiusViolation.behavior === 'reject' ? 'Tutup' : 'Batal'}
            </AlertDialogCancel>
            
            {radiusViolation.behavior !== 'reject' && (
              <Button 
                onClick={handleExecuteSubmit} 
                disabled={radiusViolation.detected && !reason.trim()}
                className={radiusViolation.detected ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
              >
                {radiusViolation.detected ? 'Tetap Simpan' : 'Simpan'}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
