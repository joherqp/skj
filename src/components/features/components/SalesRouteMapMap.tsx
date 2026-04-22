import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pelanggan } from '@/types';
import { MapPin, Navigation, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { getOsrmRoute } from '@/lib/mapUtils';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { setupLeaflet } from '@/lib/leafletSetup';

setupLeaflet();

// Fix Leaflet's default icon issue
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface SalesRouteMapProps {
    customers: Pelanggan[];
    onRouteCalculated?: (duration: string, distance: string) => void;
}

export function SalesRouteMap({ customers, onRouteCalculated }: SalesRouteMapProps) {
    const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

    const optimizeRoute = async () => {
        if (!customers || customers.length < 2) {
            toast.error('Pilih minimal 2 pelanggan untuk mengoptimalkan rute.');
            return;
        }

        setIsOptimizing(true);

        // Take first customer as start, last as end, others as waypoints
        const origin = { lat: customers[0].lokasi!.latitude, lng: customers[0].lokasi!.longitude };
        const destination = { lat: customers[customers.length - 1].lokasi!.latitude, lng: customers[customers.length - 1].lokasi!.longitude };
        const waypoints = customers.slice(1, -1).map(c => ({
            lat: c.lokasi!.latitude,
            lng: c.lokasi!.longitude
        }));

        try {
            const result = await getOsrmRoute(origin, destination, waypoints);

            if (!result || !result.routes || result.routes.length === 0) {
                throw new Error('Rute API gratis tidak dapat diakses atau gagal.');
            }

            const route = result.routes[0];
            
            const totalDistance = route.distance || 0; // OSRM distance is in meters
            const durationSeconds = route.duration || 0; // OSRM duration is in seconds

            const info = {
                distance: (totalDistance / 1000).toFixed(1) + ' km',
                duration: Math.round(durationSeconds / 60) + ' mnt'
            };

            setRouteInfo(info);
            onRouteCalculated?.(info.duration, info.distance);
            toast.success('Rute berhasil dioptimalkan!');

            // Convert GeoJSON LineString coordinates (lng, lat) to Leaflet [lat, lng]
            if (route.geometry && route.geometry.coordinates) {
                const latLngs = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
                setRouteCoordinates(latLngs);
            }

        } catch (error) {
            console.error('Routes request failed', error);
            const message = error instanceof Error ? error.message : 'Gagal menghitung rute.';
            toast.error(message);
        } finally {
            setIsOptimizing(false);
        }
    };

    const center = useMemo(() => {
        if (customers.length > 0 && customers[0].lokasi) {
            return { lat: customers[0].lokasi.latitude, lng: customers[0].lokasi.longitude };
        }
        return { lat: -6.2, lng: 106.81 }; // Jakarta
    }, [customers]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-primary" />
                        Optimasi Rute Kunjungan
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {customers.length} Pelanggan dipilih
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={optimizeRoute}
                    disabled={isOptimizing || customers.length < 2}
                    className="gap-2"
                >
                    {isOptimizing ? 'Menghitung...' : 'Optimalkan Rute'}
                </Button>
            </div>

            {routeInfo && (
                <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3 flex items-center gap-3">
                            <Clock className="w-4 h-4 text-primary" />
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold">Estimasi Waktu</p>
                                <p className="text-sm font-bold">{routeInfo.duration}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-3 flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-primary" />
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Jarak</p>
                                <p className="text-sm font-bold">{routeInfo.distance}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="h-[400px] w-full rounded-xl overflow-hidden border relative shadow-inner z-0">
                 <MapContainer
                    center={[center.lat, center.lng]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {customers.map((c, i) => (
                        c.lokasi && (
                            <Marker
                                key={c.id}
                                position={[c.lokasi.latitude, c.lokasi.longitude]}
                                icon={defaultIcon}
                            >
                                <Tooltip permanent direction="top" opacity={1}>
                                    {(i + 1).toString()}
                                </Tooltip>
                            </Marker>
                        )
                    ))}
                    
                    {routeCoordinates.length > 0 && (
                        <Polyline positions={routeCoordinates} color="#3b82f6" weight={5} opacity={0.8} />
                    )}
                </MapContainer>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-2 border">
                <p className="text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    Urutan Kunjungan Optimal:
                </p>
                <div className="flex flex-wrap gap-2">
                    {customers.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-1 bg-background border px-2 py-1 rounded text-[10px] font-medium shadow-sm">
                            <span className="bg-primary text-primary-foreground w-4 h-4 flex items-center justify-center rounded-full text-[8px]">{i + 1}</span>
                            {c.nama}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
