'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, X, Maximize, Minimize, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MapPin, Navigation, Store, AlertTriangle, AlertCircle } from 'lucide-react';
import { setupLeaflet } from '@/lib/leafletSetup';
import { getDistance } from '@/lib/mapUtils';

setupLeaflet();

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const formatShorthand = (num: number) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace('.0', '') + 'M';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'Jt';
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'Rb';
  return num.toString();
};

function MapController({
  center,
  flyTrigger,
}: {
  center: { lat: number; lng: number };
  flyTrigger: number;
}) {
  const map = useMap();
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return; 
    }
    if (flyTrigger > 0) {
      map.flyTo([center.lat, center.lng], map.getZoom(), { animate: true, duration: 0.8 });
    }
  }, [flyTrigger, center, map]);

  return null;
}

function MapInstanceCapture({ setMap }: { setMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setMap(map);
      // Force enable interactions just in case
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      if ((map as any).tap) (map as any).tap.enable();
    }
  }, [map, setMap]);
  return null;
}

export function MonitoringMapWrapper({
  markers,
  mapCenter,
  setMapCenter,
  selectedMarker,
  setSelectedMarker,
  customerMarkers = [],
  radiusKunjungan = 100,
  duplicateThreshold = 15,
  duplicateGroups = [],
  showNames = false,
  children,
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const prevCenterRef = useRef(mapCenter);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  useEffect(() => {
    const prev = prevCenterRef.current;
    if (prev.lat !== mapCenter.lat || prev.lng !== mapCenter.lng) {
      prevCenterRef.current = mapCenter;
      setFlyTrigger(t => t + 1);
    }
  }, [mapCenter]);

  // Fix map cut off on fullscreen
  useEffect(() => {
    const handleFSChange = () => {
      const isNowFS = !!document.fullscreenElement;
      setIsFullscreen(isNowFS);
      
      if (mapInstance) {
        // Multiple triggers to ensure layout is finished
        mapInstance.invalidateSize();
        const timers = [100, 300, 500, 800].map(ms => 
          setTimeout(() => mapInstance.invalidateSize(), ms)
        );
        return () => timers.forEach(clearTimeout);
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, [mapInstance]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const panMap = (dx: number, dy: number) => {
    if (mapInstance) {
      mapInstance.panBy([dx, dy], { animate: true, duration: 0.25 });
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ 
        position: isFullscreen ? 'fixed' : 'absolute', 
        inset: 0, 
        zIndex: isFullscreen ? 9999 : 10, 
        width: '100%', 
        height: '100%',
        backgroundColor: 'white'
      }}
      className="map-wrapper-container"
    >
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%', zIndex: 1, cursor: 'grab' }}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        zoomControl={true}
        attributionControl={true}
        // @ts-expect-error - tap property is required for mobile touch support in some Leaflet versions
        tap={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapInstanceCapture setMap={setMapInstance} />
        <MapController center={mapCenter} flyTrigger={flyTrigger} />

        {/* Duplicate Group Indicators */}
        {duplicateGroups.map((group: any[], idx: number) => {
          // Use the center of the group for the circle
          const centerLat = group.reduce((acc, curr) => acc + curr.position.lat, 0) / group.length;
          const centerLng = group.reduce((acc, curr) => acc + curr.position.lng, 0) / group.length;
          
          return (
            <Circle
              key={`group-${idx}`}
              center={[centerLat, centerLng]}
              radius={duplicateThreshold}
              pathOptions={{ 
                color: '#ef4444', 
                fillColor: '#ef4444', 
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5, 5'
              }}
            />
          );
        })}

        {markers.map((marker: any) => {
          const markerIcon = marker.isDuplicate
            ? L.divIcon({
                html: `<div class="marker-duplicate-wrapper">
                         <div class="marker-pulse"></div>
                         <div style="background-color:#ef4444;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px rgba(239,68,68,0.5);position:relative;z-index:2;"></div>
                       </div>`,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              })
            : marker.color
            ? L.divIcon({
                html: `<div style="background-color:${marker.color};width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              })
            : defaultIcon;

          return (
            <Marker
              key={marker.id}
              position={[marker.position.lat, marker.position.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  setMapCenter(marker.position);
                  setSelectedMarker(marker);
                },
              }}
            >
              {showNames && (
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -10]}
                  opacity={0.95}
                  interactive={false}
                  className="leaflet-name-label"
                >
                  {marker.title}
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Expandable Map Utilities Container */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col items-start gap-2">
        {isControlsExpanded && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border hover:bg-gray-50 transition-all text-slate-600 active:scale-95"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* Manual Pan Controls (D-Pad) */}
            <div className="flex flex-col items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border p-2 gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); panMap(0, -200); }} 
                className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-all active:scale-95" 
                title="Geser Atas"
              >
                <ChevronUp size={22} />
              </button>
              <div className="flex gap-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); panMap(-200, 0); }} 
                  className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-all active:scale-95" 
                  title="Geser Kiri"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="w-8 h-8 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); panMap(200, 0); }} 
                  className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-all active:scale-95" 
                  title="Geser Kanan"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); panMap(0, 200); }} 
                className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-600 transition-all active:scale-95" 
                title="Geser Bawah"
              >
                <ChevronDown size={22} />
              </button>
            </div>
          </div>
        )}

        {/* Trigger Button */}
        <button
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          className={`p-3 rounded-2xl shadow-xl border backdrop-blur-sm transition-all active:scale-90 ${
            isControlsExpanded 
              ? 'bg-primary text-white border-primary shadow-primary/20' 
              : 'bg-white/95 text-primary border-slate-200'
          }`}
          title="Kontrol Navigasi"
        >
          {isControlsExpanded ? <X className="w-6 h-6" /> : <Navigation className="w-6 h-6" />}
        </button>
      </div>

      {/* Floating Detail Card */}
      {selectedMarker && (
        <div
          style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: 360 }}
          className="bg-white rounded-xl shadow-xl border p-4 animate-in slide-in-from-bottom-4"
        >
          <button
            onClick={() => setSelectedMarker(null)}
            className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow"
              style={{ backgroundColor: selectedMarker.color || '#3b82f6' }}
            >
              {selectedMarker.userName
                ? selectedMarker.userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : selectedMarker.type === 'customer' ? 'C' : 'S'}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <p className="font-bold text-sm capitalize truncate">{selectedMarker.title}</p>
              <p className="text-xs text-gray-500 truncate">{selectedMarker.subtitle}</p>
            </div>
          </div>

          {/* Potential Duplicate Warning */}
          {selectedMarker.type === 'customer' && (
            (() => {
              const duplicates = customerMarkers
                .filter((m: any) => m.id !== selectedMarker.id)
                .map((m: any) => ({
                  ...m,
                  distance: getDistance(
                    selectedMarker.position.lat,
                    selectedMarker.position.lng,
                    m.position.lat,
                    m.position.lng
                  )
                }))
                .filter((m: any) => m.distance <= duplicateThreshold);

              if (duplicates.length > 0) {
                return (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-red-700">Potensi Double Toko!</p>
                      <p className="text-[10px] text-red-600">Terdeteksi {duplicates.length} pelanggan lain sangat berdekatan (&lt;{duplicateThreshold}m).</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          <div className="space-y-1 mb-3 bg-gray-50 p-2 rounded-lg">
            <p className="text-xs text-gray-500 line-clamp-2">{selectedMarker.detail}</p>
            {(selectedMarker.type === 'customer' || selectedMarker.type === 'transaction') && selectedMarker.userName && (
              <p className="text-xs font-semibold text-blue-600">Sales: {selectedMarker.userName}</p>
            )}
            {selectedMarker.type === 'transaction' && selectedMarker.data && (
              <div className="flex gap-6 pt-2 border-t mt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Qty</span>
                  <span className="text-sm font-bold text-slate-800">
                    {selectedMarker.data.items?.reduce((acc: number, item: any) => acc + (item.totalQty || item.jumlah || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Nominal</span>
                  <span className="text-sm font-bold text-green-600">Rp {formatShorthand(selectedMarker.data.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Nearby Customers Section */}
          {selectedMarker.type === 'customer' && customerMarkers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Pelanggan Terdekat ({radiusKunjungan}m)</p>
                <span className="text-[9px] font-bold px-1.5 h-4 flex items-center bg-blue-50 text-blue-600 border border-blue-100 rounded-full">Radius Aktif</span>
              </div>
              <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 scrollbar-hide">
                {(() => {
                  const nearby = customerMarkers
                    .filter((m: any) => m.id !== selectedMarker.id)
                    .map((m: any) => ({
                      ...m,
                      distance: getDistance(
                        selectedMarker.position.lat,
                        selectedMarker.position.lng,
                        m.position.lat,
                        m.position.lng
                      )
                    }))
                    .filter((m: any) => m.distance <= radiusKunjungan)
                    .sort((a: any, b: any) => a.distance - b.distance);

                  if (nearby.length === 0) {
                    return <p className="text-[10px] text-gray-400 italic py-1">Tidak ada pelanggan lain dalam radius ini</p>;
                  }

                  return nearby.map((m: any) => {
                    const isPotentialDuplicate = m.distance <= duplicateThreshold;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMapCenter(m.position);
                          setSelectedMarker(m);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
                          m.distance <= duplicateThreshold 
                            ? 'bg-red-50 border-red-100 hover:bg-red-100' 
                            : 'bg-gray-50 border-transparent hover:bg-blue-50 hover:border-blue-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.distance <= duplicateThreshold ? (
                            <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                          ) : (
                            <Store className="w-3 h-3 text-blue-500 shrink-0" />
                          )}
                          <span className={`text-[11px] font-medium truncate ${m.distance <= duplicateThreshold ? 'text-red-700' : ''}`}>
                            {m.title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold shrink-0 ml-2 ${m.distance <= duplicateThreshold ? 'text-red-600' : 'text-blue-600'}`}>
                          {Math.round(m.distance)}m
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.position.lat},${selectedMarker.position.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded-lg text-center transition-colors no-underline font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
            Buka di Maps
          </a>
        </div>
      )}

      {/* Slot for overlay children (search bar, legend, etc.) */}
      {children}

      {/* Label style (tooltip arrow hide) */}
      <style>{`
        .marker-duplicate-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        .marker-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          animation: pulse-red 2s infinite;
          z-index: 1;
        }
        @keyframes pulse-red {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-name-label::before { display: none !important; }
        .leaflet-name-label {
          background: rgba(255,255,255,0.95) !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          white-space: nowrap !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15) !important;
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
}
