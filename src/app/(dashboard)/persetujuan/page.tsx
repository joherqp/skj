import { Suspense } from 'react';
import PersetujuanView from '@/components/lainnya/Persetujuan';

export default function PersetujuanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PersetujuanView />
        </Suspense>
    );
}
