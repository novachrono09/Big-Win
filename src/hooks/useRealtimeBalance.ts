import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

export function useRealtimeBalance() {
  const { user } = useAuthStore();
  const { addToast, syncUserBalance } = useGameStore();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to changes on the profiles table for the current user
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = payload.new.balance;
          const oldBalance = payload.old.balance;

          // Only sync and show toast if the balance actually changed
          if (newBalance !== oldBalance) {
            syncUserBalance(newBalance);
            // Optionally, you can add logic to only show toast for significant changes or deposits
            // addToast('info', 'Balance updated!');
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncUserBalance, addToast]);
}
