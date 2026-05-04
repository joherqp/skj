'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Plus, Trash2, ClipboardList } from 'lucide-react';
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

interface PermintaanBarangFormProps {
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PermintaanBarangForm({ embedded, onSuccess, onCancel }: PermintaanBarangFormProps) {
  const { user } = useAuth();
  const { barang, addPermintaanBarang, addPersetujuan, cabang, satuan: satuanList, users, profilPerusahaan } = useDatabase();
  const tampilNama = profilPerusahaan?.config?.tampilNama || 'nama';

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    keCabangId: '',
    targetUserId: '',
    catatan: ''
  });

  const [cart, setCart] = useState<{ barangId: string; jumlah: number; satuanId: string }[]>([]);



  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof typeof cart[0], value: string | number) => {
    const newCart = [...cart];
    (newCart[index] as any)[field] = value;

    // Auto-select default unit if product changed
    if (field === 'barangId') {
      const product = barang.find(b => b.id === value);
      if (product) {
        newCart[index].satuanId = product.satuanId;
      }
    }
    setCart(newCart);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keCabangId) {
      toast.error('Pilih cabang tujuan');
      return;
    }
    if (!formData.targetUserId) {
      toast.error('Pilih pengguna tujuan di cabang tersebut');
      return;
    }
    if (cart.length === 0 || cart.some(c => !c.barangId)) {
      toast.error('Lengkapi daftar barang');
      return;
    }
    setIsConfirmOpen(true);
  };

  const executeSubmit = async () => {
    try {
      const itemPayload = cart.map(c => {
        const product = barang.find(b => b.id === c.barangId);
        let conversion = 1;
        if (product && c.satuanId) {
          const multi = product.multiSatuan?.find(m => m.satuanId === c.satuanId);
          if (multi) conversion = multi.konversi;
        }
        return {
          ...c,
          konversi: conversion,
          totalQty: c.jumlah * conversion
        };
      });

      const newReq = await addPermintaanBarang({
        nomorPermintaan: `REQ/${Date.now().toString().slice(-6)}`,
        tanggal: new Date(),
        dariCabangId: user?.cabangId || 'cab-1',
        keCabangId: formData.keCabangId,
        items: itemPayload,
        status: 'pending',
        dibuatOleh: user?.id || 'system',
        catatan: formData.catatan
      });

      await addPersetujuan({
        jenis: 'permintaan',
        referensiId: (newReq as { id: string })?.id,
        status: 'pending',
        diajukanOleh: user?.id || 'system',
        targetCabangId: formData.keCabangId,
        targetRole: undefined,
        targetUserId: formData.targetUserId,
        tanggalPengajuan: new Date(),
        catatan: formData.catatan,
        data: {
          items: itemPayload,
          dariCabangId: user?.cabangId,
          keCabangId: formData.keCabangId,
        }
      });

      toast.success('Permintaan barang berhasil dibuat');
      setIsConfirmOpen(false);

      if (onSuccess) {
        onSuccess();
        setCart([]);
        setFormData(prev => ({ ...prev, catatan: '' }));
      }
    } catch (err) {
      console.error("Gagal membuat permintaan", err);
      toast.error('Gagal membuat permintaan barang');
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
            <CardTitle>Form Permintaan Barang</CardTitle>
          </CardHeader>
        )}
        <CardContent className={embedded ? "p-0" : ""}>
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tujuan Cabang (Gudang)</Label>
              <Select
                value={formData.keCabangId}
                onValueChange={(val) => setFormData(prev => ({ ...prev, keCabangId: val, targetUserId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Cabang (Gudang/Outlet)" />
                </SelectTrigger>
                <SelectContent>
                  {cabang.filter(c => c.id !== user?.cabangId && c.id !== 'cab-pusat' && !c.nama.toLowerCase().includes('pusat')).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.keCabangId && (
              <div className="space-y-2">
                <Label>Pilih Pengguna Cabang</Label>
                <SearchableSelect
                  value={formData.targetUserId}
                  onChange={(val) => setFormData(prev => ({ ...prev, targetUserId: val }))}
                  placeholder="Pilih pengguna untuk dituju..."
                  options={users
                    .filter(u => u.cabangId === formData.keCabangId && u.isActive !== false)
                    .map(u => ({ label: `${getUserDisplayName(u, tampilNama)} (${u.roles.join(', ')})`, value: u.id }))
                  }
                />
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Daftar Permintaan</Label>
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
                          satuanId: b.satuanId 
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
                      description: x.kode
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
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  updateItem(index, 'jumlah', isNaN(val) ? 0 : val);
                                }}
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

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={formData.catatan}
                onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full">
              <Save className="w-4 h-4 mr-2" /> Kirim Permintaan
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Permintaan Barang</AlertDialogTitle>
            <AlertDialogDescription>
              Periksa kembali daftar permintaan barang berikut sebelum dikirim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="text-sm bg-muted/50 p-3 rounded-md space-y-2">
              <p><strong>Tujuan:</strong> {cabang.find(c => c.id === formData.keCabangId)?.nama || '-'}</p>
              {formData.targetUserId && (
                <p><strong>Pengguna:</strong> {getUserDisplayName(users.find(u => u.id === formData.targetUserId), tampilNama)}</p>
              )}
              <p><strong>Catatan:</strong> {formData.catatan || '-'}</p>
            </div>
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Barang</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.map((item, idx) => {
                    const b = barang.find(x => x.id === item.barangId);
                    const u = satuanList.find(s => s.id === item.satuanId);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2">{b?.nama}</td>
                        <td className="px-3 py-2 text-right">{item.jumlah}</td>
                        <td className="px-3 py-2">{u?.simbol || u?.nama || 'Unit'}</td>
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

export function PermintaanBarangHistory() {
  const { permintaanBarang, cabang, satuan: satuanList } = useDatabase();
  const [displayLimit, setDisplayLimit] = useState(10);

  // Sort by Date Descending
  const sortedRequests = [...permintaanBarang].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  const displayRequests = sortedRequests.slice(0, displayLimit);

  // Helper to get unit name


  return (
    <div className="space-y-3">
      {sortedRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Belum ada riwayat permintaan</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {displayRequests.map(req => (
            <Card key={req.id} elevated>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{req.nomorPermintaan}</p>
                    <p className="text-sm text-muted-foreground">{new Date(req.tanggal).toLocaleDateString()}</p>
                    <p className="text-sm mt-1">Ke: {cabang.find(c => c.id === req.keCabangId)?.nama || req.keCabangId}</p>
                  </div>
                  <Badge variant={req.status === 'pending' ? 'warning' : 'success'}>
                    {req.status}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t text-sm">
                  <p>{req.items.length} Item diminta</p>
                  <p className="text-muted-foreground truncate max-w-xs">{req.catatan}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          {sortedRequests.length > displayLimit && (
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
  )
}

export default function PermintaanBarangPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div className="animate-in fade-in duration-500">
        <PermintaanBarangForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </div>
    )
  }

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
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Permintaan
          </Button>
        </div>

        <PermintaanBarangHistory />
      </div>
    </div>
  );
}
