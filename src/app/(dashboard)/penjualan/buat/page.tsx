import { Suspense } from 'react';
import TambahPenjualanView from '@/app/(dashboard)/penjualan/TambahPenjualan';

export default function TambahPenjualanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TambahPenjualanView />
    </Suspense>
  );
}
