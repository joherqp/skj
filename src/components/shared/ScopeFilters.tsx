'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { useDatabase } from '@/contexts/DatabaseContext';
import { Building, Users, ChevronDown, Search } from 'lucide-react';
import { getUserDisplayName } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HydrationBoundary } from './HydrationBoundary';

interface ScopeFiltersProps {
    selectedCabangIds: string[];
    setSelectedCabangIds: (ids: string[]) => void;
    selectedUserIds: string[];
    setSelectedUserIds: (ids: string[]) => void;
    showBranchFilter?: boolean;
    showUserFilter?: boolean;
    availableCabangIds?: string[];
    availableUserIds?: string[];
    className?: string;
}

export function ScopeFilters({
    selectedCabangIds,
    setSelectedCabangIds,
    selectedUserIds,
    setSelectedUserIds,
    showBranchFilter = true,
    showUserFilter = true,
    availableCabangIds,
    availableUserIds,
    className = ""
}: ScopeFiltersProps) {
    const { user: currentUser } = useAuth();
    const { cabang: listCabang, users, viewMode, profilPerusahaan } = useDatabase();
    const tampilNama = profilPerusahaan?.config?.tampilNama || 'nama';
    const [cabangSearch, setCabangSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner', 'manager', 'finance'].includes(r));
    const isLeader = currentUser?.roles.includes('leader');
    const isFinance = currentUser?.roles.includes('finance');

    // Only show filters if viewMode is 'all' or user is privileged
    const canSeeFilters = viewMode === 'all' || isAdminOrOwner || isLeader || isFinance;
    if (!canSeeFilters) return null;

    // Filtered Branch Options
    const branchOptions = [...listCabang]
        .filter(c => {
            const matchesSearch = c.nama.toLowerCase().includes(cabangSearch.toLowerCase());
            const isAvailable = !availableCabangIds || availableCabangIds.includes(c.id);
            return matchesSearch && isAvailable;
        })
        .sort((a, b) => a.nama.localeCompare(b.nama));

    // Filtered User Options
    const userOptions = users
        .filter(u => {
            const isActive = u.isActive !== false;
            let rolePass = false;
            if (isAdminOrOwner) {
                const isInSelectedCabang = selectedCabangIds.length === 0 || (u.cabangId && selectedCabangIds.includes(u.cabangId));
                rolePass = isActive && isInSelectedCabang;
            } else if (isLeader || isFinance) {
                rolePass = isActive && u.cabangId === currentUser?.cabangId;
            } else {
                rolePass = u.id === currentUser?.id;
            }

            if (!rolePass) return false;

            const displayName = getUserDisplayName(u, tampilNama);
            const matchesSearch = displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.nama.toLowerCase().includes(userSearch.toLowerCase());
            const isAvailable = !availableUserIds || availableUserIds.includes(u.id);

            return matchesSearch && isAvailable;
        })
        .sort((a, b) => getUserDisplayName(a, tampilNama).localeCompare(getUserDisplayName(b, tampilNama)));

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Branch Filter (Admin/Owner only) */}
            {isAdminOrOwner && showBranchFilter && (
                <HydrationBoundary>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs justify-between bg-white/50 backdrop-blur-sm font-bold px-3 border-slate-200 hover:border-indigo-400 hover:ring-2 hover:ring-indigo-50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                                <div className="flex items-center gap-2 sm:gap-3 truncate">
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                                        <Building className="w-4 h-4 shrink-0" />
                                    </div>
                                    <span className="truncate hidden sm:inline">
                                        {selectedCabangIds.length === 0
                                            ? "Semua Cabang"
                                            : `${selectedCabangIds.length} Cabang`}
                                    </span>
                                    <span className="truncate sm:hidden text-indigo-600 font-black">
                                        {selectedCabangIds.length === 0 ? "ALL" : selectedCabangIds.length}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 ml-2 hidden sm:block" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[240px] max-h-[350px] flex flex-col p-0 rounded-xl shadow-xl border-muted-foreground/10">
                            <div className="p-2 border-b bg-muted/30">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground p-1">Pencarian Cabang</DropdownMenuLabel>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                                    <input
                                        className="w-full bg-background border rounded-md px-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Cari..."
                                        value={cabangSearch}
                                        onChange={(e) => setCabangSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-center px-3 py-2 border-b bg-muted/20">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-full text-[10px] font-bold transition-all ${selectedCabangIds.length === 0
                                        ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        : "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                        }`}
                                    onClick={() => setSelectedCabangIds([])}
                                >
                                    {selectedCabangIds.length === 0 ? "✓ SEMUA DIPILIH" : "PILIH SEMUA"}
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1 space-y-0.25">
                                {branchOptions.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground text-[10px]">
                                        Tidak ada data
                                    </div>
                                )}
                                {branchOptions.map(c => {
                                    const isAllSelected = selectedCabangIds.length === 0;
                                    const isChecked = isAllSelected || selectedCabangIds.includes(c.id);

                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={c.id}
                                            checked={isChecked}
                                            onCheckedChange={() => {
                                                if (isAllSelected) {
                                                    // From "all" state → select only this item
                                                    setSelectedCabangIds([c.id]);
                                                } else if (selectedCabangIds.includes(c.id)) {
                                                    // Uncheck this item
                                                    const newList = selectedCabangIds.filter(id => id !== c.id);
                                                    // If none left, go back to "all"
                                                    setSelectedCabangIds(newList.length === 0 ? [] : newList);
                                                } else {
                                                    // Check this item
                                                    const newList = [...selectedCabangIds, c.id];
                                                    // If all items are now selected, reset to [] ("all")
                                                    const allAvailable = availableCabangIds || listCabang.map(x => x.id);
                                                    setSelectedCabangIds(newList.length >= allAvailable.length ? [] : newList);
                                                }
                                            }}
                                            onSelect={(e) => e.preventDefault()}
                                            className="rounded-lg text-xs py-2 pl-8 pr-5 font-medium"
                                        >
                                            {c.nama}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </HydrationBoundary>
            )}

            {showUserFilter && (isAdminOrOwner || isLeader || isFinance) && (
                <HydrationBoundary>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs justify-between bg-white/50 backdrop-blur-sm font-bold px-3 border-slate-200 hover:border-orange-400 hover:ring-2 hover:ring-orange-50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                                <div className="flex items-center gap-2 sm:gap-3 truncate">
                                    <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                                        <Users className="w-4 h-4 shrink-0" />
                                    </div>
                                    <span className="truncate hidden sm:inline">
                                        {selectedUserIds.length === 0
                                            ? "Semua Pengguna"
                                            : `${selectedUserIds.length} Pengguna`}
                                    </span>
                                    <span className="truncate sm:hidden text-orange-600 font-black">
                                        {selectedUserIds.length === 0 ? "ALL" : selectedUserIds.length}
                                    </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400 ml-2 hidden sm:block" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[240px] max-h-[350px] flex flex-col p-0 rounded-xl shadow-xl border-muted-foreground/10">
                            <div className="p-2 border-b bg-muted/30">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground p-1">Pencarian Pengguna</DropdownMenuLabel>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                                    <input
                                        className="w-full bg-background border rounded-md px-7 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Cari..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-center px-3 py-2 border-b bg-muted/20">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 w-full text-[10px] font-bold transition-all ${selectedUserIds.length === 0
                                        ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        : "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                        }`}
                                    onClick={() => setSelectedUserIds([])}
                                >
                                    {selectedUserIds.length === 0 ? "✓ SEMUA DIPILIH" : "PILIH SEMUA"}
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                                {userOptions.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground text-[10px]">
                                        Tidak ada data
                                    </div>
                                )}
                                {userOptions.map(u => {
                                    const isAllSelected = selectedUserIds.length === 0;
                                    const isChecked = isAllSelected || selectedUserIds.includes(u.id);

                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={u.id}
                                            checked={isChecked}
                                            onCheckedChange={() => {
                                                if (isAllSelected) {
                                                    // From "all" state → select only this user
                                                    setSelectedUserIds([u.id]);
                                                } else if (selectedUserIds.includes(u.id)) {
                                                    // Uncheck this user
                                                    const newList = selectedUserIds.filter(id => id !== u.id);
                                                    // If none left, go back to "all"
                                                    setSelectedUserIds(newList.length === 0 ? [] : newList);
                                                } else {
                                                    // Check this user
                                                    const newList = [...selectedUserIds, u.id];
                                                    // If all users are now selected, reset to [] ("all")
                                                    const allAvailable = availableUserIds || userOptions.map(x => x.id);
                                                    setSelectedUserIds(newList.length >= allAvailable.length ? [] : newList);
                                                }
                                            }}
                                            onSelect={(e) => e.preventDefault()}
                                            className="rounded-lg text-xs py-2 pl-8 pr-5 font-medium"
                                        >
                                            {getUserDisplayName(u, tampilNama)}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </HydrationBoundary>
            )}
        </div>
    );
}
