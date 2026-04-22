import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap').then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full rounded-md bg-muted animate-pulse flex items-center justify-center">Loading Maps...</div>,
  }
);

interface LocationPickerProps {
  position: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerMap {...props} />;
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
