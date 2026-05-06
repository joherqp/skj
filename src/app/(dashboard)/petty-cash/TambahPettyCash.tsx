'use client';
import { type ChangeEvent, type FormEvent, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wallet, Upload, ArrowLeft, Save, ArrowUpCircle, ArrowDownCircle, Info, User } from 'lucide-react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompression';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getUserDisplayName, toProperCase } from '@/lib/utils';

export default function TambahPettyCash() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as 'masuk' | 'keluar' || 'keluar';
  const editId = searchParams.get('id');
  
  const { user } = useAuth();
  const { addPettyCash, updatePettyCash, pettyCash, users, cabang, isAdminOrOwner, isFinance, profilPerusahaan } = useDatabase();
  
  const displayMode = profilPerusahaan?.config?.tampilNama || 'nama';
  
  const [formData, setFormData] = useState({
    keterangan: '',
    jumlah: '',
    kategori: 'umum',
    tanggal: new Date().toISOString().slice(0, 16), // datetime-local format
    bukti: '',
    penggunaAnggaran: user?.id || '',
    cabangId: user?.cabangId || ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [uploading, setUploading] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const hasLoadedData = useRef(false);

  // Load data if in edit mode
  useEffect(() => {
    const loadTransaction = async () => {
      if (!editId || hasLoadedData.current) return;

      // Try to find in cache first
      let transaction = pettyCash.find(p => p.id === editId);

      // If not in cache, fetch from Supabase
      if (!transaction) {
        try {
          const { data, error } = await supabase
            .from('petty_cash')
            .select('*')
            .eq('id', editId)
            .single();
          
          if (error) throw error;
          if (data) {
            transaction = {
              ...data,
              keterangan: data.keterangan,
              jumlah: data.jumlah,
              kategori: data.kategori,
              tanggal: data.tanggal,
              buktiUrl: data.bukti_url,
              penggunaAnggaran: data.pengguna_anggaran,
              tipe: data.tipe,
              cabangId: data.cabang_id
            };
          }
        } catch (error) {
          console.error("Error fetching transaction for edit:", error);
        }
      }

      if (transaction) {
        // Access Control: Finance/Leader/Manager can only edit if incomplete
        const isBranchAdmin = isFinance || user?.roles.includes('manager') || user?.roles.includes('leader');
        const isBelumTerisi = !transaction.keterangan || !transaction.buktiUrl || !transaction.penggunaAnggaran || !transaction.kategori;
        const canEdit = isAdminOrOwner || (isBranchAdmin && isBelumTerisi);

        if (!canEdit) {
            toast.error(isBranchAdmin ? 'Transaksi ini sudah lengkap dan tidak dapat diubah oleh Finance' : 'Hanya Admin yang dapat mengedit transaksi');
            router.push('/petty-cash');
            return;
        }

        setIsEditMode(true);
        hasLoadedData.current = true;
        
        // Preserve original casing but trim
        const rawKategori = transaction.kategori || '';
        const cleanKategori = rawKategori.trim() || 'umum';
        
        setFormData({
          keterangan: transaction.keterangan || '',
          jumlah: transaction.jumlah ? new Intl.NumberFormat('id-ID').format(transaction.jumlah) : '0',
          kategori: cleanKategori,
          tanggal: transaction.tanggal ? new Date(transaction.tanggal).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
          bukti: transaction.buktiUrl || '',
          penggunaAnggaran: transaction.penggunaAnggaran || '',
          cabangId: transaction.cabangId || ''
        });
        if (transaction.buktiUrl) {
          setPreviewUrl(transaction.buktiUrl);
        }
      }
    };

    loadTransaction();
  }, [editId, pettyCash, supabase]);

  // Get all unique categories from existing transactions
  const categoryOptions = useMemo(() => {
    const defaultCats = ['umum', 'konsumsi', 'transport', 'atk', 'lainnya'];
    
    // Get unique categories, preserving casing if possible but deduplicating
    const seen = new Set(defaultCats);
    const options = defaultCats.map(c => ({ label: toProperCase(c), value: c }));
    
    pettyCash.forEach(p => {
        const cat = (p.kategori || '').trim();
        if (cat && !seen.has(cat.toLowerCase())) {
            seen.add(cat.toLowerCase());
            options.push({ label: toProperCase(cat), value: cat });
        }
    });
    
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [pettyCash]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      
      try {
          toast.info('Mengompresi gambar...');
          const compressedFile = await compressImage(file);
          setSelectedFile(compressedFile);
          setPreviewUrl(URL.createObjectURL(compressedFile));
          toast.dismiss();
      } catch (error) {
          console.error('Compression error:', error);
          toast.error('Gagal mengompresi gambar, menggunakan file asli.');
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.keterangan || !formData.jumlah) {
        toast.error('Mohon lengkapi data');
        return;
    }

    try {
        setUploading(true);
        let finalBuktiUrl = formData.bukti;

        if (selectedFile) {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `pettycash-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('bukti-petty-cash')
                .upload(filePath, selectedFile);

            if (uploadError) {
                console.error('Upload proof error:', uploadError);
                toast.error('Gagal mengupload bukti transaksi');
                setUploading(false);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('bukti-petty-cash')
                .getPublicUrl(filePath);
            
            finalBuktiUrl = urlData.publicUrl;
        }

        const payload = {
            tanggal: new Date(formData.tanggal),
            keterangan: formData.keterangan,
            jumlah: parseFloat(formData.jumlah.replace(/\./g, '')),
            tipe: typeParam,
            jenis: (typeParam === 'masuk' ? 'pemasukan' : 'pengeluaran') as 'pemasukan' | 'pengeluaran',
            kategori: formData.kategori,
            buktiUrl: finalBuktiUrl,
            penggunaAnggaran: formData.penggunaAnggaran || user?.id || '',
            cabangId: formData.cabangId || user?.cabangId || ''
        };

        if (isEditMode && editId) {
            await updatePettyCash(editId, payload);
            toast.success('Transaksi berhasil diperbarui');
        } else {
            await addPettyCash(payload);
            toast.success('Transaksi berhasil dicatat');
        }
        
        router.push('/petty-cash');
    } catch (error) {
        console.error('Petty cash error:', error);
        toast.error(isEditMode ? 'Gagal memperbarui transaksi' : 'Gagal mencatat transaksi');
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-3 w-full max-w-md mx-auto space-y-4 pb-20">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/petty-cash')}
            className="pl-0 h-auto hover:bg-transparent"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-base font-medium">Kembali</span>
          </Button>
        </div>

        <Card className="border-none shadow-sm sm:border">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${typeParam === 'masuk' ? 'bg-green-100' : 'bg-red-100'}`}>
                {typeParam === 'masuk' ? (
                  <ArrowUpCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <CardTitle className="text-lg">
                {isEditMode ? 'Update Transaksi' : (typeParam === 'masuk' ? 'Input Pemasukan' : 'Input Pengeluaran')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            <div className={`border rounded-xl p-3 flex gap-3 items-start ${typeParam === 'masuk' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <Info className={`w-5 h-5 mt-0.5 shrink-0 ${typeParam === 'masuk' ? 'text-green-600' : 'text-red-600'}`} />
              <p className={`text-xs leading-relaxed ${typeParam === 'masuk' ? 'text-green-700' : 'text-red-700'}`}>
                {isEditMode 
                  ? 'Gunakan form ini untuk memperbarui data transaksi kas kecil yang sudah ada.'
                  : (typeParam === 'masuk' 
                      ? 'Gunakan form ini untuk mencatat penambahan saldo kas kecil (petty cash).' 
                      : 'Gunakan form ini untuk mencatat pengeluaran operasional yang menggunakan kas kecil.')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm">Keterangan</Label>
                <Textarea 
                  placeholder={typeParam === 'masuk' ? "Contoh: Penarikan dari Bank" : "Contoh: Beli kopi tamu"}
                  value={formData.keterangan}
                  onChange={e => setFormData({...formData, keterangan: e.target.value})}
                  required
                  className="resize-none h-20"
                />
              </div>

              <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-dashed">
                <Label className="text-sm">Jumlah (Rp)</Label>
                <Input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="0"
                  value={formData.jumlah}
                  onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = value ? new Intl.NumberFormat('id-ID').format(Number(value)) : '';
                      setFormData({...formData, jumlah: formatted});
                  }}
                  required
                  className="text-xl font-bold h-12 text-right tracking-wide"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tanggal & Waktu</Label>
                  <Input 
                    type="datetime-local"
                    value={formData.tanggal}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-sm">Kategori</Label>
                  <SearchableSelect 
                      options={categoryOptions}
                      value={formData.kategori}
                      onChange={(val) => setFormData({...formData, kategori: val})}
                      placeholder="Pilih atau cari kategori..."
                      searchPlaceholder="Cari kategori..."
                      className="h-11"
                  />
                </div>

                {isAdminOrOwner && (
                    <div className="space-y-1.5">
                        <Label className="text-sm flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5" /> Cabang
                        </Label>
                        <Select 
                            value={formData.cabangId} 
                            onValueChange={(val) => setFormData({...formData, cabangId: val})}
                        >
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Pilih Cabang..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cabang.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.nama}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {(isAdminOrOwner || (isFinance && user?.cabangId !== 'cab-pusat')) && (
                    <div className="space-y-1.5">
                        <Label className="text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" /> Dicatat Atas Nama
                        </Label>
                        <SearchableSelect 
                            options={users
                                .filter(u => isAdminOrOwner || u.cabangId === user?.cabangId)
                                .sort((a, b) => {
                                    // Sort by branch then by name
                                    const branchA = cabang.find(c => c.id === a.cabangId)?.nama || '';
                                    const branchB = cabang.find(c => c.id === b.cabangId)?.nama || '';
                                    if (branchA !== branchB) return branchA.localeCompare(branchB);
                                    return a.nama.localeCompare(b.nama);
                                })
                                .map(u => ({ 
                                    label: getUserDisplayName(u, displayMode), 
                                    value: u.id, 
                                    description: `${cabang.find(c => c.id === u.cabangId)?.nama || 'Tanpa Cabang'} - ${u.roles.join(', ')}`
                                }))
                            }
                            value={formData.penggunaAnggaran}
                            onChange={(val) => setFormData({...formData, penggunaAnggaran: val})}
                            placeholder="Pilih pengguna..."
                            searchPlaceholder="Cari nama pengguna..."
                            className="h-11"
                        />
                    </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Bukti (Opsional)</Label>
                <div 
                    className="border border-dashed border-input rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-accent/50 transition-colors bg-background relative overflow-hidden"
                    onClick={() => document.getElementById('bukti-upload-pc')?.click()}
                >
                  {previewUrl ? (
                      <div className="relative w-full h-48">
                          <img 
                            src={previewUrl} 
                            alt="Preview Bukti" 
                            className="w-full h-full object-contain rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                              <p className="text-white font-medium">Klik untuk ganti</p>
                          </div>
                      </div>
                  ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Upload Foto/Bukti</p>
                        <p className="text-xs text-muted-foreground mt-1">Hanya gambar (Max 10MB)</p>
                      </>
                  )}
                  <Input 
                    id="bukti-upload-pc"
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={uploading} 
                className={`w-full h-12 text-base font-semibold mt-4 shadow-lg rounded-xl ${
                  typeParam === 'masuk' 
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
              >
                <Save className={`w-5 h-5 mr-2 ${uploading ? 'animate-spin' : ''}`} />
                {uploading ? (isEditMode ? 'Memperbarui...' : 'Menyimpan...') : (isEditMode ? 'Perbarui Transaksi' : 'Simpan Transaksi')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
