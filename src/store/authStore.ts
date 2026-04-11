import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useGameStore } from './gameStore';

interface AuthStore {
  user: any | null;
  profile: any | null;
  loading: boolean;
  initialized: boolean;
  refreshProfile: (userId: string) => Promise<void>;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  refreshProfile: async (userId: string) => {
    // Only show loading if we don't have a profile yet
    if (!get().profile) set({ loading: true });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        set({ profile: data, loading: false });
        try {
          useGameStore.getState().syncUser({
            id: data.id,
            username: data.username,
            balance: data.balance,
            deposited: data.deposited,
            winnings: data.winnings,
            is_admin: data.is_admin,
            joining_bonus: data.joining_bonus,
            bonus_locked: data.bonus_locked,
            has_deposited: data.has_deposited
          });
        } catch (syncErr) {}
      }
    } catch (err) {
      console.error('Profile fetch failed:', err);
      set({ profile: null, loading: false });
    }
  },

  initialize: async () => {
    if (get().initialized) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && !session.user.is_anonymous) {
        set({ user: session.user });
        await get().refreshProfile(session.user.id);
      }
    } catch (error) {
      console.error('Initial session fetch failed:', error);
    } finally {
      // Mark as initialized no matter what happened.
      set({ initialized: true, loading: false });
    }

    // Single source of truth listener with proper cleanup
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Sign in or Identity changed
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        set({ user: session.user });
        // Fire and forget refreshProfile to avoid holding the auth lock
        get().refreshProfile(session.user.id).catch(err => console.error(err));
      } 
      // Sign out
      else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, loading: false });
        try { useGameStore.getState().syncUser(null); } catch(e){}
      }
      set({ initialized: true });
    });

    // Provide a way to unsubscribe if needed
    return () => subscription.unsubscribe();
  },

  signOut: async () => {
    try {
      set({ loading: true });
      // 1. Tell Supabase to sign out
      await supabase.auth.signOut();
      
      // 2. Aggressively wipe local storage
      const keysToKeep = ['debug']; // Keep only non-auth stuff if any
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) localStorage.removeItem(key);
      });
      
      // 3. Clear cookies (optional but good for safety)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      // 4. Force state reset no matter what
      set({ user: null, profile: null, loading: false, initialized: true });
      try { useGameStore.getState().syncUser(null); } catch(e){}
      
      // 5. Force a clean state refresh via redirect
      window.location.href = '/';
    }
  }
}));
