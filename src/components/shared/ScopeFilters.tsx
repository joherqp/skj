'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Building, Users, ChevronDown } from 'lucide-react';
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
    className?: string;
}

export function ScopeFilters({
    selectedCabangIds,
    setSelectedCabangIds,
    selectedUserIds,
    setSelectedUserIds,
    showUserFilter = true,
    className = ""
}: ScopeFiltersProps) {
    const { user: currentUser } = useAuth();
    const { cabang: listCabang, users, viewMode } = useDatabase();

    const isAdminOrOwner = currentUser?.roles.some(r => ['admin', 'owner'].includes(r));
    const isLeader = currentUser?.roles.includes('leader');
    const isFinance = currentUser?.roles.includes('finance');

    // Only show filters if viewMode is 'all' or user is privileged
    const canSeeFilters = viewMode === 'all' || isAdminOrOwner || isLeader || isFinance;
    if (!canSeeFilters) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Branch Filter (Admin/Owner only) */}
            {isAdminOrOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm min-w-[140px]">
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
                    <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto rounded-xl shadow-xl border-muted-foreground/10">
                        <DropdownMenuLabel className="text-xs">Daftar Cabang</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={selectedCabangIds.length === 0}
                            onCheckedChange={() => setSelectedCabangIds([])}
                            className="text-xs"
                        >
                            Semua Cabang
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {listCabang.map(c => (
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
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {showUserFilter && (isAdminOrOwner || isLeader || isFinance) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 text-xs justify-between bg-background font-medium px-3 border-muted-foreground/20 hover:border-primary/50 transition-all rounded-xl shadow-sm min-w-[140px]">
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
                    <DropdownMenuContent className="w-[240px] max-h-[300px] overflow-y-auto rounded-xl shadow-xl border-muted-foreground/10">
                        <DropdownMenuLabel className="text-xs">Daftar Pengguna</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={selectedUserIds.length === 0}
                            onCheckedChange={() => setSelectedUserIds([])}
                            className="text-xs"
                        >
                            Semua Pengguna
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {users.filter(u => {
                            const isActive = u.isActive !== false;
                            if (isAdminOrOwner) {
                                const isInSelectedCabang = selectedCabangIds.length === 0 || (u.cabangId && selectedCabangIds.includes(u.cabangId));
                                return isActive && isInSelectedCabang;
                            }
                            if (isLeader || isFinance) {
                                return isActive && u.cabangId === currentUser?.cabangId;
                            }
                            return u.id === currentUser?.id;
                        }).map(u => (
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
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
