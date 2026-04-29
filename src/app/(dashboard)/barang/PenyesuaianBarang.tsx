'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Plus, FileDiff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';

interface PenyesuaianBarangFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

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

export function PenyesuaianBarangForm({ embedded, onSuccess, onCancel }: PenyesuaianBarangFormProps) {
  const { user } = useAuth();
  const { barang, stokPengguna, addPenyesuaianStok, addPersetujuan } = useDatabase();
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cart, setCart] = useState<{ barangId: string; stokFisik: string; alasan: string; keterangan: string }[]>([]);

  const getStokSistem = (barangId: string) => {
    if (!user || !barangId) return 0;
    const userStock = stokPengguna.find(s => s.userId === user.id && s.barangId === barangId);
    if (userStock) return userStock.jumlah;
    return 0;
  };

  const updateItem = (index: number, field: keyof typeof cart[0], value: string) => {
    const newCart = [...cart];
    newCart[index][field] = value;
    setCart(newCart);
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Tambahkan setidaknya satu barang');
      return;
    }
    if (cart.some(c => !c.stokFisik)) {
      toast.error('Lengkapi semua data stok fisik');
      return;
    }
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    try {
      for (const item of cart) {
        const stokSistem = getStokSistem(item.barangId);
        const fisik = parseInt(item.stokFisik) || 0;
        const selisih = fisik - stokSistem;
        const nomorAdj = `ADJ/${Date.now().toString().slice(-6)}`;

        const newAdj = await addPenyesuaianStok({
          nomorPenyesuaian: nomorAdj,
          tanggal: new Date(),
          cabangId: user?.cabangId || 'cab-1',
          barangId: item.barangId,
          stokTercatat: stokSistem,
          stokFisik: fisik,
          selisih: selisih,
          alasan: item.alasan as 'rusak' | 'hilang' | 'ditemukan' | 'lainnya',
          keterangan: item.keterangan,
          status: 'pending'
        });

        await addPersetujuan({
          jenis: 'opname',
          referensiId: (newAdj as { id: string }).id,
          status: 'pending',
          diajukanOleh: user?.id || 'system',
          targetRole: 'admin',
          tanggalPengajuan: new Date(),
          catatan: item.keterangan,
          data: {
            barangId: item.barangId,
            stokTercatat: stokSistem,
            stokFisik: fisik,
            selisih: selisih,
            alasan: item.alasan,
            nomorPenyesuaian: nomorAdj
          }
        });
      }

      toast.success(`${cart.length} Penyesuaian stok diajukan`);
      setIsConfirmOpen(false);

      if (onSuccess) {
        onSuccess();
        setCart([]);
      }
    } catch (error) {
      toast.error('Gagal mengajukan penyesuaian');
      console.error(error);
    }
  };

  return (
    <div className={embedded ? "w-full" : "p-4 max-w-2xl mx-auto space-y-4"}>
      {!embedded && (
        <Button variant="ghost" onClick={onCancel} className="pl-0">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      )}

      <Card elevated={!embedded} className={embedded ? "border-0 shadow-none" : ""}>
        {!embedded && (
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <FileDiff className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Form Stock Opname / Penyesuaian</CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent className={embedded ? "p-0" : ""}>
          <form onSubmit={handlePreSubmit} className="space-y-4">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Daftar Penyesuaian</Label>
                {cart.length > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/5" 
                    onClick={() => setCart([])}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Hapus Semua
                  </Button>
                )}
              </div>

              {/* Quick Add Product Bar */}
              <div className="p-3 border rounded-lg bg-slate-50/50 space-y-2 border-dashed border-purple-200">
                <Label className="text-xs font-semibold text-purple-700 uppercase tracking-wider block mb-1">Cari & Tambah Produk</Label>
                <SearchableSelect
                  value=""
                  onChange={(val) => {
                    if (!val) return;
                    const b = barang.find(x => x.id === val);
                    if (b) {
                      const existingIdx = cart.findIndex(c => c.barangId === val);
                      if (existingIdx >= 0) {
                        toast.error(`${b.nama} sudah ada di daftar`);
                      } else {
                        setCart([...cart, { 
                          barangId: val, 
                          stokFisik: '', 
                          alasan: 'rusak', 
                          keterangan: '' 
                        }]);
                        toast.success(`${b.nama} siap disesuaikan`);
                      }
                    }
                  }}
                  placeholder="Ketik nama produk untuk menyesuaikan stok..."
                  searchPlaceholder="Cari produk..."
                  options={barang
                    .filter(x => x.isActive)
                    .sort((a, b) => a.nama.localeCompare(b.nama))
                    .map(x => ({
                      value: x.id,
                      label: x.nama,
                      description: `ID: ${x.id.slice(-6)}`
                    }))}
                />
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm bg-slate-50/30">
                  Belum ada barang yang dipilih. Gunakan kolom pencarian di atas.
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const b = barang.find(x => x.id === item.barangId);
                    const sysStock = getStokSistem(item.barangId);
                    const diff = (parseInt(item.stokFisik) || 0) - sysStock;

                    return (
                      <div key={index} className="p-4 border rounded-lg bg-white shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{b?.nama || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground">Stok Sistem: <span className="font-medium text-foreground">{sysStock}</span></p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Stok Fisik</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                className="h-9 pr-8"
                                value={item.stokFisik}
                                onChange={(e) => updateItem(index, 'stokFisik', e.target.value)}
                                placeholder="0"
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {item.stokFisik && (
                                  <span className={`text-[10px] font-bold ${diff < 0 ? 'text-destructive' : 'text-success'}`}>
                                    {diff > 0 ? '+' : ''}{diff}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Alasan</Label>
                            <Select 
                              value={item.alasan} 
                              onValueChange={(val) => updateItem(index, 'alasan', val)}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rusak">Rusak</SelectItem>
                                <SelectItem value="hilang">Hilang</SelectItem>
                                <SelectItem value="ditemukan">Ditemukan</SelectItem>
                                <SelectItem value="lainnya">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Keterangan (Opsional)</Label>
                          <Input 
                            className="h-8 text-xs"
                            value={item.keterangan}
                            onChange={(e) => updateItem(index, 'keterangan', e.target.value)}
                            placeholder="Contoh: Pecah saat bongkar"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={cart.length === 0}>
              <Save className="w-4 h-4 mr-2" /> Ajukan {cart.length} Penyesuaian
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="max-w-xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Penyesuaian Stok</AlertDialogTitle>
                <AlertDialogDescription>
                    Pastikan data stok opname untuk {cart.length} item berikut sudah benar.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="border rounded-lg overflow-hidden">
                   <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground">
                         <tr>
                            <th className="px-3 py-2 text-left">Barang</th>
                            <th className="px-3 py-2 text-right">Fisik</th>
                            <th className="px-3 py-2 text-right">Selisih</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y">
                         {cart.map((item, idx) => {
                            const b = barang.find(x => x.id === item.barangId);
                            const sys = getStokSistem(item.barangId);
                            const fis = parseInt(item.stokFisik) || 0;
                            const diff = fis - sys;
                            return (
                               <tr key={idx}>
                                  <td className="px-3 py-2">
                                     <p className="font-medium">{b?.nama || '-'}</p>
                                     <p className="text-[10px] text-muted-foreground capitalize">{item.alasan}</p>
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">{fis}</td>
                                  <td className={`px-3 py-2 text-right font-bold ${diff < 0 ? 'text-destructive' : 'text-success'}`}>
                                     {diff > 0 ? '+' : ''}{diff}
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={executeSubmit} className="bg-purple-600 hover:bg-purple-700">
                    Ya, Simpan Semua
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PenyesuaianBarang() {
  const router = useRouter();
  const { barang, penyesuaianStok } = useDatabase();
  const [showForm, setShowForm] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);

  if (showForm) {
      return (
          <div className="animate-in fade-in duration-500">
              <PenyesuaianBarangForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          </div>
      )
  }

  // Sort by Date Descending
  const sortedAdjustments = [...penyesuaianStok].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  const displayAdjustments = sortedAdjustments.slice(0, displayLimit);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/barang')}
            className="pl-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Buat Penyesuaian
          </Button>
        </div>

        <div className="space-y-3">
          {sortedAdjustments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <FileDiff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada riwayat penyesuaian</p>
              </CardContent>
            </Card>
          ) : (
            <>
            {displayAdjustments.map(adj => {
              const item = barang.find(b => b.id === adj.barangId);
              return (
                <Card key={adj.id} elevated>
                  <CardContent className="p-4">
                     <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold">{adj.nomorPenyesuaian}</p>
                         <p className="text-sm font-semibold">{item?.nama || 'Unknown Item'}</p>
                         <p className="text-xs text-muted-foreground">{new Date(adj.tanggal).toLocaleDateString()}</p>
                       </div>
                       <Badge variant={adj.status === 'pending' ? 'warning' : 'success'}>
                         {adj.status}
                       </Badge>
                     </div>
                     <div className="mt-3 pt-3 border-t text-sm flex justify-between">
                        <div>
                          <span className="text-muted-foreground">Selisih: </span>
                          <span className={adj.selisih < 0 ? 'text-destructive font-bold' : 'text-success font-bold'}>
                            {adj.selisih > 0 ? '+' : ''}{adj.selisih}
                          </span>
                        </div>
                        <span className="capitalize px-2 py-0.5 bg-muted rounded text-xs">
                          {adj.alasan}
                        </span>
                     </div>
                  </CardContent>
                </Card>
              );
            })}

            {sortedAdjustments.length > displayLimit && (
                 <Button 
                     variant="ghost" 
                     className="w-full mt-4 border-dashed text-muted-foreground"
                     onClick={() => setDisplayLimit(prev => prev + 10)}
                 >
                     Lihat Lainnya
                 </Button>
             )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
