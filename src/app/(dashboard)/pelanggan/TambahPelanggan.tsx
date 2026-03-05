'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { PelangganForm } from '@/components/forms/components/PelangganForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getCurrentLocation } from '@/lib/gps';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function TambahPelanggan() {
  const router = useRouter();
  const { user } = useAuth();
  const { addKunjungan, updatePelanggan, profilPerusahaan } = useDatabase();

  const [showNextStepDialog, setShowNextStepDialog] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const [visitNote, setVisitNote] = useState('');
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);

  const isClosed = useMemo(() => {
    const config = profilPerusahaan?.config;
    if (!config?.enableClosing || !config?.closingStartTime || !config?.closingEndTime) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = config.closingStartTime.split(':').map(Number);
    const [endH, endM] = config.closingEndTime.split(':').map(Number);

    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime > endTime) {
      // Overnight window (e.g., 21:00 to 08:00)
      return currentTime >= startTime || currentTime < endTime;
    } else {
      // Same day window (e.g., 08:00 to 20:00)
      return currentTime >= startTime && currentTime < endTime;
    }
  }, [profilPerusahaan?.config]);

  const handleSuccess = (id: string) => {
    setNewCustomerId(id);
    setShowNextStepDialog(true);
  };

  const handleLanjutPenjualan = async () => {
    if (!newCustomerId || !user) return;
    setIsSubmittingVisit(true);
    try {
      const loc = await getCurrentLocation();
      await addKunjungan({
        userId: user.id,
        tanggal: new Date(),
        tipe: 'baru',
        pelangganId: newCustomerId,
        lokasi: loc,
        keterangan: 'Lanjut transaksi penjualan'
      });
      router.push(`/penjualan/buat?pelangganId=${newCustomerId}`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mencatat kunjungan otomatis, namun Anda tetap dialihkan ke penjualan.');
      router.push(`/penjualan/buat?pelangganId=${newCustomerId}`);
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  const handleTidakLanjut = async () => {
    if (!showReasonInput) {
      setShowReasonInput(true);
      return;
    }

    if (!visitNote.trim()) {
      toast.error('Mohon isi alasan tidak lanjut transaksi');
      return;
    }

    if (!newCustomerId || !user) return;
    setIsSubmittingVisit(true);
    try {
      const loc = await getCurrentLocation();
      await addKunjungan({
        userId: user.id,
        tanggal: new Date(),
        tipe: 'baru',
        pelangganId: newCustomerId,
        lokasi: loc,
        keterangan: visitNote
      });

      // Update customer to inactive if it's just a visit
      await updatePelanggan(newCustomerId, { isActive: false });

      toast.success('Kunjungan berhasil dicatat dan status pelanggan diset Non-Aktif');
      router.push('/pelanggan');
    } catch (error) {
      console.error(error);
      toast.error('Gagal mencatat kunjungan');
    } finally {
      setIsSubmittingVisit(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tambah Pelanggan</h1>
              <p className="text-muted-foreground">
                Input data pelanggan baru
              </p>
            </div>
          </div>
        </div>

        <PelangganForm onSuccess={handleSuccess} />

        <Dialog open={showNextStepDialog} onOpenChange={(open) => {
          if (!open && !isSubmittingVisit) {
            // Prevent closing by clicking outside
          }
        }}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Pelanggan Berhasil Ditambahkan!</DialogTitle>
              <DialogDescription>
                Apakah Anda ingin langsung membuat transaksi penjualan untuk pelanggan ini?
              </DialogDescription>
            </DialogHeader>

            {showReasonInput ? (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Alasan Tidak Lanjut Transaksi</Label>
                  <Textarea
                    placeholder="Contoh: Pelanggan masih pikir-pikir, stok belum sesuai..."
                    value={visitNote}
                    onChange={(e) => setVisitNote(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {!showReasonInput ? (
                <>
                  <Button variant="outline" onClick={handleTidakLanjut} disabled={isSubmittingVisit}>
                    Tidak
                  </Button>
                  <Button onClick={handleLanjutPenjualan} disabled={isSubmittingVisit}>
                    {isSubmittingVisit ? 'Memproses...' : 'Ya, Buat Penjualan'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowReasonInput(false)} disabled={isSubmittingVisit}>
                    Kembali
                  </Button>
                  <Button onClick={handleTidakLanjut} disabled={isSubmittingVisit}>
                    {isSubmittingVisit ? 'Menyimpan...' : 'Simpan Kunjungan'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Closing Time Overlay */}
        {isClosed && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
            <Card className="max-w-md w-full shadow-2xl border-2 border-yellow-500/20">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarClock className="w-8 h-8 text-yellow-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Toko Tutup</h2>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-slate-600">
                  Mohon maaf, pendaftaran pelanggan saat ini sedang ditutup (Jam Closing).
                </p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Jam Operasional Input</span>
                  <div className="text-xl font-mono font-bold text-slate-700 mt-1">
                    {profilPerusahaan?.config?.closingStartTime} - {profilPerusahaan?.config?.closingEndTime}
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Silakan kembali lagi saat jam operasional dibuka.
                </p>
                <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/pelanggan')}>
                  Kembali ke Daftar Pelanggan
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
