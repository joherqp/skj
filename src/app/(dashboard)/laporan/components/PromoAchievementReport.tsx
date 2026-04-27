import { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Search, Gift, Info, Calendar, User, Package } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function PromoAchievementReport() {
  const { user: currentUser } = useAuth();
  const { promo, penjualan, pelanggan, barang } = useDatabase();
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
  const isLeader = currentUser?.roles.includes('leader');

  // Filter only Event type promos
  const eventPromos = useMemo(() => {
    return promo
      .filter(p => p.tipe === 'event' && p.isActive !== false)
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [promo]);

  // Selected promo details
  const selectedPromo = useMemo(() => {
    return eventPromos.find(p => p.id === selectedPromoId);
  }, [eventPromos, selectedPromoId]);

  // Calculate achievements for all customers for the selected promo
  const achievements = useMemo(() => {
    if (!selectedPromo || !currentUser) return [];

    const startDate = new Date(selectedPromo.tanggalMulai);
    const endDate = selectedPromo.tanggalBerakhir ? new Date(selectedPromo.tanggalBerakhir) : new Date();
    const targetProducts = selectedPromo.targetProdukIds || [];
    const minQty = selectedPromo.minQty || 0;
    const bonusStep = selectedPromo.syarat_jumlah || 0;
    const bonusValue = selectedPromo.nilai || 0;

    // Map to store aggregated data per customer
    const customerStats = new Map<string, {
      totalQty: number;
      earnedRewards: number; // Main prize count
      earnedBonus: number; // Cashback total
      lastTransaction: Date | null;
    }>();

    // Iterate through all sales to find relevant items
    penjualan.forEach(p => {
      const saleDate = new Date(p.tanggal);
      
      // Access Control: Same as other reports
      let hasAccess = false;
      if (isAdminOrOwner) {
        hasAccess = true;
      } else if (isLeader) {
        hasAccess = p.cabangId === currentUser.cabangId;
      } else {
        hasAccess = (p.salesId || p.createdBy) === currentUser.id;
      }
      
      if (!hasAccess) return;

      // Check if sale is within promo period and is PAID
      const isPaid = p.status === 'lunas' || p.isLunas === true;
      if (saleDate >= startDate && saleDate <= endDate && isPaid) {
        p.items.forEach(item => {
          // Check if item is a target product
          if (targetProducts.includes(item.barangId)) {
            const stats = customerStats.get(p.pelangganId) || { totalQty: 0, earnedRewards: 0, earnedBonus: 0, lastTransaction: null };
            
            stats.totalQty += (item.jumlah * (item.konversi || 1));
            
            // Count rewards already recorded
            if (item.promoId === selectedPromo.id) {
              if (item.earnedReward && item.earnedReward.qty > 0) {
                stats.earnedRewards += item.earnedReward.qty;
              }
              if (item.diskon) {
                stats.earnedBonus += item.diskon;
              }
            }

            if (!stats.lastTransaction || saleDate > stats.lastTransaction) {
              stats.lastTransaction = saleDate;
            }

            customerStats.set(p.pelangganId, stats);
          }
        });
      }
    });

    // Transform map to list and attach customer details
    return Array.from(customerStats.entries())
      .map(([pelangganId, stats]) => {
        const pDetail = pelanggan.find(p => p.id === pelangganId);
        
        // Calculate Main Reward Potential
        const totalPotentialRewards = minQty > 0 ? Math.floor(stats.totalQty / minQty) : 0;
        const progressToNext = minQty > 0 ? (stats.totalQty % minQty) / minQty * 100 : 0;
        const remainingForNext = minQty > 0 ? minQty - (stats.totalQty % minQty) : 0;

        // Calculate Bonus Potential
        const totalPotentialBonus = (bonusStep > 0 && bonusValue > 0) ? Math.floor(stats.totalQty / bonusStep) * bonusValue : 0;
        
        return {
          pelangganId,
          nama: pDetail?.nama || 'Pelanggan Terhapus',
          kode: pDetail?.kode || '-',
          totalQty: stats.totalQty,
          earnedRewards: stats.earnedRewards, 
          potentialRewards: totalPotentialRewards,
          earnedBonus: stats.earnedBonus,
          potentialBonus: totalPotentialBonus,
          progress: progressToNext,
          remainingForNext: remainingForNext,
          lastTransaction: stats.lastTransaction
        };
      })
      .filter(a => 
        a.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.kode.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.totalQty - a.totalQty);
  }, [selectedPromo, penjualan, pelanggan, searchQuery, currentUser, isAdminOrOwner, isLeader]);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Capaian Promo</h1>
          <p className="text-muted-foreground">Pantau akumulasi poin dan hadiah event pelanggan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Pilih Promo Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPromoId} onValueChange={setSelectedPromoId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Promo..." />
              </SelectTrigger>
              <SelectContent>
                {eventPromos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPromo && (
              <div className="mt-4 space-y-3 text-sm border-t pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedPromo.tanggalMulai), 'dd MMM yyyy', { locale: id })} - 
                    {selectedPromo.tanggalBerakhir ? format(new Date(selectedPromo.tanggalBerakhir), ' dd MMM yyyy', { locale: id }) : ' Sekarang'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>Target: {selectedPromo.targetProdukIds?.length || 0} Produk</span>
                </div>
                <div className="flex items-start gap-2">
                  <Gift className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary">Hadiah: {selectedPromo.hadiah}</span>
                    <p className="text-xs text-muted-foreground">Kelipatan per {selectedPromo.minQty} unit</p>
                  </div>
                </div>
                {selectedPromo.snk && (
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-xs bg-muted p-2 rounded">
                      <span className="font-semibold block mb-1">Syarat & Ketentuan:</span>
                      <p className="whitespace-pre-wrap">{selectedPromo.snk}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Daftar Capaian Pelanggan</CardTitle>
            <div className="relative w-full max-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pelanggan..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {!selectedPromoId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mb-4 opacity-20" />
                <p>Pilih promo event terlebih dahulu untuk melihat capaian</p>
              </div>
            ) : achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <User className="h-12 w-12 mb-4 opacity-20" />
                <p>Belum ada data transaksi untuk promo ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead>Progress Hadiah</TableHead>
                      <TableHead className="text-center">Potensi Hadiah</TableHead>
                      <TableHead className="text-right">Potensi Bonus</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {achievements.map((item) => (
                      <TableRow key={item.pelangganId}>
                        <TableCell>
                          <div className="font-medium">{item.nama}</div>
                          <div className="text-xs text-muted-foreground">{item.kode}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.totalQty.toLocaleString()}
                        </TableCell>
                        <TableCell className="min-w-[150px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span>{item.totalQty % (selectedPromo?.minQty || 1)} / {selectedPromo?.minQty}</span>
                              <span className="font-semibold text-orange-600">{item.remainingForNext > 0 ? `-${item.remainingForNext} lagi` : 'Target Capai'}</span>
                            </div>
                            <Progress value={item.progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.potentialRewards > 0 ? "default" : "outline"} className={item.potentialRewards > 0 ? "bg-green-600" : ""}>
                            {item.potentialRewards} {selectedPromo?.hadiah || 'Hadiah'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                           Rp {item.potentialBonus.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-2 hover:bg-muted rounded-full">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium leading-none">Detail Capaian</h4>
                                <div className="text-sm space-y-1 pt-2 border-t">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Kalkulasi Qty:</span>
                                    <span className="font-mono">{item.totalQty}</span>
                                  </div>
                                  
                                  <div className="pt-2 mt-2 border-t font-semibold text-xs">HADIAH UTAMA</div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Target per {selectedPromo?.hadiah}:</span>
                                    <span className="font-mono">{selectedPromo?.minQty}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Hak:</span>
                                    <span className="font-bold text-primary">{item.potentialRewards}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground text-[10px]">Tercatat di Nota:</span>
                                    <span className="text-[10px]">{item.earnedRewards}</span>
                                  </div>

                                  {selectedPromo?.syarat_jumlah && (
                                    <>
                                      <div className="pt-2 mt-2 border-t font-semibold text-xs">BONUS KELIPATAN</div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Per {selectedPromo.syarat_jumlah} unit:</span>
                                        <span className="font-mono">Rp {selectedPromo.nilai?.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground font-semibold">Total Potensi:</span>
                                        <span className="font-bold text-green-600">Rp {item.potentialBonus.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground text-[10px]">Terpakai di Nota:</span>
                                        <span className="text-[10px]">Rp {item.earnedBonus.toLocaleString()}</span>
                                      </div>
                                    </>
                                  )}

                                  {item.lastTransaction && (
                                    <div className="text-[10px] text-muted-foreground mt-2 italic border-t pt-1">
                                      Hanya menghitung Nota LUNAS.
                                      <br/>Update terakhir: {format(item.lastTransaction, 'dd/MM/yyyy HH:mm')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
