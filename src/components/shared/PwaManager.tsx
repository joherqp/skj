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
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.warn('Service worker registration failed:', error);
        });
      } else {
        // In dev, ensure old SW is removed to avoid stale bundle/hydration issues
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => void reg.unregister());
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
