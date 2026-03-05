import { Suspense } from 'react';
import RestockView from '@/app/(dashboard)/barang/Restock';

export default function RestockPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RestockView />
    </Suspense>
  );
}
