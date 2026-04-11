import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

export function useRealtimeReconnect() {
  const { user } = useAuthStore();
  const { subscribe: subNotify, unsubscribe: unsubNotify } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;

    // Listen for visibility changes (mobile tab switching often drops sockets)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // SAFETY NET: Re-sync critical data on tab return
        unsubNotify();
        subNotify(user.id);
        
        // Trigger a manual history refresh to catch missed results
        const gameStore = useGameStore.getState();
        gameStore.fetchInitialHistory().then();
        
        // Resync UI timers dynamically so it doesn't freeze or resume from old state
        if (gameStore.resyncTimers) {
           gameStore.resyncTimers();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, subNotify, unsubNotify]);
}
