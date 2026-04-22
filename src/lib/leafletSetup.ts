import L from 'leaflet';

export function setupLeaflet() {
    if (typeof window !== 'undefined' && L && L.Map) {
        // @ts-ignore
        const originalInit = L.Map.prototype._initContainer;
        // @ts-ignore
        if (!L.Map.prototype._isPatched) {
            // @ts-ignore
            L.Map.prototype._initContainer = function (id: string | HTMLElement) {
                const container = typeof id === 'string' ? document.getElementById(id) : id;
                if (container && (container as any)._leaflet_id) {
                    (container as any)._leaflet_id = null;
                }
                originalInit.call(this, id);
            };
            // @ts-ignore
            L.Map.prototype._isPatched = true;
        }
    }
}
