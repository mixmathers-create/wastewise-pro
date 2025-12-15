import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

/**
 * Hook to detect online/offline status on mobile (Capacitor)
 * Uses Capacitor Network plugin for reliable detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    const initNetworkStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);

        listenerHandle = await Network.addListener('networkStatusChange', (status) => {
          setIsOnline(status.connected);
          setConnectionType(status.connectionType);
        });
      } catch (error) {
        // Silent fail
      }
    };

    initNetworkStatus();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return { isOnline, connectionType };
}
