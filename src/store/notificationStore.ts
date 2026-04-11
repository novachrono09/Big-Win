import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  initialized: boolean;
  
  fetchNotifications: (userId: string) => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

let channel: any = null;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  initialized: false,

  fetchNotifications: async (userId: string) => {
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) {
      set({ 
        notifications: data, 
        unreadCount: data.filter(n => !n.read).length,
        initialized: true 
      });
    }
  },

  subscribe: (userId: string) => {
    if (channel) return;

    channel = supabase
      .channel(`user_notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          set(state => ({
            notifications: [payload.new as Notification, ...state.notifications].slice(0, 20),
            unreadCount: state.unreadCount + 1
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as Notification;
          set(state => {
            const wasUnread = state.notifications.find(n => n.id === updated.id && !n.read);
            const isNowRead = updated.read;
            
            return {
              notifications: state.notifications.map(n => n.id === updated.id ? updated : n),
              unreadCount: (wasUnread && isNowRead) ? Math.max(0, state.unreadCount - 1) : state.unreadCount
            };
          });
        }
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }));
    
    await supabase.from('user_notifications').update({ read: true }).eq('id', id);
  },

  markAllAsRead: async (userId: string) => {
    // Optimistic update
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0
    }));
    
    await supabase.from('user_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  }
}));
