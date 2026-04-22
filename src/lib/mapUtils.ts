const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Shared Utils for Google Maps Platform

const distinctColors = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
    '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080',
    '#ffffff', '#000000'
];

/**
 * Common color generator for markers based on strings (IDs)
 */
export const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % distinctColors.length;
    return distinctColors[index];
};

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};

// --- Free OSRM Platform API Utils ---

export const getOsrmRoute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, waypoints: { lat: number; lng: number }[] = []) => {
    try {
        // OSRM requires coordinates in lng,lat format and separated by semicolons
        const coords = [
            `${origin.lng},${origin.lat}`,
            ...waypoints.map(w => `${w.lng},${w.lat}`),
            `${destination.lng},${destination.lat}`
        ].join(';');

        // Using geometries=geojson to easily render on Leaflet Map
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code !== 'Ok') {
            console.error('OSRM API Error:', data.message || 'Routing failed');
            return null;
        }
        
        return data; // returns OSRM response where route geometry is in route.routes[0].geometry
    } catch (error) {
        console.error('Error fetching OSRM API:', error);
        return null;
    }
};

/**
 * Checks if a location is within a certain distance (geofence)
 * @param currentLocation User's current location
 * @param targetLocation Target customer location
 * @param radiusInMeters Fence radius (default 100m)
 */
export const isWithinGeofence = (
    currentLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
    radiusInMeters: number = 100
): boolean => {
    const distance = getDistance(
        currentLocation.lat,
        currentLocation.lng,
        targetLocation.lat,
        targetLocation.lng
    );
    return distance <= radiusInMeters;
};
