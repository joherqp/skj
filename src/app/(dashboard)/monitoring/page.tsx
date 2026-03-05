import { Suspense } from 'react';
import MonitoringPageView from '@/app/(dashboard)/monitoring/MonitoringPage';

export default function MonitoringPagePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MonitoringPageView />
    </Suspense>
  );
}
