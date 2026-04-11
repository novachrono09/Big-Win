import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import WalletModal from './WalletModal';
import NotificationsCenter from './NotificationsCenter';
import { Bell, RefreshCw } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { user, profile, refreshProfile } = useAuthStore();
  const [showWallet, setShowWallet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotificationStore();

  const initials = profile?.username?.substring(0, 2).toUpperCase() || 'GU';
  const totalBalance = Number(profile?.balance || 0) + (!profile?.bonus_locked ? Number(profile?.joining_bonus || 0) : 0);

  const handleRefresh = async () => {
    if (!user?.id || isRefreshing) return;
    setIsRefreshing(true);
    await refreshProfile(user.id);
    setTimeout(() => setIsRefreshing(false), 1000); // 1 second cooldown
  };

  return (
    <>
      <header className="bg-red-600 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm border border-white/30 shadow-inner">
              {initials}
            </div>
            <div>
              <p className="text-[10px] text-red-100 opacity-80 font-bold uppercase tracking-widest">Welcome,</p>
              <p className="text-sm font-black leading-none tracking-tight uppercase italic">{profile?.username || 'Loading...'}</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-1.5">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-white/10 rounded-full transition-colors mr-1"
            >
              <Bell className="w-5 h-5 text-white/90" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-red-600"
                  ></motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-1.5 hover:bg-white/10 rounded-full transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-yellow-300' : 'text-white/80'}`} />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowWallet(true)}
              className="bg-black/20 hover:bg-black/30 transition-colors px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-lg"
            >
              <AnimatePresence mode="wait">
                <motion.span 
                  key={totalBalance}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-yellow-400 font-black text-sm"
                >
                  ₹{totalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </motion.span>
              </AnimatePresence>
              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </motion.button>
          </div>
        </div>
      </header>

      {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
      {showNotifications && <NotificationsCenter onClose={() => setShowNotifications(false)} />}
    </>
  );
}
