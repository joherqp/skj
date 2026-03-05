import { Suspense } from 'react';
import UpdateStokView from '@/app/(dashboard)/barang/UpdateStok';

export default function UpdateStokPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdateStokView />
    </Suspense>
  );
}
