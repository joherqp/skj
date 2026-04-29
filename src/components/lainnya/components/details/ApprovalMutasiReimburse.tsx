import { Badge } from '@/components/ui/badge';
import { PersetujuanPayload, Barang, Satuan, Reimburse } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { ImagePreviewModal } from '@/components/shared/ImagePreviewModal';

export function ApprovalMutasi({ 
    data, 
    barang, 
    satuan 
}: { 
    data: PersetujuanPayload; 
    barang: Barang[]; 
    satuan: Satuan[];
}) {
    let items = (data.items || []) as { barangId: string; jumlah: number; satuanId?: string; namaBarang?: string }[];
    
    // Fallback for single item (used in some Restock/Mutasi forms)
    if (!items.length && ((data as any).barangId || (data as any).namaBarang)) {
        items = [{
            barangId: (data as any).barangId,
            namaBarang: (data as any).namaBarang,
            jumlah: (data as any).jumlah || (data as any).nilai || 0,
            satuanId: (data as any).satuanId
        }];
    }
    
    const getUnitName = (id?: string) => satuan.find(s => s.id === id)?.nama || '';

    return (
        <div className="space-y-4">
            <div className="bg-muted p-2 font-medium text-sm rounded">Daftar Barang Mutasi</div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {items.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Tidak ada item.</p>}
                {items.map((it, idx) => {
                    const b = barang.find(x => x.id === it.barangId);
                    const unit = getUnitName(it.satuanId || b?.satuanId);
                    return (
                        <div key={idx} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-muted/50 text-sm">
                            <span className="font-medium">{b?.nama || it.namaBarang || it.barangId}</span>
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{(Number(it.jumlah) || 0).toLocaleString('id-ID')} {unit}</span>
                        </div>
                    );
                })}
            </div>
            {(data.nilai !== undefined && data.nilai !== null) && (
                <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 font-bold">
                    <span>Total Nilai (Estimasi):</span>
                    <span>{formatRupiah(Number(data.nilai))}</span>
                </div>
            )}
            {data.catatan && (
                <div className="p-3 bg-blue-50 text-blue-800 text-sm italic rounded border border-blue-100">
                    Catatan: "{data.catatan}"
                </div>
            )}
        </div>
    );
}

export function ApprovalReimburse({ 
    data,
    reference
}: { 
    data: PersetujuanPayload;
    reference?: Reimburse;
}) {
    return (
        <div className="space-y-4">
             <div className="p-4 bg-pink-50 border border-pink-100 rounded-lg">
                 <div className="flex justify-between items-start mb-2">
                     <span className="text-sm font-semibold text-pink-900 uppercase">Total Reimburse</span>
                      <span className="text-xl font-bold text-pink-700">{formatRupiah(data.amount || data.jumlah || data.nilai || 0)}</span>
                 </div>
                 
                 <div className="space-y-2 mt-4">
                     <div>
                         <span className="text-xs text-muted-foreground block">Keterangan/Keperluan</span>
                         <p className="text-sm text-slate-800 bg-white p-2 rounded border border-pink-100 min-h-[60px]">
                             {data.keterangan || data.catatan || reference?.keterangan || '-'}
                         </p>
                     </div>
                     
                     {(data.buktiUrl || data.buktiGambar || data.bukti || reference?.bukti || reference?.buktiUrl) && (
                        <div>
                             <span className="text-xs text-muted-foreground block mb-1">Bukti Transaksi</span>
                             <div className="flex gap-2 overflow-x-auto pb-2">
                                 <div className="w-48 h-48 shrink-0">
                                    <ImagePreviewModal 
                                        src={(data.buktiUrl || data.buktiGambar || data.bukti || reference?.bukti || reference?.buktiUrl) as string} 
                                        alt="Bukti Reimburse" 
                                        title="Detail Bukti Reimburse" 
                                    />
                                 </div>
                             </div>
                        </div>
                     )}
                 </div>
             </div>
        </div>
    );
}
