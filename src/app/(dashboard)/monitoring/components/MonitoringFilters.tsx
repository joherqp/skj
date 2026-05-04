'use client';

import { Building, Users, ChevronDown, Crosshair, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker";
import { MapMode } from '../types';
import { Cabang, User } from '@/types';

interface MonitoringFiltersProps {
    currentUser: any;
    selectedCabang: string[];
    setSelectedCabang: (cabang: string[]) => void;
    listCabang: Cabang[];
    selectedUser: string[];
    setSelectedUser: (users: string[]) => void;
    users: User[];
    mapMode: MapMode;
    setMapMode: (mode: MapMode) => void;
    duplicateGroupsCount: number;
    colorIndicator: 'pengguna' | 'cabang' | 'kategori';
    setColorIndicator: (indicator: 'pengguna' | 'cabang' | 'kategori') => void;
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
}

export function MonitoringFilters({
    currentUser,
    selectedCabang,
    setSelectedCabang,
    listCabang,
    selectedUser,
    setSelectedUser,
    users,
    mapMode,
    setMapMode,
    duplicateGroupsCount,
    colorIndicator,
    setColorIndicator,
    dateRange,
    setDateRange
}: MonitoringFiltersProps) {
    const isAdmin = currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner') || currentUser?.roles.includes('finance');
    const isAdminOwner = currentUser?.roles.includes('admin') || currentUser?.roles.includes('owner');
    const isLeader = currentUser?.roles.includes('leader');
    const isSales = currentUser?.roles.includes('sales');

    return (
        <div className="flex flex-col md:flex-row gap-2 p-2 bg-muted/40 rounded-xl border">
            {isAdmin && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full md:w-[200px] h-9 text-xs justify-between bg-background font-normal px-3">
                                <div className="flex items-center gap-2 truncate">
                                    <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                        {selectedCabang.length === 0
                                            ? "Semua Cabang"
                                            : `${selectedCabang.length} Cabang`}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Pilih Cabang</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedCabang.length === 0}
                                onCheckedChange={() => setSelectedCabang([])}
                            >
                                Semua Cabang
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {listCabang.map(cabang => (
                                <DropdownMenuCheckboxItem
                                    key={cabang.id}
                                    checked={selectedCabang.includes(cabang.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedCabang([...selectedCabang, cabang.id]);
                                        } else {
                                            setSelectedCabang(selectedCabang.filter(id => id !== cabang.id));
                                        }
                                    }}
                                >
                                    {cabang.nama}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full md:w-[200px] h-9 text-xs justify-between bg-background font-normal px-3">
                                <div className="flex items-center gap-2 truncate">
                                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                        {selectedUser.length === 0
                                            ? "Semua Tim"
                                            : `${selectedUser.length} Tim`}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto">
                            <DropdownMenuLabel>Pilih Tim</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={selectedUser.length === 0}
                                onCheckedChange={() => setSelectedUser([])}
                            >
                                Semua Tim
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {users
                                .filter(u => selectedCabang.length === 0 || (u.cabangId && selectedCabang.includes(u.cabangId)))
                                .map(user => (
                                    <DropdownMenuCheckboxItem
                                        key={user.id}
                                        checked={selectedUser.includes(user.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedUser([...selectedUser, user.id]);
                                            } else {
                                                setSelectedUser(selectedUser.filter(id => id !== user.id));
                                            }
                                        }}
                                    >
                                        {user.nama}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}

            {isAdminOwner && (
                <Select value={mapMode} onValueChange={(v) => setMapMode(v as MapMode)}>
                    <SelectTrigger className="w-full md:w-[160px] h-9 text-xs bg-background">
                        <SelectValue placeholder="Pilih Mode Peta" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="team">
                            <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs">Lokasi Tim</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="pelanggan">
                            <div className="flex items-center justify-between gap-4 w-full">
                                <div className="flex items-center gap-2">
                                    <Crosshair className="w-3.5 h-3.5 text-green-500" />
                                    <span className="text-xs">Lokasi Pelanggan</span>
                                </div>
                                {duplicateGroupsCount > 0 && (
                                    <Badge variant="destructive" className="h-4 px-1 text-[8px] animate-pulse">
                                        {duplicateGroupsCount}!!
                                    </Badge>
                                )}
                            </div>
                        </SelectItem>
                        <SelectItem value="transaksi">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-xs">Lokasi Transaksi</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            )}

            {!isSales && (
                <Select value={colorIndicator} onValueChange={(v) => setColorIndicator(v as any)}>
                    <SelectTrigger className="w-full md:w-[180px] h-9 text-xs bg-background">
                        <SelectValue placeholder="Indikator Warna" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pengguna">
                            <span className="text-xs">Warna: Pengguna</span>
                        </SelectItem>
                        {isAdminOwner && (
                            <SelectItem value="cabang">
                                <span className="text-xs">Warna: Cabang</span>
                            </SelectItem>
                        )}
                        <SelectItem value="kategori">
                            <span className="text-xs">Warna: Kategori</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            )}

            <div className="flex-1 min-w-0">
                <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full [&>button]:h-9 [&>button]:text-xs [&>button]:bg-background"
                />
            </div>
        </div>
    );
}
