import { Suspense } from 'react';
import TambahPettyCashView from '@/app/(dashboard)/petty-cash/TambahPettyCash';

export default function TambahPettyCashPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TambahPettyCashView />
    </Suspense>
  );
}
