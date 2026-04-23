import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PersetujuanPayload, Reimburse, User, Barang, Cabang } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { Building2, Clock, Coins, User as UserIcon, ArrowRight } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';

interface ApprovalConfirmDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    confirmDialog: {
        action: 'approve' | 'reject';
        id: string;
        type: string;
        refId: string;
        diajukanOleh?: string;
        data?: Record<string, unknown>;
    };
    onConfirm: () => void;
    reimburseMode: 'pay_now' | 'pay_later' | 'forward';
    setReimburseMode: (mode: 'pay_now' | 'pay_later' | 'forward') => void;
    users: User[];
    reimburse: Reimburse[];
    barang: Barang[];
    cabang: Cabang[];
    rejectionReason: string;
    setRejectionReason: (reason: string) => void;
}

export function ApprovalConfirmDialog({
    isOpen,
    onOpenChange,
    confirmDialog,
    onConfirm,
    reimburseMode,
    setReimburseMode,
    users,
    reimburse,
    barang,
    cabang,
    rejectionReason,
    setRejectionReason
}: ApprovalConfirmDialogProps) {

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {confirmDialog.action === 'approve' 
                            ? (['mutasi', 'permintaan', 'restock'].includes(confirmDialog.type) ? 'Konfirmasi Terima Barang' 
                              : confirmDialog.type === 'setoran' ? 'Konfirmasi Terima Uang' 
                              : 'Konfirmasi Persetujuan')
                            : 'Konfirmasi Penolakan'}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="mt-4 text-sm text-muted-foreground">
                            Apakah Anda yakin ingin {
                                confirmDialog.data?.forwardToPusat 
                                ? 'meneruskan pengajuan ini ke Pusat' 
                                : confirmDialog.action === 'approve' ? 'menyetujui pengajuan ini' : 'menolak pengajuan ini'
                            }?
                            Tindakan ini tidak dapat dibatalkan.

                            {/* Added Summary Context */}
                            <div className="mt-3 p-3 bg-slate-50 border rounded-lg text-slate-700 text-xs text-left">
                                {(() => {
                                    const type = confirmDialog.type;
                                    const data = confirmDialog.data as PersetujuanPayload;
                                    if (!data) return <p className="italic">Data tidak tersedia</p>;

                                    const findUser = (id?: string) => {
                                        if (!id) return null;
                                        if (id === 'pusat' || id === 'system' || id === 'admin') return { id, nama: 'Sistem/Pusat', roles: ['system'] } as unknown as User;
                                        let u = users.find(u => u.id === id);
                                        if (!u && typeof id === 'string') u = users.find(u => u.id === id.trim());
                                        return u;
                                    };

                                    const requesterId = confirmDialog.diajukanOleh || (data as any).diajukanOleh || (data as any).userId || (data as any).createdBy;
                                    const requester = findUser(requesterId);
                                    
                                    const requesterName = (requester?.nama && requester.nama !== 'Unknown' && requester.nama.trim() !== '') 
                                        ? requester.nama 
                                        : (requester?.username && requester.username !== 'Unknown' && requester.username.trim() !== '')
                                            ? requester.username
                                            : (data.userName || data.namaUser || data.nama || data.operator || data.karyawanNama || (data as any).diajukanOlehName || 
                                               (requesterId && requesterId !== 'Unknown' && requesterId.length > 5 
                                                 ? `User ${requesterId.substring(0, 8)}` 
                                                 : (requester?.id ? `User ${requester.id.substring(0, 8)}` : 'Sistem')));
                                    const requesterRole = requester?.roles?.[0] || '';

                                    // Helper to get amount from various possible fields
                                    const getAmount = (d: PersetujuanPayload) => {
                                        let amt = Number(d.amount || d.jumlah || d.nilai || d.total || d.totalSetoran || d.totalNominal || 0);
                                        // Fallback for reimburse if amount is 0
                                        if (amt === 0 && type === 'reimburse') {
                                            const rData = reimburse.find(r => r.id === confirmDialog.refId || r.persetujuanId === confirmDialog.id);
                                            if (rData) amt = rData.jumlah;
                                        }
                                        return amt;
                                    };
                                    // Helper to get proof URL
                                    const getProofUrl = (d: PersetujuanPayload) => (d.buktiUrl || d.buktiGambar || d.bukti || d.generalProofUrl) as string;
                                    // Helper to get branch name
                                    const getCabangName = (id?: string) => {
                                        if (!id || id === 'pusat' || id === 'Pusat' || id === 'system') return 'Pusat/Gudang';
                                        // Try direct match
                                        let c = cabang.find(c => c.id === id);
                                        // Try trimmed if string
                                        if (!c && typeof id === 'string') c = cabang.find(c => c.id === id.trim());
                                        
                                        if (c) return c.nama;
                                        
                                        // Handle names that might be passed as IDs
                                        if (id.length < 15 && isNaN(Number(id)) && !id.includes('-')) return id;

                                        return id.length > 15 ? `Cabang ${id.substring(0, 5)}` : id;
                                    };

                                    return (
                                        <div className="space-y-3">
                                            {/* Common Header for all types */}
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                                <UserIcon size={14} className="text-slate-400" />
                                                <div>
                                                    <p className="text-xs">
                                                        Diajukan oleh: <span className="font-semibold">{requesterName}</span>
                                                        {requesterRole && <span className="ml-1 text-[10px] bg-slate-200 px-1 rounded uppercase text-slate-600">{requesterRole}</span>}
                                                    </p>
                                                    {requester?.cabangId && (
                                                        <p className="text-[10px] text-muted-foreground">
                                                            Cabang: <span className="font-medium">{getCabangName(requester.cabangId)}</span> 
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {(() => {
                                                switch (type) {
                                                    case 'reimburse':
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p>Jenis: <span className="font-semibold text-pink-700">Reimbursement</span></p>
                                                                            {(() => {
                                                                                const rData = reimburse.find(r => r.id === confirmDialog.refId || r.persetujuanId === confirmDialog.id);
                                                                                if (rData?.jenis) return <p className="text-[10px] text-pink-600 font-medium uppercase mt-0.5">Kategori: {rData.jenis}</p>;
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                        {confirmDialog.refId && <span className="text-[9px] bg-pink-100 text-pink-700 px-1.5 rounded-full font-mono">{confirmDialog.refId.substring(0, 8)}</span>}
                                                                    </div>
                                                                    <p>Jumlah: <span className="font-bold text-pink-700 text-sm">{formatRupiah(getAmount(data))}</span></p>
                                                                    <p className="line-clamp-2 italic">Ket: {String(data.keterangan || data.catatan || 'Tanpa keterangan')}</p>
                                                                </div>
                                                                {getProofUrl(data) && (
                                                                    <div className="mt-2">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Bukti:</p>
                                                                        <a href={getProofUrl(data)} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 border-2 border-slate-200 rounded-md overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                                                                            <img src={getProofUrl(data)} alt="Bukti" className="w-full h-full object-cover" title="Klik untuk lihat ukuran penuh" />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'setoran':
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <p>Jenis: <span className="font-semibold text-blue-700">Setoran Saldo</span></p>
                                                                        {data.nomorSetoran && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-mono">{data.nomorSetoran}</span>}
                                                                    </div>
                                                                    <p>Jumlah: <span className="font-bold text-blue-700 text-sm">{formatRupiah(getAmount(data))}</span></p>
                                                                    {data.rekeningNama && <p>Ke: {String(data.rekeningNama)}</p>}
                                                                </div>
                                                                {getProofUrl(data) && (
                                                                    <div className="mt-2">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Bukti:</p>
                                                                        <a href={getProofUrl(data)} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 border-2 border-slate-200 rounded-md overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                                                                            <img src={getProofUrl(data)} alt="Bukti" className="w-full h-full object-cover" title="Klik untuk lihat ukuran penuh" />
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'rencana_setoran':
                                                        return (
                                                            <div className="space-y-2">
                                                                <div className="space-y-1">
                                                                    <p>Jenis: <span className="font-semibold text-indigo-700">Setoran ke Pusat</span></p>
                                                                    <p>Total Realisasi: <span className="font-bold text-indigo-700 text-sm">{formatRupiah(getAmount(data))}</span></p>
                                                                    <p className="text-[10px] text-muted-foreground">Periode: {data.startDate ? new Date(data.startDate).toLocaleDateString('id-ID') : '-'} s/d {data.endDate ? new Date(data.endDate).toLocaleDateString('id-ID') : '-'}</p>
                                                                </div>
                                                                {(data.transfers as any[])?.length > 0 && (
                                                                    <div className="mt-2">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Bukti Transfer ({ (data.transfers as any[]).length }):</p>
                                                                        <div className="flex gap-1 overflow-x-auto pb-1">
                                                                            {(data.transfers as any[]).map((t, i) => t.proofUrl && (
                                                                                <div key={i} className="w-12 h-12 shrink-0 border rounded overflow-hidden">
                                                                                    <img src={t.proofUrl} alt="Bukti" className="w-full h-full object-cover" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                     case 'permintaan':
                                                     case 'restock':
                                                         return (
                                                             <div className="space-y-1">
                                                                 <p>Jenis: <span className="font-semibold text-amber-700 capitalize">{type} Stok</span></p>
                                                                 <p>Total: <span className="font-bold">{(data.items as unknown[])?.length || 0} Jenis Barang</span></p>
                                                                 {/* List items if not too many */}
                                                                 {(data.items as any[])?.length > 0 && (
                                                                     <div className="mt-1 pt-1 border-t border-dashed">
                                                                         <div className="max-h-[80px] overflow-y-auto space-y-0.5">
                                                                             {(data.items as any[]).map((it, i) => {
                                                                                 const b = barang.find(x => x.id === it.barangId);
                                                                                 return (
                                                                                     <div key={i} className="flex justify-between text-[10px]">
                                                                                         <span className="truncate pr-2">{b?.nama || it.barangId}</span>
                                                                                         <span className="font-bold">{it.jumlah}</span>
                                                                                     </div>
                                                                                 );
                                                                             })}
                                                                         </div>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         );
                                                    case 'mutasi':
                                                    case 'mutasi_stok': {
                                                         let items = (data.items as { barangId: string; jumlah: number; satuanId?: string }[]) || [];
                                                         // Fallback for single item mutasi in dialog
                                                         if (!items.length && (data as any).barangId) {
                                                             items = [{ 
                                                                 barangId: (data as any).barangId, 
                                                                 jumlah: ((data as any).jumlah || 1) as number, 
                                                                 satuanId: (data as any).satuanId 
                                                             }];
                                                         }
                                                        return (
                                                            <div className="space-y-1 text-left">
                                                                <p className="font-bold text-indigo-700 mb-1">Pengajuan Mutasi Stok</p>
                                                                 <div className="flex justify-between items-center text-[10px] bg-indigo-50 p-2 rounded border border-indigo-100 mb-2">
                                                                     <div className="flex flex-col">
                                                                         <span className="text-muted-foreground uppercase text-[8px]">Dari Cabang</span>
                                                                         <span className="font-bold text-indigo-900">
                                                                             {getCabangName(data.dariCabangId || data.senderCabangId || (data as any).dari_cabang_id || requester?.cabangId)}
                                                                         </span>
                                                                     </div>
                                                                     <ArrowRight size={12} className="text-indigo-300" />
                                                                      <div className="flex flex-col text-right">
                                                                          <span className="text-muted-foreground uppercase text-[8px]">Ke Cabang</span>
                                                                          <span className="font-bold text-indigo-900">
                                                                              {getCabangName(data.keCabangId || (data as any).ke_cabang_id || (confirmDialog as any).targetCabangId || (data as any).destinationCabangId || (data as any).cabangId)}
                                                                          </span>
                                                                      </div>
                                                                </div>
                                                                
                                                                {items.length > 0 && (
                                                                    <div className="space-y-1">
                                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Daftar Barang ({items.length}):</p>
                                                                        <div className="max-h-[150px] overflow-y-auto pr-1 space-y-1 chat-scroll">
                                                                            {items.map((it, i) => {
                                                                                const bInfo = barang.find(b => b.id === it.barangId);
                                                                                return (
                                                                                    <div key={i} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                                                                                        <span className="truncate pr-2 font-medium">{bInfo?.nama || it.barangId}</span>
                                                                                        <span className="shrink-0 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{it.jumlah.toLocaleString('id-ID')}</span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    case 'promo':
                                                        return (
                                                            <div className="space-y-1">
                                                                <p>Jenis: <span className="font-semibold text-purple-700">Promo</span></p>
                                                                <p className="font-bold text-purple-700">{data.nama || data.namaPromo}</p>
                                                                <p className="text-xs">
                                                                    {data.tipe === 'produk' 
                                                                      ? `Bonus Produk (${data.mekanismeBonus === 'single' ? 'Pilih 1' : data.mekanismeBonus === 'mix' ? 'Campur' : 'Random'})`
                                                                      : `Diskon ${data.tipe === 'persen' ? data.nilai + '%' : formatRupiah(Number(data.nilai))}`}
                                                                </p>
                                                            </div>
                                                        );
                                                    case 'opname':
                                                        return (
                                                            <div className="space-y-1">
                                                                <p>Jenis: <span className="font-semibold text-rose-700">Stock Opname</span></p>
                                                                <p className="font-bold">{barang.find(b => b.id === data.barangId)?.nama || data.barangId}</p>
                                                                <p className="text-xs">Selisih: <span className="font-bold">{(data.selisih || 0) > 0 ? '+' : ''}{data.selisih}</span></p>
                                                            </div>
                                                        );
                                                    case 'diskon_manual':
                                                        return (
                                                            <div className="space-y-1">
                                                                <p>Jenis: <span className="font-semibold text-orange-700">Diskon Manual</span></p>
                                                                <p>Nilai Diskon: <span className="font-bold">{formatRupiah(Number(data.nilai || 0))}</span></p>
                                                                <p className="text-[10px] text-muted-foreground">Keterangan: {data.keterangan || '-'}</p>
                                                            </div>
                                                        );
                                                    default:
                                                        return (
                                                            <p className="capitalize">Pengajuan {type.replace(/_/g, ' ')}</p>
                                                        );
                                                }
                                            })()}
                                        </div>
                                    );

                                })()}
                            </div>
                        </div>
                    </AlertDialogDescription>

                    {/* Rejection Reason Input */}
                    {confirmDialog.action === 'reject' && (
                        <div className="mt-4">
                            <label className="text-sm font-medium mb-1.5 block">Alasan Penolakan</label>
                            <Textarea 
                                placeholder="Tuliskan alasan penolakan..." 
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    )}

                    {/* Reimburse Payment Options Selection */}
                    {confirmDialog.action === 'approve' && confirmDialog.type === 'reimburse' && !reimburse.find(r => r.id === confirmDialog.refId)?.disetujuiPada && (
                        <div className="mt-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-700 mb-2 px-1 text-left">Pilih Metode Penyelesaian:</p>
                            
                            <div className="grid gap-2">
                                {/* Pay Now Option */}
                                <div 
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${reimburseMode === 'pay_now' ? 'bg-pink-50 border-pink-500 ring-1 ring-pink-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    onClick={() => setReimburseMode('pay_now')}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reimburseMode === 'pay_now' ? 'border-pink-500' : 'border-slate-300'}`}>
                                        {reimburseMode === 'pay_now' && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Coins className="w-4 h-4 text-pink-600" />
                                            <p className="font-semibold text-sm">SETUJUI & BAYAR</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Disetujui dan langsung mengurangi saldo Kas Kecil (Petty Cash).</p>
                                    </div>
                                </div>

                                {/* Pay Later Option */}
                                <div 
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${reimburseMode === 'pay_later' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    onClick={() => setReimburseMode('pay_later')}
                                >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reimburseMode === 'pay_later' ? 'border-blue-500' : 'border-slate-300'}`}>
                                        {reimburseMode === 'pay_later' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <p className="font-semibold text-sm">HANYA SETUJUI</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">Status menjadi 'Disetujui', pembayaran dilakukan nanti.</p>
                                    </div>
                                </div>

                                {/* Forward Option (Only for branches if needed, but logic seems general) */}
                                {confirmDialog.data?.forwardToPusat !== true && (
                                     <div 
                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${reimburseMode === 'forward' ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                        onClick={() => setReimburseMode('forward')}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reimburseMode === 'forward' ? 'border-orange-500' : 'border-slate-300'}`}>
                                            {reimburseMode === 'forward' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-orange-600" />
                                                <p className="font-semibold text-sm">TERUSKAN KE PUSAT</p>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Reimburse diteruskan untuk persetujuan Manajemen Pusat.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => onOpenChange(false)}>Batal</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={(e) => {
                            e.preventDefault(); // Prevent auto close
                            onConfirm(); 
                        }}
                        disabled={confirmDialog.action === 'reject' && !rejectionReason.trim()}
                        className={confirmDialog.action === 'approve' 
                            ? (reimburseMode === 'pay_now' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700') 
                            : 'bg-red-600 hover:bg-red-700'}
                    >
                        {confirmDialog.action === 'approve' 
                            ? (reimburseMode === 'pay_now' ? 'Setujui & Bayar' : 'Ya, Setujui') 
                            : 'Ya, Tolak'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
