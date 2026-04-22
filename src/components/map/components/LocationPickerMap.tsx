import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { setupLeaflet } from '@/lib/leafletSetup';

setupLeaflet();

// Fix Leaflet's default icon issue
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  position: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

function LocationMarker({ position, onLocationSelect, readOnly }: { position: {lat: number, lng: number}, onLocationSelect: (lat: number, lng: number) => void, readOnly: boolean }) {
  const map = useMapEvents({
    click(e) {
      if (!readOnly) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    if (position.lat !== 0 && position.lng !== 0) {
      map.flyTo([position.lat, position.lng], 15);
    }
  }, [position, map]);

  return position.lat !== 0 && position.lng !== 0 ? (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={icon} 
      draggable={!readOnly}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const latlng = marker.getLatLng();
          onLocationSelect(latlng.lat, latlng.lng);
        }
      }}
    />
  ) : null;
}

export function LocationPicker({ position, onLocationSelect, readOnly = false }: LocationPickerProps) {
  const [searchInput, setSearchInput] = useState('');
  const center = position.lat !== 0 && position.lng !== 0
    ? { lat: position.lat, lng: position.lng }
    : { lat: -6.200000, lng: 106.816666 };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationSelect(lat, lng);
      }, () => {
        toast.error('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
      });
    }
  };

  const processCoordinates = (text: string, showToast = false) => {
    const match = text.match(/([-+]?\d{1,2}\.\d+),\s*([-+]?\d{1,3}\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        onLocationSelect(lat, lng);
        if (showToast) toast.success('Koordinat berhasil diterapkan!');
        return true;
      }
    }
    if (showToast) toast.error('Format koordinat tidak valid (contoh: -6.123, 106.456).');
    return false;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    processCoordinates(value, false);
  };

  const searchAddress = async () => {
    if (!searchInput) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&countrycodes=id`);
      const data = await res.json();
      if (data && data.length > 0) {
        onLocationSelect(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setSearchInput(data[0].display_name);
      } else {
        toast.error('Alamat tidak ditemukan');
      }
    } catch (err) {
      toast.error('Gagal mencari alamat');
    }
  };

  const handlePasteCoordinates = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const success = processCoordinates(text, true);
      if (success) {
        setSearchInput(text);
      }
    } catch (err) {
      toast.error('Gagal membaca clipboard. Pastikan izin diberikan.');
    }
  };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Cari alamat atau paste koordinat (contoh: -6.66, 106.90)..."
              value={searchInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && searchAddress()}
              className="pr-10"
            />
            <button onClick={searchAddress} className="absolute right-3 top-2.5" title="Cari Alamat" type="button">
                <Search className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={handlePasteCoordinates} title="Paste Koordinat dari Clipboard">
            <ClipboardPaste className="w-4 h-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={handleGetCurrentLocation} title="Gunakan Lokasi Saat Ini">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="h-[300px] w-full rounded-md overflow-hidden border relative z-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={position.lat !== 0 ? 15 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onLocationSelect={onLocationSelect} readOnly={readOnly} />
        </MapContainer>
      </div>

      {position.lat !== 0 && (
        <p className="text-xs text-muted-foreground italic">
          Koordinat: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

export const extractAddressFromCoordinates = async (lat: number, lng: number) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=id`);
    if (!response.ok) throw new Error("Nominatim error");
    const data = await response.json();
    return data.display_name || "";
  } catch (err) {
    console.error(err);
    return "";
  }
}
