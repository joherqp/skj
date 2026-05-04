'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDisplayName } from '@/lib/utils';
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

interface MutasiBarangFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MutasiBarangForm({ embedded, onSuccess, onCancel }: MutasiBarangFormProps) {
  const { user } = useAuth();
  const { barang, addMutasiBarang, addPersetujuan, addNotifikasi, users, satuan, stokPengguna, persetujuan, profilPerusahaan } = useDatabase();
  const tampilNama = profilPerusahaan?.config?.tampilNama || 'nama';
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    keCabangId: user?.cabangId || '', // Default to Same Branch
    receiverId: '',
    keterangan: ''
  });

  // Filter potential receivers based on SAME BRANCH logic
  const potentialReceivers = users.filter(u => {
      const myCabangId = user?.cabangId;
      if (!myCabangId) return false;

      // Use u.cabangId directly as karyawan is now merged into users
      const userCabangId = u.cabangId;

      // STRICT: Same branch only
      const isCabangMatch = userCabangId === myCabangId;
      
      // Filter out self as receiver
      const isNotSelf = u.id !== user?.id;

      // Allow ALL roles in same branch
      return isCabangMatch && isNotSelf && u.isActive !== false;
  }).sort((a, b) => getUserDisplayName(a, tampilNama).localeCompare(getUserDisplayName(b, tampilNama)));

  const [cart, setCart] = useState<{ barangId: string; jumlah: number; satuanId: string; konversi: number }[]>([]);



  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof typeof cart[0], value: string | number) => {
    const newCart = [...cart];
    (newCart[index] as any)[field] = value;

    // Handle Unit Logic on Product Change
    if (field === 'barangId') {
        const product = barang.find(b => b.id === value);
        if (product) {
            newCart[index].satuanId = product.satuanId;
            newCart[index].konversi = 1;
        }
    }

    // Handle Conversion on Unit Change
    if (field === 'satuanId') {
        const product = barang.find(b => b.id === newCart[index].barangId);
        if (product) {
             if (value === product.satuanId) {
                 newCart[index].konversi = 1;
             } else {
                 const multi = product.multiSatuan?.find(m => m.satuanId === value);
                 newCart[index].konversi = multi ? multi.konversi : 1;
             }
        }
    }

    setCart(newCart);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || cart.some(c => !c.barangId)) {
      toast.error('Lengkapi daftar barang');
      return;
    }
    if (!formData.receiverId) {
        toast.error('Pilih penerima mutasi');
        return;
    }

    // Validate Stock Availability
    for (const item of cart) {
        const product = barang.find(b => b.id === item.barangId);
        const stockEntry = stokPengguna.find(s => s.userId === user?.id && s.barangId === item.barangId);
        const currentStock = stockEntry ? stockEntry.jumlah : 0;
        
        // Calculate PENDING stock from other pending approvals
        const pendingStock = persetujuan
            .filter(p => p.status === 'pending' && p.diajukanOleh === user?.id && (p.jenis === 'mutasi_stok' || p.jenis === 'permintaan'))
            .reduce((sum, p) => {
                const pData = p.data as { items?: { barangId: string; jumlah: number; konversi?: number }[] };
                const pendingItems = pData?.items || [];
                const matchingItem = pendingItems.find(pi => pi.barangId === item.barangId);
                if (matchingItem) {
                    return sum + (Number(matchingItem.jumlah) * (Number(matchingItem.konversi) || 1));
                }
                return sum;
            }, 0);

        const availableStock = currentStock - pendingStock;
        const requestedQty = item.jumlah * (item.konversi || 1);
        
        if (requestedQty > availableStock) {
            toast.error(
                `Stok tidak cukup untuk ${product?.nama || 'Item'}. ` + 
                `Tersedia: ${availableStock} (Stok: ${currentStock}, Pending: ${pendingStock})`
            );
            return;
        }
    }
    setIsConfirmOpen(true);
  };

  const executeSubmit = () => {
    const timestamp = Date.now();
    const mutasiId = crypto.randomUUID();

    // Mutasi within same branch (Transfer Ownership)
    // Mutasi within same branch (Transfer Ownership)
    addMutasiBarang({
      id: mutasiId,
      nomorMutasi: `MUT/${timestamp.toString().slice(-6)}`,
      tanggal: new Date(),
      dariCabangId: user?.cabangId || 'unknown',
      keCabangId: user?.cabangId || 'unknown', // Same Branch
      items: cart.map(c => ({
        barangId: c.barangId,
        jumlah: c.jumlah,
        satuanId: c.satuanId,
        konversi: c.konversi,
        totalQty: c.jumlah * (c.konversi || 1)
      })),
      status: 'pending',
      keterangan: formData.keterangan
    });

    // Create Approval Notification
    addPersetujuan({
      // id let DB generate
      jenis: 'mutasi_stok',
      referensiId: mutasiId,
      status: 'pending',
      diajukanOleh: user?.id || 'system',
      targetCabangId: user?.cabangId || 'unknown',
      targetUserId: formData.receiverId,
      tanggalPengajuan: new Date(),
      targetRole: 'admin',
      data: {
        nomorMutasi: mutasiId,
        items: cart.map(i => ({
          barangId: i.barangId,
          jumlah: i.jumlah,
          satuanId: i.satuanId, // FIX: Include unit for display
          konversi: i.konversi,
          dariCabangId: user?.cabangId,
          keCabangId: user?.cabangId
        }))
      }
    });  // Notify Specific User
    const targetUsers = users.filter(u => u.id === formData.receiverId);

    targetUsers.forEach(targetUser => {
      const itemDetails = cart.map(item => {
        const b = barang.find(x => x.id === item.barangId);
        const s = satuan.find(x => x.id === item.satuanId);
        return `${b?.nama || 'Barang'} ${item.jumlah} ${s?.simbol || ''}`;
      }).join(', ');

      addNotifikasi({
        userId: targetUser.id,
        judul: 'Ada Kiriman Barang!',
        pesan: `${getUserDisplayName(user, tampilNama) || 'Seseorang'} ngirim ${itemDetails} ke kamu nih. Yuk dicek di menu persetujuan.`,
        jenis: 'warning',
        dibaca: false,
        tanggal: new Date(),
        link: '/persetujuan'
      });
    });

    if (targetUsers.length === 0) {
      toast.info('Info: Penerima tidak ditemukan.');
    }

    toast.success('Pengajuan Mutasi berhasil dikirim');
    setIsConfirmOpen(false);
    
    if (onSuccess) {
        onSuccess();
        setCart([]);
        setFormData(prev => ({ ...prev, keterangan: '' }));
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
                    <CardTitle className="flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5" />
                        Mutasi Barang (Internal Cabang)
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className={embedded ? "p-0" : ""}>
                <form onSubmit={handlePreSubmit} className="space-y-4">
                    
                    {/* Removed Destination Branch Select - Enforced Same Branch */}

                    <div className="space-y-2">
                        <Label>Penerima (Satu Cabang)</Label>
                        <SearchableSelect
                            value={formData.receiverId}
                            onChange={(val) => setFormData(prev => ({ ...prev, receiverId: val }))}
                            options={potentialReceivers.map(u => ({
                                value: u.id,
                                label: `${getUserDisplayName(u, tampilNama)} (${(u.roles || []).join(', ')})`
                            }))}
                            placeholder="Pilih penerima barang..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Keterangan</Label>
                        <Input 
                            placeholder="Contoh: Stok operan untuk tim sales" 
                            value={formData.keterangan}
                            onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Daftar Barang Mutasi</Label>
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
                        <div className="p-3 border rounded-lg bg-orange-50/50 space-y-2 border-dashed border-orange-200">
                            <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wider block mb-1">Cari & Tambah Produk</Label>
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
                                    .map(b => {
                                        const userStock = stokPengguna.find(s => s.userId === user?.id && s.barangId === b.id)?.jumlah || 0;
                                        const unitName = satuan.find(s => s.id === b.satuanId)?.simbol || 'Unit';
                                        return {
                                            value: b.id,
                                            label: b.nama,
                                            description: `Stok Kamu: ${userStock} ${unitName}`
                                        };
                                    })}
                            />
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm bg-slate-50/30">
                                Belum ada barang yang ditambahkan. Gunakan kolom pencarian di atas.
                            </div>
                        ) : (
                            <div className="space-y-3">
                            {cart.map((item, index) => {
                                const selectedBarang = barang.find(b => b.id === item.barangId);
                                const availableUnits = selectedBarang ? [
                                    { id: selectedBarang.satuanId, nama: satuan.find(s => s.id === selectedBarang.satuanId)?.simbol || 'Unit' },
                                    ...(selectedBarang.multiSatuan || []).map(m => ({
                                        id: m.satuanId,
                                        nama: satuan.find(s => s.id === m.satuanId)?.simbol || 'Unit'
                                    }))
                                ] : [];
                                
                                const userStockBase = stokPengguna.find(s => s.userId === user?.id && s.barangId === item.barangId)?.jumlah || 0;
                                const maxQtyInUnit = Math.floor(userStockBase / (item.konversi || 1));
                                const selectedUnitName = availableUnits.find(u => u.id === item.satuanId)?.nama || 'Unit';

                                return (
                                    <div key={index} className="p-3 border rounded-lg bg-white shadow-sm">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-6">
                                                <p className="font-semibold text-sm truncate">{selectedBarang?.nama || 'Produk'}</p>
                                                <div className="flex gap-2 items-center">
                                                    <p className="text-[10px] text-muted-foreground">Tersedia: {maxQtyInUnit} {selectedUnitName}</p>
                                                    {item.konversi > 1 && (
                                                        <p className="text-[10px] text-orange-600 font-medium">(1 {selectedUnitName} = {item.konversi} unit)</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="md:col-span-3">
                                                <Input 
                                                    type="number" 
                                                    min="1"
                                                    max={maxQtyInUnit}
                                                    className="h-8 text-right font-medium"
                                                    value={item.jumlah || ''}
                                                    onChange={(e) => updateItem(index, 'jumlah', parseInt(e.target.value) || 0)}
                                                    onFocus={(e) => e.target.select()}
                                                />
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
                                                            <SelectItem key={u.id} value={u.id} className="text-xs">
                                                                {u.nama}
                                                            </SelectItem>
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

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-6">
                        <Save className="w-4 h-4 mr-2" />
                        Kirim Mutasi
                    </Button>
                </form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Mutasi Barang</AlertDialogTitle>
                <AlertDialogDescription>
                    Mohon periksa kembali daftar mutasi barang berikut sebelum dikirim.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="text-sm bg-muted/50 p-3 rounded-md space-y-2">
                    <p><strong>Penerima:</strong> {getUserDisplayName(users.find(u => u.id === formData.receiverId), tampilNama) || '-'}</p>
                    <p><strong>Keterangan:</strong> {formData.keterangan || '-'}</p>
                </div>
                <div className="border rounded-md">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">Barang</th>
                                <th className="px-3 py-2 text-right font-medium">Qty</th>
                                <th className="px-3 py-2 text-left font-medium">Unit</th>
                                <th className="px-3 py-2 text-right font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {cart.map((item, idx) => {
                                const b = barang.find(x => x.id === item.barangId);
                                const u = satuan.find(s => s.id === b?.satuanId);
                                const currentUnitName = [
                                     { id: b?.satuanId, nama: u?.simbol },
                                     ...(b?.multiSatuan || []).map(m => ({ id: m.satuanId, nama: satuan.find(s => s.id === m.satuanId)?.simbol }))
                                ].find(x => x.id === item.satuanId)?.nama || '-';

                                return (
                                    <tr key={idx}>
                                        <td className="px-3 py-2">{b?.nama}</td>
                                        <td className="px-3 py-2 text-right">{item.jumlah}</td>
                                        <td className="px-3 py-2">{currentUnitName}</td>
                                        <td className="px-3 py-2 text-right">
                                            {item.jumlah * (item.konversi || 1)} {u?.simbol}
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
                <AlertDialogAction onClick={executeSubmit} className="bg-blue-600 hover:bg-blue-700">
                    Ya, Kirim
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MutasiBarang() {
  const router = useRouter();
  const { mutasiBarang } = useDatabase();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);

  if (showForm) {
      return (
          <div className="animate-in fade-in duration-500">
              <MutasiBarangForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          </div>
      )
  }

  // Sort by Date Descending
  const sortedMutasi = [...mutasiBarang].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  const displayMutasi = sortedMutasi.slice(0, displayLimit);

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
          {(user?.roles.includes('admin') || user?.roles.includes('owner') || user?.roles.includes('gudang')) && (
            <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Buat Mutasi
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {sortedMutasi.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada riwayat mutasi</p>
              </CardContent>
            </Card>
          ) : (
            <>
            {displayMutasi.map(mut => (
              <Card key={mut.id} elevated>
                <CardContent className="p-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="font-bold">{mut.nomorMutasi}</p>
                       <p className="text-sm text-muted-foreground">{new Date(mut.tanggal).toLocaleDateString()}</p>
                       {mut.keterangan && <p className="text-xs text-muted-foreground mt-1 italic">"{mut.keterangan}"</p>}
                     </div>
                     <Badge variant={mut.status === 'pending' ? 'warning' : 'success'}>
                       {mut.status}
                     </Badge>
                   </div>
                   <div className="mt-3 text-sm">
                      <p>Ke: {mut.keCabangId === 'cab-1' ? 'Pusat' : mut.keCabangId}</p>
                      <p className="text-muted-foreground">{(mut.items as import('@/types').MutasiItem[]).length} Barang</p>
                   </div>
                </CardContent>
              </Card>
            ))}
            
            {sortedMutasi.length > displayLimit && (
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
