import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/lib/gps';

const TRACKING_INTERVAL = 3600000; // 1 hour

export function LocationTracker() {
  const { user } = useAuth();
  const { dbMode } = useDatabase();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const trackLocation = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation();

        const { error } = await supabase.schema(dbMode).from('user_locations').insert({
          user_id: user.id,
          latitude,
          longitude,
          timestamp: new Date().toISOString()
        });

        if (error) {
          const code = (error as { code?: string }).code;
          const shouldFallback = dbMode === 'demo' && (
            code === 'PGRST106' || code === 'PGRST205' || code === '42P01'
          );
          if (shouldFallback) {
            // Fallback for projects where demo schema/table is not ready in PostgREST
            const { error: fallbackError } = await supabase.from('user_locations').insert({
              user_id: user.id,
              latitude,
              longitude,
              timestamp: new Date().toISOString()
            });
            if (fallbackError) throw fallbackError;
            if (!warnedRef.current) {
              console.warn("Schema/table demo untuk user_locations belum siap, fallback ke public.");
              warnedRef.current = true;
            }
          } else {
            throw error;
          }
        }
      } catch (error: any) {
        console.error(`Error tracking location: ${error.message || error}`);
      }
    };

    // Initial track
    trackLocation();

    // Set interval (1 hour)
    const intervalId = setInterval(trackLocation, TRACKING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [dbMode, user]);

  return null; // Logic-only component
}
