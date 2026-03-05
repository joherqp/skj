const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Shared Utils for Google Maps Platform

/**
 * Common color generator for markers based on strings (IDs)
 */
export const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
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

// --- Google Maps Platform API Utils ---

export const getGoogleDistanceMatrix = async (origin: { lat: number; lng: number }, destinations: { lat: number; lng: number }[]) => {
    if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API Key not found');
        return null;
    }

    try {
        // Using Routes API (v2) for distance matrix-like functionality
        // Note: For a true distance matrix, we'd use computeRouteMatrix, 
        // but for simple distance/duration, computeRoutes is often sufficient or preferred for modern apps.
        // However, the error specifically asks for Routes API.

        const response = await fetch(
            `https://routes.googleapis.com/directions/v2:computeRoutes`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
                },
                body: JSON.stringify({
                    origin: {
                        location: {
                            latLng: {
                                latitude: origin.lat,
                                longitude: origin.lng
                            }
                        }
                    },
                    destination: {
                        location: {
                            latLng: {
                                latitude: destinations[0].lat,
                                longitude: destinations[0].lng
                            }
                        }
                    },
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE'
                })
            }
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Routes API:', error);
        return null;
    }
};

export const getGoogleRoute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, waypoints: { lat: number; lng: number }[] = []) => {
    if (!GOOGLE_MAPS_API_KEY) return null;

    try {
        const response = await fetch(
            `https://routes.googleapis.com/directions/v2:computeRoutes`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
                },
                body: JSON.stringify({
                    origin: {
                        location: {
                            latLng: {
                                latitude: origin.lat,
                                longitude: origin.lng
                            }
                        }
                    },
                    destination: {
                        location: {
                            latLng: {
                                latitude: destination.lat,
                                longitude: destination.lng
                            }
                        }
                    },
                    intermediates: waypoints.map(w => ({
                        location: {
                            latLng: {
                                latitude: w.lat,
                                longitude: w.lng
                            }
                        }
                    })),
                    travelMode: 'DRIVE',
                    routingPreference: 'TRAFFIC_AWARE',
                    optimizeWaypointOrder: waypoints.length > 0
                })
            }
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Routes API:', error);
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
