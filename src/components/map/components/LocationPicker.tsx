import { useEffect, useState, useRef } from 'react';
import {
  AdvancedMarker,
  Map,
  useApiIsLoaded,
  useMapsLibrary,
  useMap
} from '@vis.gl/react-google-maps';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPickerProps {
  position: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

export function LocationPicker({ position, onLocationSelect, readOnly = false }: LocationPickerProps) {
  const apiIsLoaded = useApiIsLoaded();
  const placesLibrary = useMapsLibrary('places');
  const [searchInput, setSearchInput] = useState('');
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const map = useMap();

  const center = position.lat !== 0 && position.lng !== 0
    ? { lat: position.lat, lng: position.lng }
    : { lat: -6.200000, lng: 106.816666 }; // Default to Jakarta

  // Initialize Autocomplete
  useEffect(() => {
    if (!placesLibrary || !inputRef.current || readOnly) return;

    try {
      const options = {
        fields: ['geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'id' }
      };

      const ac = new placesLibrary.Autocomplete(inputRef.current, options);
      setAutocomplete(ac);

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onLocationSelect(lat, lng);
          setSearchInput(place.formatted_address || place.name || '');
          if (map) {
            map.setCenter({ lat, lng });
            map.setZoom(18);
          }
        }
      });

      return () => {
        if (window.google?.maps?.event) {
          google.maps.event.clearInstanceListeners(ac);
        }
      };
    } catch (err) {
      console.error('Error initializing Autocomplete:', err);
    }
  }, [placesLibrary, readOnly, onLocationSelect, map]);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onLocationSelect(lat, lng);
        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(18);
        }
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
        if (map) {
          map.setCenter({ lat, lng });
          map.setZoom(18);
        }
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

  const handlePasteCoordinates = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const success = processCoordinates(text, true);
      if (success) {
        setSearchInput(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      toast.error('Gagal membaca clipboard. Pastikan izin diberikan atau paste manual di kolom pencarian.');
    }
  };

  if (!apiIsLoaded) {
    return <div className="h-[300px] w-full rounded-md bg-muted animate-pulse flex items-center justify-center">Loading Maps...</div>;
  }

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Cari alamat atau paste koordinat (contoh: -6.66, 106.90)..."
              value={searchInput}
              onChange={handleInputChange}
              className="pr-10"
            />
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
          <Button type="button" variant="secondary" onClick={handlePasteCoordinates} title="Paste Koordinat dari Clipboard">
            <ClipboardPaste className="w-4 h-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={handleGetCurrentLocation} title="Gunakan Lokasi Saat Ini">
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="h-[300px] w-full rounded-md overflow-hidden border">
        <Map
          mapId="bf51a910020faedc"
          defaultCenter={center}
          defaultZoom={position.lat !== 0 ? 15 : 5}
          center={center}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        >
          {position.lat !== 0 && position.lng !== 0 && (
            <AdvancedMarker
              position={{ lat: position.lat, lng: position.lng }}
              draggable={!readOnly}
              title="Lokasi Sales"
              onDragEnd={(e) => {
                if (e.latLng) {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  onLocationSelect(lat, lng);
                  setSearchInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                }
              }}
            />
          )}
        </Map>
      </div>

      {position.lat !== 0 && (
        <p className="text-xs text-muted-foreground italic">
          Koordinat: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

// Keeping the interface for address extraction if needed by other components, but marking as deprecated
/** @deprecated Use Google Geocoding API instead for better results */
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
