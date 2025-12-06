import { useEffect, useState, useCallback } from 'react';

interface UpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
}

export const useServiceWorkerUpdate = () => {
  const [updateState, setUpdateState] = useState<UpdateState>({
    needRefresh: false,
    offlineReady: false,
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    const registerSW = async () => {
      try {
        // Vite PWA generates sw.js by default
        const swPath = '/sw.js';
        const reg = await navigator.serviceWorker.register(swPath, { scope: '/' });
        setRegistration(reg);
        console.log('SW Registered:', reg);

        // Check for updates every 60 seconds
        const intervalId = setInterval(() => {
          reg.update().catch(console.error);
        }, 60 * 1000);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                setUpdateState(prev => ({ ...prev, needRefresh: true }));
              } else if (newWorker.state === 'installed') {
                // Content is cached for offline use
                setUpdateState(prev => ({ ...prev, offlineReady: true }));
              }
            });
          }
        });

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
      } catch (error) {
        // SW registration failed - this is ok, the app will still work
        console.log('SW registration failed (this is normal in development):', error);
      }
    };

    registerSW();
  }, []);

  const acceptUpdate = useCallback(async () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [registration]);

  const dismissUpdate = useCallback(() => {
    setUpdateState(prev => ({ ...prev, needRefresh: false }));
  }, []);

  const dismissOfflineReady = useCallback(() => {
    setUpdateState(prev => ({ ...prev, offlineReady: false }));
  }, []);

  return {
    needRefresh: updateState.needRefresh,
    offlineReady: updateState.offlineReady,
    acceptUpdate,
    dismissUpdate,
    dismissOfflineReady,
  };
};
