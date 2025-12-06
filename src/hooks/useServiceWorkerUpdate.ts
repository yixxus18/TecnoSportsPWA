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
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        setRegistration(reg);
        console.log('SW Registered:', reg);

        // Check for updates every 60 seconds
        setInterval(() => {
          reg.update();
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
      } catch (error) {
        console.error('SW registration error:', error);
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
