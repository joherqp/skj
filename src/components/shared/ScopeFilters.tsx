'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { useDatabase } from '@/contexts/DatabaseContext';
import { Building, Users, ChevronDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScopeFiltersProps {
    selectedCabangIds: string[];
    setSelectedCabangIds: (ids: string[]) => void;
    selectedUserIds: string[];
    setSelectedUserIds: (ids: string[]) => void;
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
    showUserFilter = true,
    availableCabangIds,
    availableUserIds,
    className = ""
}: ScopeFiltersProps) {
    const { user: currentUser } = useAuth();
    const { cabang: listCabang, users, viewMode } = useDatabase();
    const [cabangSearch, setCabangSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');

    const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
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

            const matchesSearch = u.nama.toLowerCase().includes(userSearch.toLowerCase());
            const isAvailable = !availableUserIds || availableUserIds.includes(u.id);
            
            return matchesSearch && isAvailable;
        })
        .sort((a, b) => a.nama.localeCompare(b.nama));

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Branch Filter (Admin/Owner only) */}
            {isAdminOrOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                            <div className="flex items-center gap-2 truncate">
                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                    <Building className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <span className="truncate">
                                    {selectedCabangIds.length === 0
                                        ? "Semua Cabang"
                                        : `${selectedCabangIds.length} Cabang`}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
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
                        <div className="flex-1 overflow-y-auto p-1">
                            <DropdownMenuCheckboxItem
                                checked={selectedCabangIds.length === 0}
                                onCheckedChange={() => setSelectedCabangIds([])}
                                className="text-xs"
                            >
                                Semua Cabang
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {branchOptions.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground text-[10px]">
                                    Tidak ada data
                                </div>
                            )}
                            {branchOptions.map(c => (
                            <DropdownMenuCheckboxItem
                                key={c.id}
                                checked={selectedCabangIds.includes(c.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedCabangIds([...selectedCabangIds, c.id]);
                                    } else {
                                        setSelectedCabangIds(selectedCabangIds.filter(id => id !== c.id));
                                    }
                                }}
                                className="text-xs"
                            >
                                {c.nama}
                            </DropdownMenuCheckboxItem>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {showUserFilter && (isAdminOrOwner || isLeader || isFinance) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm w-full sm:min-w-[140px] sm:w-auto">
                            <div className="flex items-center gap-2 truncate">
                                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600">
                                    <Users className="w-3.5 h-3.5 shrink-0" />
                                </div>
                                <span className="truncate">
                                    {selectedUserIds.length === 0
                                        ? "Semua Pengguna"
                                        : `${selectedUserIds.length} Pengguna`}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
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
                        <div className="flex-1 overflow-y-auto p-1">
                            <DropdownMenuCheckboxItem
                                checked={selectedUserIds.length === 0}
                                onCheckedChange={() => setSelectedUserIds([])}
                                className="text-xs"
                            >
                                Semua Pengguna
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuSeparator />
                            {userOptions.length === 0 && (
                                <div className="p-4 text-center text-muted-foreground text-[10px]">
                                    Tidak ada data
                                </div>
                            )}
                            {userOptions.map(u => (
                            <DropdownMenuCheckboxItem
                                key={u.id}
                                checked={selectedUserIds.includes(u.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedUserIds([...selectedUserIds, u.id]);
                                    } else {
                                        setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                                    }
                                }}
                                className="text-xs"
                            >
                                {u.nama.toUpperCase()}
                            </DropdownMenuCheckboxItem>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
