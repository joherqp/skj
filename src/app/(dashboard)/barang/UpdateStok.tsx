'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, PackagePlus, ArrowLeftRight, FileDiff, ClipboardList } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RestockForm } from './Restock';
import { PermintaanBarangForm } from './PermintaanBarang';
import { MutasiBarangForm } from './MutasiBarang';
import { PenyesuaianBarangForm } from './PenyesuaianBarang';
import { useAuth } from '@/contexts/AuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from 'lucide-react';

export default function UpdateStok() {
    const router = useRouter();
    const { user } = useAuth();

    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam || '');
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    // Determine Access
    const isOwner = user?.roles.includes('owner');
    const isAdmin = user?.roles.includes('admin'); // Admin usually has full access
    const isGudang = user?.roles.includes('gudang');

    // Logic based on User Request:
    // Owner: Restock Only
    // Gudang: Mutasi & Penyesuaian (And likely Permintaan/Restock view? But request says "mutasi dan penyesuaian")
    // Others (Sales, Leader, Staff): Mutasi Only.

    // Refined Logic:
    // - Restock: Owner & Admin. (Maybe Gudang for 'Barang Masuk' form if they receive? But Restock.tsx is for initiating. Owner initiates.)
    // - Permintaan: Gudang, Sales, Leader, Staff, Admin. (Not Owner).
    // - Mutasi: Gudang, Sales, Leader, Staff, Admin. (Not Owner).
    // - Opname: Gudang, Admin.

    const showRestock = isOwner || isAdmin;
    const showPermintaan = !isOwner || isAdmin; // Owner usually doesn't make requests
    const showMutasi = !isOwner || isAdmin;     // Owner doesn't move stock manually usually
    const showOpname = isGudang || isAdmin;

    // Set default tab safely
    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        } else if (!activeTab) {
            if (showMutasi) setActiveTab('mutasi');
            else if (showRestock) setActiveTab('restock');
            else if (showPermintaan) setActiveTab('permintaan');
            else if (showOpname) setActiveTab('opname');
        }
    }, [showRestock, showPermintaan, showMutasi, showOpname, activeTab, tabParam]);

    if (!user) return null;

    return (
        <div className="animate-in fade-in duration-500">
            <div className="p-2 md:p-4 max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/barang')}
                    className="mb-4 pl-0"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Barang
                </Button>

                <Card elevated className="min-h-[600px]">
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle>Update Stok Barang</CardTitle>
                        <CardDescription>Kelola masuk dan keluar barang, mutasi, dan penyesuaian stok.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:p-6">
                        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 md:mb-8 h-auto bg-muted p-1">
                                {showMutasi && (
                                    <TabsTrigger value="mutasi" className="flex items-center gap-2 py-2">
                                        <ArrowLeftRight className="w-4 h-4" /> Mutasi
                                    </TabsTrigger>
                                )}
                                {showRestock && (
                                    <TabsTrigger value="restock" className="flex items-center gap-2 py-2">
                                        <PackagePlus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Barang Masuk</span>
                                        <span className="sm:hidden">Masuk</span>
                                    </TabsTrigger>
                                )}
                                {showPermintaan && (
                                    <TabsTrigger value="permintaan" className="flex items-center gap-2 py-2">
                                        <ClipboardList className="w-4 h-4" /> Permintaan
                                    </TabsTrigger>
                                )}
                                {showOpname && (
                                    <TabsTrigger value="opname" className="flex items-center gap-2 py-2">
                                        <FileDiff className="w-4 h-4" />
                                        <span className="hidden sm:inline">Stok Opname</span>
                                        <span className="sm:hidden">Opname</span>
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            {showMutasi && (
                                <TabsContent value="mutasi">
                                    <div className="p-2 md:p-4 border rounded-lg bg-slate-50">
                                        <MutasiBarangForm embedded onSuccess={() => setShowSuccessDialog(true)} />
                                    </div>
                                </TabsContent>
                            )}

                            {showRestock && (
                                <TabsContent value="restock">
                                    <div className="p-2 md:p-4 border rounded-lg bg-slate-50">
                                        <RestockForm embedded onSuccess={() => setShowSuccessDialog(true)} />
                                    </div>
                                </TabsContent>
                            )}

                            {showPermintaan && (
                                <TabsContent value="permintaan">
                                    <div className="p-2 md:p-4 border rounded-lg bg-slate-50">
                                        <PermintaanBarangForm embedded onSuccess={() => setShowSuccessDialog(true)} />
                                    </div>
                                </TabsContent>
                            )}

                            {showOpname && (
                                <TabsContent value="opname">
                                    <div className="p-2 md:p-4 border rounded-lg bg-slate-50">
                                        <PenyesuaianBarangForm embedded onSuccess={() => setShowSuccessDialog(true)} />
                                    </div>
                                </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                    <AlertDialogContent className="max-w-[400px]">
                        <AlertDialogHeader className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                            </div>
                            <AlertDialogTitle className="text-xl">Update Berhasil!</AlertDialogTitle>
                            <AlertDialogDescription className="text-base">
                                Data stok barang telah berhasil disimpan dan diteruskan untuk proses selanjutnya.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="sm:justify-center">
                            <AlertDialogAction 
                                onClick={() => router.push('/barang')}
                                className="w-full bg-success hover:bg-success/90"
                            >
                                Selesai
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}
