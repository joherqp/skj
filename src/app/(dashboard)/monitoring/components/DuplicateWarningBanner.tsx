'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DuplicateWarningBannerProps {
    duplicateGroupsCount: number;
    duplicateThreshold: number;
    onCheckNow: () => void;
}

export function DuplicateWarningBanner({
    duplicateGroupsCount,
    duplicateThreshold,
    onCheckNow
}: DuplicateWarningBannerProps) {
    if (duplicateGroupsCount === 0) return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-red-800">Perhatian: Potensi Double Toko Terdeteksi!</h4>
                    <p className="text-xs text-red-600">Ditemukan {duplicateGroupsCount} grup lokasi pelanggan yang saling berdekatan (di bawah {duplicateThreshold}m).</p>
                </div>
            </div>
            <Button 
                size="sm" 
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4"
                onClick={onCheckNow}
            >
                Periksa Sekarang
            </Button>
        </div>
    );
}
