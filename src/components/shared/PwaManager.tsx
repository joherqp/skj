'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isSystemPushEnabled, syncSystemPushSubscription } from '@/lib/systemPush';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        console.log('PWA: Registering Service Worker in production...');
        // Register the service worker with updateViaCache: 'none' to ensure we always get the latest SW
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
          console.log('PWA: Service Worker registered successfully');
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Detect updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New worker is ready and there's an existing one - update is available
                  if (confirm('Aplikasi versi terbaru tersedia. Perbarui sekarang?')) {
                    if (newWorker) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                  }
                }
              });
            }
          });
        }).catch((error) => {
          console.warn('Service worker registration failed:', error);
        });

        // Listen for the controlling service worker changing and reload the page
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // Check for updates when the window is focused
        const handleFocus = () => {
          navigator.serviceWorker.ready.then((registration) => {
            registration.update();
          });
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
      } else {
        // In dev, ensure old SW is removed
        console.log('PWA: Unregistering Service Workers in development mode...');
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            console.log('PWA: Unregistering worker:', reg.active?.scriptURL);
            void reg.unregister();
          });
        });
      }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (!isSystemPushEnabled()) return;
    void syncSystemPushSubscription(user.id);
  }, [user?.id]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (!deferredPrompt || isStandalone) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="fixed bottom-24 right-4 z-[80] rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg"
    >
      Install App
    </button>
  );
}
