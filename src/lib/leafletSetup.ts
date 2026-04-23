import L from 'leaflet';

export function setupLeaflet() {
    if (typeof window !== 'undefined' && L && L.Map) {
        // @ts-expect-error - Accessing internal Leaflet property for patching
        const originalInit = L.Map.prototype._initContainer;
        // @ts-expect-error - Custom property for tracking patch status
        if (!L.Map.prototype._isPatched) {
            // @ts-expect-error - Overriding internal Leaflet method
            L.Map.prototype._initContainer = function (id: string | HTMLElement) {
                const container = typeof id === 'string' ? document.getElementById(id) : id;
                if (container && (container as any)._leaflet_id) {
                    (container as any)._leaflet_id = null;
                }
                originalInit.call(this, id);
            };
            // @ts-expect-error - Custom property for tracking patch status
            L.Map.prototype._isPatched = true;
        }
    }
}
