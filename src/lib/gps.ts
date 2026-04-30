export interface Location {
  latitude: number;
  longitude: number;
  alamat?: string;
}

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

export const getCurrentLocation = async (): Promise<Location> => {
  // Security check for mobile browsers
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    throw new Error('GPS memerlukan koneksi HTTPS. Browser memblokir akses lokasi via HTTP (kecuali localhost). Gunakan tunneling atau HTTPS.');
  }

  if (!navigator.geolocation) {
    throw new Error('GPS tidak didukung oleh browser ini');
  }

  const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      // Menggunakan watchPosition sebagai workaround untuk error kCLErrorLocationUnknown di iOS
      let watchId: number;
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      };

      // Set timeout manual untuk memastikan watchPosition berhenti jika terlalu lama
      const timeoutTime = options.timeout || 15000;
      timeoutId = setTimeout(() => {
        cleanup();
        reject({ code: 3, message: 'Timeout expired' }); // 3 = TIMEOUT
      }, timeoutTime);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          cleanup();
          resolve(pos);
        },
        (error) => {
          if (error.code === 2) { // 2 = POSITION_UNAVAILABLE (termasuk kCLErrorLocationUnknown)
            // Di iOS Safari, error ini sering muncul langsung padahal GPS sedang mencari sinyal.
            // Kita biarkan watchPosition berlanjut sampai timeout atau dapat lokasi.
            console.warn('GPS sementara tidak tersedia (mencari sinyal)...', error.message);
            return;
          }
          cleanup();
          reject(error);
        },
        options
      );
    });
  };

  let position: GeolocationPosition;

  try {
    // Attempt 1: High Accuracy (15s timeout)
    position = await getPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    });
  } catch (error) {
    console.warn('High accuracy GPS failed, trying fallback...', error);
    try {
      // Attempt 2: Low Accuracy (30s timeout) - fallback untuk area indoor atau sinyal lemah
      position = await getPosition({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 0
      });
    } catch (finalError: unknown) {
      let msg = 'Gagal mendapatkan lokasi.';
      
      if (finalError && typeof finalError === 'object' && 'code' in finalError) {
        const err = finalError as { code: number };
        if (err.code === 1) {
          msg = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi di browser.';
        } else if (err.code === 2) {
          msg = 'Informasi lokasi tidak tersedia. Pastikan GPS perangkat Anda aktif.';
        } else if (err.code === 3) {
          msg = 'Waktu permintaan lokasi habis. Coba lagi di area terbuka.';
        }
      }
      
      throw new Error(msg);
    }
  }

  const { latitude, longitude } = position.coords;

  try {
    // Attempt 1: Nominatim (Primary - Gives detailed address for correct format)
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`);
    if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
    const data = await response.json();

    if (!data.address) throw new Error('Nominatim returned no address');

    // Use the full display name, but remove Country and Postal Code
    const rawAddress = data.display_name || '';
    const addressItems = rawAddress.split(',').map((s: string) => s.trim());

    // Filter out "Indonesia", "Jawa" region, and postcodes (usually 5 digits)
    const filteredItems = addressItems.filter((item: string) => {
      const lower = item.toLowerCase();
      if (lower === 'indonesia' || lower === 'id') return false;
      if (/^\d{5}$/.test(item)) return false; // Remove 5-digit postcode
      if (lower === 'jawa') return false;
      return true;
    });

    const address = filteredItems.length > 0 ? filteredItems.join(', ') : undefined;

    if (!address) throw new Error('Nominatim components empty');

    return {
      latitude,
      longitude,
      alamat: address
    };
  } catch (error) {
    console.warn('Nominatim failed, trying fallback (BigDataCloud)...', error);

    try {
      // Attempt 2: BigDataCloud (Fallback - Client-side friendly but less detailed)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=id`
      );
      if (!response.ok) throw new Error(`BigDataCloud error: ${response.status}`);

      const data = await response.json();
      const components = [
        data.locality,
        data.city,
        data.principalSubdivision,
        data.countryName
      ].filter(Boolean);

      const address = components.length > 0 ? components.join(', ') : undefined;

      if (!address) throw new Error('BigDataCloud returned no address');

      return {
        latitude,
        longitude,
        alamat: address
      };
    } catch (fallbackError) {
      console.error('All geocoding services failed:', fallbackError);
      return {
        latitude,
        longitude,
        alamat: undefined // Explicitly return undefined if all services fail
      };
    }
  }
};
