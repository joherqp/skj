'use client';

import { Users, Activity, CheckCircle, Target, ListFilter, MapPin, Coins, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { MapMode, MapMarker } from '../types';
import { Pelanggan, User, Absensi } from '@/types';

interface StatsOverviewProps {
    mapMode: MapMode;
    selectedCabang: string[];
    selectedUser: string[];
    users: User[];
    activeUsers: User[];
    todayAbsensi: Absensi[];
    markers: MapMarker[];
    listPelanggan: Pelanggan[];
}

export function StatsOverview({
    mapMode,
    selectedCabang,
    selectedUser,
    users,
    activeUsers,
    todayAbsensi,
    markers,
    listPelanggan
}: StatsOverviewProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mapMode === 'team' && (
                <>
                    <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mb-1">Total Tim ({selectedCabang.length > 0 ? `${selectedCabang.length} Cabang` : 'Semua'})</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-blue-700">{users.filter(u => (selectedCabang.length === 0 || (u.cabangId && selectedCabang.includes(u.cabangId))) && (selectedUser.length === 0 || selectedUser.includes(u.id))).length}</h4>
                                <Users className="w-4 h-4 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Aktif Sekarang</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-green-700">{activeUsers.filter(u => todayAbsensi.some(a => a.userId === u.id && !a.checkOut)).length}</h4>
                                <Activity className="w-4 h-4 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-200/50 col-span-2 md:col-span-1">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mb-1">Selesai/Pulang</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-orange-700">{todayAbsensi.filter(a => !!a.checkOut).length}</h4>
                                <CheckCircle className="w-4 h-4 text-orange-400" />
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {mapMode === 'pelanggan' && (
                <>
                    <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mb-1">Titik Pelanggan</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-emerald-700">{markers.length}</h4>
                                <Target className="w-4 h-4 text-emerald-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-cyan-600 font-semibold uppercase tracking-wider mb-1">Total Terdata</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-cyan-700">{listPelanggan.length}</h4>
                                <ListFilter className="w-4 h-4 text-cyan-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-200/50 col-span-2 md:col-span-1">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mb-1">Cakupan Wilayah</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-indigo-700">{new Set(listPelanggan.map(p => p.cabangId)).size} Cabang</h4>
                                <MapPin className="w-4 h-4 text-indigo-400" />
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {mapMode === 'transaksi' && (
                <>
                    <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border-red-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-1">Total Penjualan</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-red-700">{formatRupiah(markers.reduce((sum, m) => sum + ((m.data as { total: number })?.total || 0), 0))}</h4>
                                <Coins className="w-4 h-4 text-red-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-500/10 to-rose-500/10 border-orange-200/50">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mb-1">Volume Nota</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-orange-700">{markers.length} Nota</h4>
                                <ShoppingCart className="w-4 h-4 text-orange-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200/50 col-span-2 md:col-span-1">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-1">Rerata Transaksi</p>
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-amber-700">
                                    {formatRupiah(markers.length > 0 ? markers.reduce((sum, m) => sum + ((m.data as { total: number })?.total || 0), 0) / markers.length : 0)}
                                </h4>
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
