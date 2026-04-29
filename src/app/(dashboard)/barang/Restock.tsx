'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PackagePlus, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
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

interface RestockFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
}

export function RestockForm({ embedded, onSuccess }: RestockFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const {
    barang, addRestock, addPersetujuan, addNotifikasi,
    users, cabang, satuan: satuanList
  } = useDatabase();
  const { user, hasRole } = useAuth();

  const [formData, setFormData] = useState({
    cabangId: '',
    receiverId: '',
    keterangan: 'Barang masuk dari pusat'
  });

  const [cart, setCart] = useState<{ barangId: string; jumlah: number; satuanId: string; konversi: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isOwner = hasRole(['owner', 'admin']);
  const targetCabangId = isOwner && formData.cabangId ? formData.cabangId : (user?.cabangId || '');

  // Filter potential receivers
  const potentialReceivers = users.filter(u => {
    if (!u.isActive) return false;
    const userCabangId = u?.cabangId;
    const isCabangMatch = userCabangId === targetCabangId;
    const isRoleMatch = (u.roles.includes('gudang') || u.roles.includes('driver') || u.roles.includes('leader') || u.roles.includes('admin') || u.roles.includes('staff') || u.roles.includes('sales'));
    return isCabangMatch && isRoleMatch;
  }).sort((a, b) => a.nama.localeCompare(b.nama));



  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof typeof cart[0], value: string | number) => {
    const newCart = [...cart];
    (newCart[index] as any)[field] = value;

    if (field === 'barangId') {
      const b = barang.find(x => x.id === value);
      if (b) {
        newCart[index].satuanId = b.satuanId;
        newCart[index].konversi = 1;
      }
    }

    if (field === 'satuanId') {
      const b = barang.find(x => x.id === newCart[index].barangId);
      if (b) {
        if (value === b.satuanId) {
          newCart[index].konversi = 1;
        } else {
          const multi = b.multiSatuan?.find(m => m.satuanId === value);
          newCart[index].konversi = multi ? multi.konversi : 1;
        }
      }
    }

    setCart(newCart);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || cart.some(c => !c.barangId || c.jumlah <= 0)) {
      toast.error('Lengkapi daftar barang dengan jumlah yang benar');
      return;
    }
    if (!user) return;
    if (!targetCabangId) {
      toast.error('Pilih cabang tujuan');
      return;
    }
    if (!formData.receiverId) {
      toast.error('Pilih penerima barang (Wajib)');
      return;
    }
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const receiverUser = users.find(u => u.id === formData.receiverId);
      const now = new Date();
      const datePart = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0');
      const timePart = now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');
      const nomorRestock = `RSK/${datePart}-${timePart}`;

      const itemsData = cart.map(item => {
        const b = barang.find(x => x.id === item.barangId)!;
        const totalQty = item.jumlah * item.konversi;
        const nilai = totalQty * (b.hargaBeli || 0);
        return {
          barangId: b.id,
          namaBarang: b.nama,
          jumlah: item.jumlah,
          satuanId: item.satuanId,
          konversi: item.konversi,
          totalQty: totalQty,
          nilai
        };
      });

      const totalNilai = itemsData.reduce((sum, it) => sum + it.nilai, 0);

      const restockRecord = await addRestock({
        id: crypto.randomUUID(),
        nomorRestock,
        tanggal: new Date(),
        produk: itemsData,
        cabangId: targetCabangId,
        penerimaId: formData.receiverId,
        dibuatOleh: user?.id,
        status: 'pending',
        keterangan: formData.keterangan
      });

      addPersetujuan({
        jenis: 'restock',
        referensiId: restockRecord.id,
        status: 'pending',
        diajukanOleh: user!.id,
        targetRole: 'gudang',
        targetCabangId: targetCabangId,
        targetUserId: formData.receiverId,
        tanggalPengajuan: new Date(),
        catatan: formData.keterangan,
        data: {
          nomorRestock,
          items: itemsData,
          nilai: totalNilai,
          receiverName: receiverUser?.nama,
          receiverId: formData.receiverId,
          targetCabangName: cabang.find(c => c.id === targetCabangId)?.nama
        }
      });


      const itemDetails = itemsData.map(it => `${it.jumlah} ${satuanList.find(s => s.id === it.satuanId)?.simbol || ''} ${it.namaBarang}`).join(', ');

      addNotifikasi({
        userId: formData.receiverId,
        judul: 'Ada Barang Masuk Nih!',
        pesan: `${user?.nama || 'Seseorang'} ngirim ${itemDetails} ke kamu. Yuk dicek dan diterima!`,
        jenis: 'info',
        dibaca: false,
        tanggal: new Date(),
        link: '/persetujuan'
      });

      toast.success('Permintaan Barang Masuk terkirim.');
      setIsConfirmOpen(false);

      if (onSuccess) {
        onSuccess();
      } else {
        if (returnTo) {
          router.push(returnTo);
        } else {
          router.push('/barang');
        }
      }
    } catch (error) {
      console.error('Error submitting restock:', error);
      toast.error('Gagal mengirim permintaan restock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={embedded ? "w-full" : "p-4 max-w-2xl mx-auto"}>
      {!embedded && (
        <Button
          variant="ghost"
          onClick={() => returnTo ? router.push(returnTo) : router.push('/barang')}
          className="mb-4 pl-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      )}

      <Card elevated={!embedded} className={embedded ? "border-0 shadow-none" : ""}>
        {!embedded && (
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <PackagePlus className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Form Barang Masuk / Restock</CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent className={embedded ? "p-0" : ""}>
          <form onSubmit={handlePreSubmit} className="space-y-4">

            {isOwner && (
              <div className="space-y-2">
                <Label>Cabang Tujuan</Label>
                <Select
                  value={formData.cabangId}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, cabangId: val, receiverId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cabang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[...cabang].sort((a, b) => a.nama.localeCompare(b.nama)).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Penerima (Wajib)</Label>
              <SearchableSelect
                value={formData.receiverId}
                onChange={(val) => setFormData(prev => ({ ...prev, receiverId: val }))}
                disabled={!targetCabangId && isOwner}
                placeholder="Pilih penerima"
                searchPlaceholder="Cari nama penerima..."
                emptyMessage="Tidak ada user di cabang ini"
                options={potentialReceivers.map(u => ({
                  value: u.id,
                  label: u.nama,
                  description: u.roles.join(', ')
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea
                placeholder="Catatan barang masuk..."
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Daftar Barang</Label>
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
              <div className="p-3 border rounded-lg bg-slate-50/50 space-y-2 border-dashed border-primary/20">
                <Label className="text-xs font-semibold text-primary/70 uppercase tracking-wider block mb-1">Cari & Tambah Produk</Label>
                <SearchableSelect
                  value=""
                  onChange={(val) => {
                    if (!val) return;
                    const b = barang.find(x => x.id === val);
                    if (b) {
                      const existingIdx = cart.findIndex(c => c.barangId === val);
                      if (existingIdx >= 0) {
                        const newCart = [...cart];
                        newCart[existingIdx].jumlah += 1;
                        setCart(newCart);
                        toast.success(`Jumlah ${b.nama} ditambahkan`);
                      } else {
                        setCart([...cart, { 
                          barangId: val, 
                          jumlah: 1, 
                          satuanId: b.satuanId, 
                          konversi: 1 
                        }]);
                        toast.success(`${b.nama} masuk daftar`);
                      }
                    }
                  }}
                  placeholder="Ketik nama produk untuk menambah..."
                  searchPlaceholder="Cari produk..."
                  options={barang
                    .filter(x => x.isActive)
                    .sort((a, b) => a.nama.localeCompare(b.nama))
                    .map(x => ({
                      value: x.id,
                      label: x.nama,
                      description: `Stok: ${x.stok || 0} ${satuanList.find(s => s.id === x.satuanId)?.simbol || ''}`
                    }))}
                />
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm bg-slate-50/30">
                  Belum ada barang yang ditambahkan. Gunakan kolom pencarian di atas untuk menambahkan barang.
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => {
                    const b = barang.find(x => x.id === item.barangId);
                    const availableUnits = b ? [
                      { id: b.satuanId, nama: satuanList.find(s => s.id === b.satuanId)?.simbol || 'Unit' },
                      ...(b.multiSatuan || []).map(m => ({
                        id: m.satuanId,
                        nama: satuanList.find(s => s.id === m.satuanId)?.simbol || 'Unit'
                      }))
                    ] : [];

                    return (
                      <div key={index} className="p-3 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div className="md:col-span-6">
                            <p className="font-semibold text-sm truncate">{b?.nama || 'Produk tidak ditemukan'}</p>
                            <p className="text-[10px] text-muted-foreground">ID: {b?.id.slice(-6)}</p>
                          </div>
                          
                          <div className="md:col-span-3">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                className="h-8 text-right font-medium"
                                value={item.jumlah || ''}
                                onChange={(e) => updateItem(index, 'jumlah', parseInt(e.target.value) || 0)}
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <Select
                              value={item.satuanId}
                              onValueChange={(val) => updateItem(index, 'satuanId', val)}
                              disabled={!item.barangId}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUnits.map(u => (
                                  <SelectItem key={u.id} value={u.id} className="text-xs">{u.nama}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full bg-success hover:bg-success/90 mt-4" disabled={cart.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Kirim Permintaan Barang Masuk ({cart.length} Item)
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Barang Masuk</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan data barang masuk berikut sudah benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
               <div>
                  <p className="text-xs text-muted-foreground">Penerima</p>
                  <p className="font-semibold">{users.find(u => u.id === formData.receiverId)?.nama || '-'}</p>
               </div>
               <div>
                  <p className="text-xs text-muted-foreground">Cabang</p>
                  <p className="font-semibold">{cabang.find(c => c.id === targetCabangId)?.nama || '-'}</p>
               </div>
               <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Keterangan</p>
                  <p className="italic">"{formData.keterangan}"</p>
               </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
               <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                     <tr>
                        <th className="px-3 py-2 text-left">Barang</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {cart.map((item, idx) => {
                        const b = barang.find(x => x.id === item.barangId);
                        const s = satuanList.find(x => x.id === item.satuanId);
                        return (
                           <tr key={idx}>
                              <td className="px-3 py-2 font-medium">{b?.nama || '-'}</td>
                              <td className="px-3 py-2 text-right">{item.jumlah}</td>
                              <td className="px-3 py-2">{s?.simbol || '-'}</td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeSubmit} className="bg-success hover:bg-success/90">
              Ya, Kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function RestockPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <RestockForm />
    </div>
  )
}
