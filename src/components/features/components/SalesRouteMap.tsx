import dynamic from 'next/dynamic';
import { Pelanggan } from '@/types';

const SalesRouteMapMap = dynamic(
  () => import('./SalesRouteMapMap').then((mod) => mod.SalesRouteMap),
  {
    ssr: false,
    loading: () => <div className="h-[400px] w-full rounded-md bg-muted animate-pulse flex items-center justify-center">Loading Route Map...</div>,
  }
);

interface SalesRouteMapProps {
    customers: Pelanggan[];
    onRouteCalculated?: (duration: string, distance: string) => void;
}

export function SalesRouteMap(props: SalesRouteMapProps) {
  return <SalesRouteMapMap {...props} />;
}
