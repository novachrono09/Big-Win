import React from 'react';
import { X, Check, Bell } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';

interface NotificationsCenterProps {
  onClose: () => void;
}

export default function NotificationsCenter({ onClose }: NotificationsCenterProps) {
  const { user } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-sm bg-gray-50 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white shadow-md">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h2 className="font-black italic text-lg tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-white text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {unreadCount > 0 && (
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-end">
            <button 
              onClick={() => user?.id && markAllAsRead(user.id)}
              className="text-[10px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              <Check className="w-3 h-3" /> Mark all read
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 opacity-50">
              <Bell className="w-12 h-12" />
              <p className="text-xs font-bold uppercase tracking-widest">No notifications</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.read && markAsRead(n.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  n.read 
                    ? 'bg-white border-gray-100 opacity-70' 
                    : 'bg-red-50 border-red-100 shadow-sm shadow-red-100/50 relative overflow-hidden'
                }`}
              >
                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h4 className={`text-sm font-black ${n.read ? 'text-gray-700' : 'text-red-700'}`}>
                    {n.title}
                  </h4>
                  <span className="text-[9px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
