'use client';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { formatRupiah, formatCompactRupiah, formatKarton, formatNumber } from '@/lib/utils';
import { ArrowLeft, User, Phone, Mail, MapPin, Store, Calendar, CreditCard, Edit, Power, Trash2, ShoppingCart, TrendingUp, TrendingDown, Minus, BarChart2, MapPin as MapPinIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
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

interface Location {
  latitude: number;
  longitude: number;
  alamat?: string;
}

export default function DetailPelanggan() {
  const { id } = useParams();
  const idStr = Array.isArray(id) ? id[0] : (id as string);
  const router = useRouter();
  const { user } = useAuth(); // Get user for diagnosis
  const { pelanggan, penjualan, kategoriPelanggan, users, riwayatPelanggan, updatePelanggan, addRiwayatPelanggan, addKunjungan } = useDatabase(); // Destructure addPersetujuan

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [riwayatLimit, setRiwayatLimit] = useState(5);
  const [showDetailedFormat, setShowDetailedFormat] = useState(false);

  // Visit States
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [visitNote, setVisitNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (showVisitDialog) {
      getLocation();
    }
  }, [showVisitDialog]);

  const getLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mendapatkan lokasi');
    }
  };

  const submitVisit = async () => {
    if (!user || !currentLocation) {
      toast.error('Lokasi belum tersedia. Silakan aktifkan GPS.');
      return;
    }

    setIsLoading(true);
    try {
      await addKunjungan({
        userId: user.id,
        tanggal: new Date(),
        tipe: 'lama',
        pelangganId: idStr,
        lokasi: currentLocation,
        keterangan: visitNote
      });
      toast.success('Kunjungan berhasil dicatat!');
      setShowVisitDialog(false);
      setVisitNote('');
    } catch (error: unknown) {
      console.error("Visit checkin failed", error);
      const err = error as Error;
      toast.error(`Gagal mencatat kunjungan: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const customer = pelanggan.find(p => p.id === idStr);
  const salesHistory = penjualan
    .filter(p => p.pelangganId === idStr)
    .sort((a, b) => {
      // Priority 1: Unpaid (Belum Lunas) Credit Sales first
      const aUnpaid = a.metodePembayaran === 'tempo' && !a.isLunas;
      const bUnpaid = b.metodePembayaran === 'tempo' && !b.isLunas;

      if (aUnpaid && !bUnpaid) return -1;
      if (!aUnpaid && bUnpaid) return 1;

      // Priority 2: Newest Date first
      return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    });

  const customerHistory = riwayatPelanggan
    .filter(r => r.pelangganId === idStr)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  if (!customer) {
    return (
      <div className="animate-in fade-in duration-500">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Data pelanggan tidak ditemukan</p>
          <Button variant="link" onClick={() => router.push('/pelanggan')}>Kembali</Button>
        </div>
      </div>
    );
  }

  const kategori = kategoriPelanggan.find(k => k.id === customer.kategoriId);
  const salesPerson = users.find(u => u.id === customer.salesId);
  const creditUsage = ((customer.limitKredit - customer.sisaKredit) / customer.limitKredit) * 100;

  // Calculators for Pencapaian (Sales Info)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let previousMonth = currentMonth - 1;
  let previousYear = currentYear;
  if (previousMonth < 0) {
    previousMonth = 11;
    previousYear--;
  }

  const isValidSale = (s: { status: string }) => s.status !== 'draft' && s.status !== 'batal';

  const thisMonthSales = salesHistory.filter(s => {
    if (!isValidSale(s)) return false;
    const date = new Date(s.tanggal);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const lastMonthSales = salesHistory.filter(s => {
    if (!isValidSale(s)) return false;
    const date = new Date(s.tanggal);
    return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
  });

  const thisMonthTotal = thisMonthSales.reduce((sum, s) => sum + s.total, 0);

  const calculateItemQty = (sales: { items: { isBonus?: boolean; harga: number; jumlah: number; konversi?: number }[] }[], isPromo: boolean) => {
    return sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum: number, item: { isBonus?: boolean; harga: number; jumlah: number; konversi?: number }) => {
        const itemIsPromo = item.isBonus || item.harga === 0;
        if (isPromo ? itemIsPromo : !itemIsPromo) {
          return itemSum + (item.jumlah * (item.konversi || 1));
        }
        return itemSum;
      }, 0);
    }, 0);
  };

  const thisMonthQty = calculateItemQty(thisMonthSales, false);
  const thisMonthPromoQty = calculateItemQty(thisMonthSales, true);

  const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + s.total, 0);
  const lastMonthQty = calculateItemQty(lastMonthSales, false);
  const lastMonthPromoQty = calculateItemQty(lastMonthSales, true);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalTrend = calculateTrend(thisMonthTotal, lastMonthTotal);
  const qtyTrend = calculateTrend(thisMonthQty, lastMonthQty);

  const renderTrend = (trend: number) => {
    if (trend === 0) return <span className="text-muted-foreground flex items-center text-xs justify-center"><Minus className="w-3 h-3 mr-1" /> Stabil</span>;
    if (trend > 0) return <span className="text-success flex items-center text-xs font-semibold justify-center"><TrendingUp className="w-3 h-3 mr-1" /> +{trend.toFixed(1)}%</span>;
    return <span className="text-destructive flex items-center text-xs font-semibold justify-center"><TrendingDown className="w-3 h-3 mr-1" /> {trend.toFixed(1)}%</span>;
  };

  const handleRequestStatusChange = async () => {
    if (!customer) return;

    try {
      const newStatus = !customer.isActive;

      await updatePelanggan(customer.id, {
        isActive: newStatus
      });

      await addRiwayatPelanggan({
        pelangganId: customer.id,
        userId: user?.id || 'unknown',
        tanggal: new Date(),
        aksi: newStatus ? 'aktifkan' : 'nonaktifkan',
        dataSebelumnya: { isActive: customer.isActive },
        dataBaru: { isActive: newStatus }
      });

      toast.success(`Status pelanggan berhasil diubah menjadi ${newStatus ? 'Aktif' : 'Non-Aktif'}`);
      setShowStatusConfirm(false);
    } catch (error) {
      console.error('Error requesting status change:', error);
      toast.error('Gagal mengubah status pelanggan');
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => router.push('/pelanggan')} className="pl-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowVisitDialog(true)}>
              <MapPinIcon className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Catat Kunjungan</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/pelanggan/edit/${id}`)}>
              <Edit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <Button
              variant={customer.isActive ? "destructive" : "default"}
              size="sm"
              onClick={() => setShowStatusConfirm(true)}
            >
              <Power className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{customer.isActive ? 'Non-Aktifkan' : 'Aktifkan'}</span>
              <span className="sm:hidden">{customer.isActive ? 'Off' : 'On'}</span>
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card elevated>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-3xl font-bold text-primary mx-auto md:mx-0">
                {customer.nama.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 space-y-4 w-full">
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-bold">{customer.nama}</h2>
                  {customer.namaPemilik && (
                    <p className="text-lg text-muted-foreground font-medium">{customer.namaPemilik}</p>
                  )}
                  <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground mt-1">
                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">{customer.kode}</span>
                    <Badge variant={customer.isActive ? 'success' : 'destructive'}>
                      {customer.isActive ? 'Aktif' : 'Non-Aktif'}
                    </Badge>
                    {customer.isActive && user?.roles.includes('sales') && (
                      <Button
                        size="sm"
                        className="h-6 text-xs ml-2"
                        onClick={() => router.push(`/penjualan/buat?pelangganId=${id}`)}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Buat Penjualan
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Alamat</p>
                        <p className="text-muted-foreground">{customer.alamat}</p>
                        {customer.lokasi && (
                          <a
                            href={`https://www.google.com/maps?q=${customer.lokasi.latitude},${customer.lokasi.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-info mt-1 hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {customer.lokasi.alamat || `${customer.lokasi.latitude}, ${customer.lokasi.longitude}`}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Telepon</p>
                        <p className="text-muted-foreground">{customer.telepon}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Kategori</p>
                        <Badge variant="outline">{kategori?.nama || 'Umum'}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Sales Representative</p>
                        <p className="text-muted-foreground">{salesPerson?.nama || '-'}</p>
                      </div>
                    </div>
                    {(customer.namaBank || customer.noRekening) && (
                      <div className="flex items-start gap-3 pt-2 mt-2 border-t">
                        <CreditCard className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">Bank Details</p>
                          <p className="text-muted-foreground font-semibold">{customer.namaBank}</p>
                          <p className="text-muted-foreground font-mono">{customer.noRekening}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Info */}
        <Card elevated>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Informasi Kredit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limit Kredit</span>
                <span className="font-bold">{formatRupiah(customer.limitKredit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Terpakai</span>
                <span className="text-warning font-semibold">{formatRupiah(customer.limitKredit - customer.sisaKredit)}</span>
              </div>
              <Progress value={creditUsage} className="h-2" />
              <p className="text-right text-xs text-muted-foreground">Sisa Plafon: <span className="text-success font-bold">{formatRupiah(customer.sisaKredit)}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Sales Info */}
        <Card elevated>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Pencapaian Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="this_month" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="this_month">Bulan Ini</TabsTrigger>
                <TabsTrigger value="last_month">Bulan Lalu</TabsTrigger>
              </TabsList>

              <TabsContent value="this_month" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="bg-muted/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-muted/80"
                    onClick={() => setShowDetailedFormat(!showDetailedFormat)}
                  >
                    <span className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Total Qty</span>
                    <span className="text-2xl font-bold text-primary">
                      {showDetailedFormat ? formatNumber(thisMonthQty) : formatKarton(thisMonthQty).replace('k', ' k')}
                    </span>
                    {showDetailedFormat && <span className="text-sm font-normal text-muted-foreground mt-1">Pcs</span>}
                    {thisMonthPromoQty > 0 && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Promo: {showDetailedFormat ? `${formatNumber(thisMonthPromoQty)} Pcs` : formatKarton(thisMonthPromoQty).replace('k', ' k')}
                      </span>
                    )}
                    <div className="mt-2">{renderTrend(qtyTrend)}</div>
                  </div>
                  <div
                    className="bg-muted/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-muted/80"
                    onClick={() => setShowDetailedFormat(!showDetailedFormat)}
                  >
                    <span className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Total Omset</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {showDetailedFormat ? formatRupiah(thisMonthTotal) : formatCompactRupiah(thisMonthTotal)}
                    </span>
                    <div className="mt-2">{renderTrend(totalTrend)}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="last_month" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="bg-muted/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-muted/80"
                    onClick={() => setShowDetailedFormat(!showDetailedFormat)}
                  >
                    <span className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Total Qty</span>
                    <span className="text-2xl font-bold text-primary">
                      {showDetailedFormat ? formatNumber(lastMonthQty) : formatKarton(lastMonthQty).replace('k', ' k')}
                    </span>
                    {showDetailedFormat && <span className="text-sm font-normal text-muted-foreground mt-1">Pcs</span>}
                    {lastMonthPromoQty > 0 && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Promo: {showDetailedFormat ? `${formatNumber(lastMonthPromoQty)} Pcs` : formatKarton(lastMonthPromoQty).replace('k', ' k')}
                      </span>
                    )}
                  </div>
                  <div
                    className="bg-muted/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-muted/80"
                    onClick={() => setShowDetailedFormat(!showDetailedFormat)}
                  >
                    <span className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Total Omset</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">
                      {showDetailedFormat ? formatRupiah(lastMonthTotal) : formatCompactRupiah(lastMonthTotal)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* History Tabs */}
        <Tabs defaultValue="transaksi" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="transaksi">Riwayat Transaksi</TabsTrigger>
            <TabsTrigger value="perubahan">Riwayat Perubahan</TabsTrigger>
          </TabsList>

          <TabsContent value="transaksi" className="space-y-3">
            {salesHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>Belum ada riwayat transaksi</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {salesHistory.slice(0, historyLimit).map(sale => (
                  <Card
                    key={sale.id}
                    className="cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => router.push(`/penjualan/${sale.id}`)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-bold">{sale.nomorNota}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(sale.tanggal).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-primary">{formatRupiah(sale.total)}</p>
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Badge variant={sale.status === 'lunas' ? 'success' : 'secondary'} className="text-xs">
                            {sale.status}
                          </Badge>
                          {sale.metodePembayaran === 'tempo' && (
                            <Badge variant={sale.isLunas ? 'success' : 'destructive'} className="text-[10px] px-1.5">
                              {sale.isLunas ? 'LUNAS' : 'BELUM LUNAS'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {salesHistory.length > historyLimit && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 border-dashed text-muted-foreground"
                    onClick={() => setHistoryLimit(prev => prev + 10)}
                  >
                    Lihat Lainnya
                  </Button>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="perubahan" className="space-y-3">
            {customerHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p>Belum ada riwayat perubahan data</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {customerHistory.slice(0, riwayatLimit).map(riwayat => {
                  const actionUser = users.find(u => u.id === riwayat.userId);
                  return (
                    <Card key={riwayat.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {riwayat.aksi === 'buat' ? 'Pelanggan Baru Dibuat' :
                                riwayat.aksi === 'edit' ? 'Data Pelanggan Diubah' :
                                  riwayat.aksi === 'aktifkan' ? 'Status Diaktifkan' :
                                    'Status Dinonaktifkan'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              {actionUser?.nama || 'Unknown User'}
                              <span className="mx-1">•</span>
                              <Calendar className="w-3 h-3" />
                              {new Date(riwayat.tanggal).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <Badge variant={
                            riwayat.aksi === 'buat' ? 'default' :
                              riwayat.aksi === 'edit' ? 'secondary' :
                                riwayat.aksi === 'aktifkan' ? 'success' :
                                  'destructive'
                          }>
                            {riwayat.aksi}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {customerHistory.length > riwayatLimit && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 border-dashed text-muted-foreground"
                    onClick={() => setRiwayatLimit(prev => prev + 5)}
                  >
                    Lihat Lainnya
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>


      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah status pelanggan ini menjadi
              <span className="font-bold"> {customer.isActive ? 'Non-Aktif' : 'Aktif'}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestStatusChange}>
              Ya, Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visit Dialog */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Kunjungan</DialogTitle>
            <DialogDescription>
              Catat kunjungan ke {customer.nama} tanpa transaksi penjualan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Keterangan / Hasil Kunjungan</Label>
              <Textarea
                placeholder="Contoh: Toko tutup, Pemilik tidak ada, Stok masih banyak..."
                value={visitNote}
                onChange={(e) => setVisitNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVisitDialog(false)}>Batal</Button>
            <Button onClick={submitVisit} disabled={isLoading || !currentLocation}>
              {isLoading ? 'Menyimpan...' : 'Simpan Kunjungan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
