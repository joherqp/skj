'use client';
import { useState } from 'react';
import { SettingsCrud } from '@/components/settings/components/SettingsCrud';
import { Percent, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Promo as PromoType } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRupiah } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function Promo() {
  const { promo, addPromo, updatePromo, deletePromo, barang, cabang, addPersetujuan } = useDatabase();
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('aktif');
  const isOwnerOrAdmin = hasRole(['owner', 'admin']);

  const filteredItems = [...(promo || [])].map(p => ({
    ...p,
    // Map DB/Camel keys to Form keys for correct editing initialization
    isActive: p.aktif ?? p.isActive,
    tanggalMulai: (p as any).berlakuMulai || (p as any).berlaku_mulai || p.tanggalMulai,
    tanggalBerakhir: (p as any).berlakuSampai || (p as any).berlaku_sampai || p.tanggalBerakhir,
    metodeKelipatan: (p as any).metode_kelipatan || p.metodeKelipatan || 'per_item',
    syaratJumlah: (p as any).syarat_jumlah || p.syarat_jumlah || p.syaratJumlah || 0,
  })).filter(p => {
    // Multi-branch filtering logic
    const isOwnerOrAdmin = hasRole(['owner', 'admin']);
    const userCabangId = user?.cabangId;
    const isTargetedToMyCabang = !p.cabangIds || p.cabangIds.length === 0 || (userCabangId && p.cabangIds.includes(userCabangId));
    
    if (!isOwnerOrAdmin && !isTargetedToMyCabang) return false;

    const now = new Date();
    const start = new Date(p.tanggalMulai);
    const end = p.tanggalBerakhir ? new Date(p.tanggalBerakhir) : null;

    // Determine status logic similarly to Report
    // Active = isActive AND start <= now AND (no end OR end >= now)
    const isActuallyActive = p.isActive && start <= now && (!end || end >= now);

    if (activeTab === 'aktif') return isActuallyActive;

    // Tidak Aktif = !Active (Expired, Pending, or manually Disabled)
    return !isActuallyActive;
  }).sort((a, b) => {
    // Sort logic
    const dateA = new Date(a.tanggalMulai || 0).getTime();
    const dateB = new Date(b.tanggalMulai || 0).getTime();

    // For Active tab, simple date sort
    if (activeTab === 'aktif') return dateB - dateA;

    // For Inactive: Pending (future) first, then Expired recent to old
    const now = new Date();
    const startA = new Date(a.tanggalMulai);
    const startB = new Date(b.tanggalMulai);
    const isPendingA = startA > now;
    const isPendingB = startB > now;

    if (isPendingA && !isPendingB) return -1;
    if (!isPendingA && isPendingB) return 1;

    return dateB - dateA;
  });

  return (
    <SettingsCrud<PromoType>
      title="Promo & Diskon"
      icon={Percent}
      items={filteredItems}
      extraContent={
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="aktif">Aktif</TabsTrigger>
            <TabsTrigger value="tidak">Tidak Aktif</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      columns={[
        { key: 'nama', label: 'Nama Promo' },
        { key: 'kode', label: 'Kode' },
        {
          key: 'tipe',
          label: 'Tipe',
          render: (item) => (
            <span className="capitalize">{item.tipe}</span>
          )
        },
        {
          key: 'nilai',
          label: 'Nilai',
          render: (item) => {
            let display = '';
            if (item.tipe === 'produk') {
              const pIds = item.bonusProdukIds && item.bonusProdukIds.length > 0 ? item.bonusProdukIds : (item.bonusProdukId ? [item.bonusProdukId] : []);
              const names = pIds.map(id => barang.find(b => b.id === id)?.nama).filter(Boolean).join(', ');
              display = names ? `Free: ${names.length > 30 ? names.substring(0, 30) + '...' : names}` : 'Free Item';
            } else if (item.tipe === 'event') {
              display = item.hadiah || 'Hadiah Event';
              if (item.snk) display += ` (S&K: ${item.snk.length > 20 ? item.snk.substring(0, 20) + '...' : item.snk})`;
            } else {
              display = item.tipe === 'persen' ? `${item.nilai}%` : formatRupiah(item.nilai);
            }

            if (item.isKelipatan && item.maxApply) {
              display += ` (Max ${item.maxApply}x)`;
            }
            return display;
          }
        },
        {
          key: 'cabangIds',
          label: 'Cabang',
          render: (item) => {
            if (!item.cabangIds || item.cabangIds.length === 0) {
              return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">Global</span>;
            }
            return (
              <div className="flex flex-wrap gap-1">
                {item.cabangIds.map(id => {
                  const name = cabang.find(c => c.id === id)?.nama || id;
                  return (
                    <span key={id} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-medium">
                      {name}
                    </span>
                  );
                })}
              </div>
            );
          }
        },
        {
          key: 'isActive',
          label: 'Status',
          render: (item) => (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {item.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          )
        }
      ]}
      initialFormState={{
        nama: '',
        kode: '',
        tipe: 'nominal',
        nilai: 0,
        scope: 'all',
        isActive: true,
        tanggalMulai: new Date(),
        targetProdukIds: [],
        cabangIds: [],
        minQty: 1,
        metodeKelipatan: 'per_item',
        hadiah: '',
        snk: ''
      }}
      onSave={async (item) => {
        const isOwner = hasRole(['owner']);
        const exists = item.id && !item.id.startsWith('new-');
        const prospectiveId = exists ? item.id : self.crypto.randomUUID();

        // Prepare Payload with Mapping
        const { isActive, tanggalMulai, tanggalBerakhir, metodeKelipatan, syaratJumlah, isNew: _isNew, id: _id, cabangId: _oldCid, ...rest } = item as any;
        const payloadToSave = {
          ...rest,
          id: prospectiveId,
          aktif: isActive,
          berlaku_mulai: tanggalMulai,
          berlaku_sampai: tanggalBerakhir,
          metode_kelipatan: metodeKelipatan,
          syarat_jumlah: syaratJumlah,
          cabang_ids: item.cabangIds || [],
          cabang_id: null // Ensure legacy column is cleared
        };

        console.log('Promo saving Payload:', payloadToSave);

        if (isOwner) {
          if (exists) {
            await updatePromo(item.id, payloadToSave as Partial<PromoType>);
          } else {
            const { id: _, ...newItem } = payloadToSave;
            await addPromo(newItem as Omit<PromoType, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>);
          }
        } else {
          // Non-Owner: Create Approval Request
          await addPersetujuan({
            jenis: 'promo',
            referensiId: prospectiveId,
            status: 'pending',
            diajukanOleh: user?.id,
            tanggalPengajuan: new Date(),
            targetRole: 'owner',
            catatan: exists ? `Update Promo: ${item.nama}` : `Promo Baru: ${item.nama}`,
            data: { ...payloadToSave, isNew: !exists }
          });
        }
      }}
      onDelete={deletePromo}
      renderForm={(formData, handleChange, setFormData) => (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Promo</Label>
              <Input
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                placeholder="Contoh: Diskon Merdeka"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Kode Promo</Label>
              <Input
                name="kode"
                value={formData.kode}
                onChange={handleChange}
                placeholder="MERDEKA45"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipe Promo</Label>
              <Select
                value={formData.tipe}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  tipe: value as PromoType['tipe'],
                  metodeKelipatan: value === 'event' ? 'periode_promo' : prev.metodeKelipatan === 'periode_promo' ? 'per_item' : prev.metodeKelipatan,
                  isKelipatan: value === 'event' ? true : prev.isKelipatan
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                  <SelectItem value="persen">Persen (%)</SelectItem>
                  <SelectItem value="produk">Bonus Produk</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.tipe === 'persen' ? 'Nilai Persen (%)' :
                  formData.tipe === 'produk' ? 'Qty Bonus (Per Kelipatan)' :
                    formData.tipe === 'event' ? 'Bonus Cashback (Rp/Poin)' :
                      'Nilai Potongan (Rp)'}
              </Label>
              <Input
                name="nilai"
                type="number"
                inputMode="numeric"
                onFocus={(e) => e.target.select()}
                value={formData.nilai}
                onChange={handleChange}
                required={formData.tipe !== 'event'}
              />
              {formData.tipe === 'event' && (
                <p className="text-[10px] text-muted-foreground">
                  Opsional. Diisi jika ada bonus cashback/poin per kelipatan.
                </p>
              )}
            </div>

            {formData.tipe === 'event' && (
              <>
                <div className="col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-md mb-2">
                  <h5 className="text-xs font-semibold text-blue-800 flex items-center gap-1 mb-1">
                    <Info className="w-3 h-3" /> Konfigurasi Event (Gebyar)
                  </h5>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Gunakan <strong>Target Utama</strong> untuk hadiah fisik (misal: 50 Dus untuk Kambing). <br />
                    Gunakan <strong>Bonus Cashback</strong> & <strong>Setiap Kelipatan</strong> untuk bonus rutin (misal: Rp 100rb per 10 Dus).
                  </p>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Hadiah Utama (Milestone)</Label>
                  <Input
                    name="hadiah"
                    value={formData.hadiah || ''}
                    onChange={handleChange}
                    placeholder="Contoh: 1 Ekor Kambing / TV 32 inch / Bingkisan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Utama (Threshold)</Label>
                  <Input
                    name="minQty"
                    type="number"
                    inputMode="numeric"
                    onFocus={(e) => e.target.select()}
                    value={formData.minQty || 0}
                    onChange={handleChange}
                    placeholder="Contoh: 50"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Jumlah minimal Dus untuk Hadiah Utama.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Bonus Setiap Kelipatan (Qty)</Label>
                  <Input
                    name="syaratJumlah"
                    type="number"
                    inputMode="numeric"
                    onFocus={(e) => e.target.select()}
                    value={formData.syaratJumlah || 0}
                    onChange={handleChange}
                    placeholder="Contoh: 10"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Kelipatan untuk perhitungan Bonus Cashback.
                  </p>
                </div>
              </>
            )}

            {formData.tipe === 'produk' && (
              <div className="col-span-2 space-y-4 border p-4 rounded-lg bg-slate-50">
                <h4 className="font-medium text-sm text-slate-900 border-b pb-2 mb-2">Konfigurasi Bonus Produk</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mekanisme Bonus</Label>
                    <Select
                      value={formData.mekanismeBonus || 'random'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, mekanismeBonus: value as 'random' | 'single' | 'mix' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Mekanisme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">Random (Otomatis)</SelectItem>
                        <SelectItem value="single">Pilih Satu (Single)</SelectItem>
                        <SelectItem value="mix">Campur (Mix)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      {formData.mekanismeBonus === 'random' ? 'Sistem memilih otomatis berdasarkan stok.' :
                        formData.mekanismeBonus === 'single' ? 'Pelanggan memilih 1 varian produk.' :
                          'Pelanggan bisa mencampur beberapa produk sesuai jumlah bonus.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Produk Bonus (Bisa pilih &gt; 1)</Label>
                    <div className="border rounded-md p-2 h-40 overflow-y-auto bg-white">
                      {[...barang]
                        .filter(b => b.isActive)
                        .sort((a, b) => a.nama.localeCompare(b.nama))
                        .map(product => {
                          const isChecked = (formData.bonusProdukIds || []).includes(product.id) || formData.bonusProdukId === product.id;
                          return (
                            <div key={product.id} className="flex items-center space-x-2 mb-1 pl-1">
                              <Checkbox
                                id={`b-${product.id}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const currentIds = new Set(formData.bonusProdukIds || []);
                                  if (formData.bonusProdukId) currentIds.add(formData.bonusProdukId); // Ensure legacy included

                                  if (checked) {
                                    currentIds.add(product.id);
                                  } else {
                                    currentIds.delete(product.id);
                                  }

                                  const newIds = Array.from(currentIds);
                                  setFormData(prev => ({
                                    ...prev,
                                    bonusProdukIds: newIds,
                                    bonusProdukId: newIds.length > 0 ? newIds[0] : undefined // Sync primary for legacy
                                  }));
                                }}
                              />
                              <label htmlFor={`b-${product.id}`} className="text-sm cursor-pointer select-none truncate">
                                {product.nama}
                              </label>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {formData.tipe === 'produk' ? 'Berlaku Setiap Kelipatan Qty' :
                  formData.tipe === 'event' ? 'Target Minimal Hadiah (Sudah di atas)' :
                    'Syarat Minimum Qty'}
              </Label>
              <Input
                name="minQty"
                type="number"
                inputMode="numeric"
                onFocus={(e) => e.target.select()}
                disabled={formData.tipe === 'event'}
                value={formData.minQty || 1}
                onChange={handleChange}
                min={1}
                placeholder="1"
              />
              <p className="text-[10px] text-muted-foreground">
                {formData.tipe === 'event'
                  ? 'Gunakan Target Utama di bagian konfigurasi event.'
                  : formData.tipe === 'produk'
                    ? 'Contoh: Setiap beli 10 dapat 1. Masukkan 10 disini.'
                    : 'Jika pembelian mencapai jumlah ini, promo akan berlaku.'}
              </p>
            </div>
          </div>

          {(formData.tipe === 'nominal' || formData.tipe === 'produk' || formData.tipe === 'event') && (
            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isKelipatan"
                  checked={formData.isKelipatan}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isKelipatan: !!checked }))}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="isKelipatan"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Berlaku Kelipatan
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Jika dicentang, promo akan dihitung setiap kelipatan jumlah minimum.
                  </p>
                </div>
              </div>

              {formData.isKelipatan && (
                <div className="space-y-2">
                  <Label>Metode Kelipatan</Label>
                  <Select
                    value={formData.metodeKelipatan || 'per_item'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, metodeKelipatan: value as 'per_item' | 'per_nota' | 'periode_promo' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Metode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_item">Per Item</SelectItem>
                      <SelectItem value="per_nota">Per Nota (Total Qty)</SelectItem>
                      <SelectItem value="periode_promo">Periode Promo (Akumulasi)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.metodeKelipatan === 'per_nota'
                      ? 'Total jumlah semua produk yang memenuhi syarat akan dihitung.'
                      : formData.metodeKelipatan === 'periode_promo'
                        ? 'Total akumulasi pembelian selama periode promo akan dihitung.'
                        : 'Setiap produk dihitung masing-masing.'}
                  </p>
                </div>
              )}

              {formData.isKelipatan && (
                <div className="space-y-2">
                  <Label>Batasi Maksimal Kelipatan (Opsional)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    onFocus={(e) => e.target.select()}
                    placeholder="Contoh: 3 (Maks 3x Bonus)"
                    value={formData.maxApply || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxApply: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Biarkan kosong jika tidak ada batasan.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Lingkup Promo</Label>
            <Select
              value={formData.scope}
              onValueChange={(value) => setFormData(prev => ({ ...prev, scope: value as PromoType['scope'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Lingkup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Produk</SelectItem>
                <SelectItem value="selected_products">Produk Tertentu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 border rounded-md p-3">
            <Label className="mb-2 block font-medium">Berlaku di Cabang</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {isOwnerOrAdmin && (
                <div className="flex items-center space-x-2 col-span-full border-b pb-2 mb-1">
                  <Checkbox
                    id="all-cabang-promo"
                    checked={!formData.cabangIds || formData.cabangIds.length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) setFormData(prev => ({ ...prev, cabangIds: [] }));
                    }}
                  />
                  <label htmlFor="all-cabang-promo" className="text-sm font-medium">Semua Cabang (Global)</label>
                </div>
              )}
              {cabang.filter(c => isOwnerOrAdmin || c.id === user?.cabangId).sort((a, b) => a.nama.localeCompare(b.nama)).map(c => (
                <div key={c.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cb-promo-${c.id}`}
                    checked={(formData.cabangIds || []).includes(c.id)}
                    onCheckedChange={(checked) => {
                      const current = formData.cabangIds || [];
                      if (checked) {
                        setFormData(prev => ({ ...prev, cabangIds: [...current, c.id] }));
                      } else {
                        setFormData(prev => ({ ...prev, cabangIds: current.filter(id => id !== c.id) }));
                      }
                    }}
                  />
                  <label htmlFor={`cb-promo-${c.id}`} className="text-sm">{c.nama}</label>
                </div>
              ))}
            </div>
          </div>

          {formData.scope === 'selected_products' && (
            <div className="space-y-2 border p-3 rounded-md max-h-40 overflow-y-auto">
              <Label className="mb-2 block">Pilih Target Produk</Label>
              {[...barang]
                .filter(b => b.isActive) // Filter inactive
                .sort((a, b) => a.nama.localeCompare(b.nama))
                .map(product => (
                  <div key={product.id} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      id={`p-${product.id}`}
                      checked={formData.targetProdukIds?.includes(product.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.targetProdukIds || [];
                        if (checked) {
                          setFormData(prev => ({ ...prev, targetProdukIds: [...currentIds, product.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, targetProdukIds: currentIds.filter(id => id !== product.id) }));
                        }
                      }}
                    />
                    <label htmlFor={`p-${product.id}`} className="text-sm cursor-pointer">{product.nama}</label>
                  </div>
                ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                name="tanggalMulai"
                value={formData.tanggalMulai ? new Date(formData.tanggalMulai).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggalMulai: e.target.value ? new Date(e.target.value) : new Date() }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Berakhir (Opsional)</Label>
              <Input
                type="date"
                name="tanggalBerakhir"
                value={formData.tanggalBerakhir ? new Date(formData.tanggalBerakhir).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, tanggalBerakhir: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Syarat & Ketentuan (S&K)</Label>
            <Textarea
              name="snk"
              value={formData.snk || ''}
              onChange={handleChange}
              placeholder="Masukkan syarat dan ketentuan promo di sini..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: !!checked }))}
            />
            <label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Promo Aktif
            </label>
          </div>
        </>
      )
      }
    />
  );
}
