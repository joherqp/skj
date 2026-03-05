import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  // Start with `true` to match server render (server has no `navigator`)
  // then sync to actual value on client after mount
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync actual value after mount
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
