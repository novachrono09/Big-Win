import { useEffect, useState } from 'react';
import { useGameStore, startGameTick } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import AuthPage from './components/AuthPage';
import Header from './components/Header';
import SessionTabs from './components/SessionTabs';
import CountdownPanel from './components/CountdownPanel';
import BettingPanel from './components/BettingPanel';
import CurrentBets from './components/CurrentBets';
import GameHistory from './components/GameHistory';
import ToastContainer from './components/ToastContainer';
import ResultAnnouncement from './components/ResultAnnouncement';
import BottomNav from './components/BottomNav';
import WalletModal from './components/WalletModal';
import { useRealtimeBalance } from './hooks/useRealtimeBalance';
import { useRealtimeReconnect } from './hooks/useRealtimeReconnect';
import AdminPanel from './pages/Admin';
import { useNotificationStore } from './store/notificationStore';
import { supabase } from './lib/supabase';
import ResetPasswordModal from './components/ResetPasswordModal';
import { motion, AnimatePresence } from 'framer-motion';

// New Fully Featured Components
import ReferralTab from './components/ReferralTab';
import GamesHub from './components/GamesHub';
import Activity from './components/Activity';
import AccountDashboard from './components/AccountDashboard';

export type TabType = 'wingo' | 'all-games' | 'activity' | 'promotion' | 'account';

// ── Main App Component ──

export default function App() {
  const { user, loading, initialized, initialize, profile, signOut } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<TabType>('wingo');
  const [showWallet, setShowWallet] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  useRealtimeBalance();
  useRealtimeReconnect();

  useEffect(() => {
    initialize();
    startGameTick();
    useGameStore.getState().fetchInitialHistory();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      subscribe(user.id);
    }
    return () => unsubscribe();
  }, [user?.id, fetchNotifications, subscribe, unsubscribe]);

  // ONLY show the loading screen if we haven't finished the first ever check
  if (!initialized && loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="text-red-600 animate-pulse font-black text-2xl italic tracking-tighter mb-4">
          LOADING...
        </div>
      </div>
    );
  }

  // Handle Admin Route
  const isAdminPath = typeof window !== 'undefined' && window.location.pathname === '/admin';

  if (isAdminPath) {
    if (!profile) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-red-600 font-bold italic p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600 mb-4"></div>
          SECURE CONNECTION...
        </div>
      );
    }
    
    if (profile.is_admin) {
      return (
        <>
          <AdminPanel />
          <ToastContainer />
        </>
      );
    } else {
      // Non-admin trying to access admin
      window.location.href = '/';
      return null;
    }
  }

  if (!user) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full flex-1"
        >
          {(() => {
            switch (activeTab) {
              case 'wingo':
                return (
                  <div className="pb-24">
                    <CountdownPanel />
                    <BettingPanel />
                    <CurrentBets />
                    <GameHistory />
                  </div>
                );
              case 'all-games':
                return <GamesHub onPlayWingo={() => setActiveTab('wingo')} />;
              case 'activity':
                return <Activity />;
              case 'promotion':
                return (
                  <div className="p-4 pb-24">
                    <ReferralTab />
                  </div>
                );
              case 'account':
                return <AccountDashboard onOpenWallet={() => setShowWallet(true)} onOpenReferral={() => setActiveTab('promotion')} />;
              default:
                return null;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-lg min-h-screen bg-gray-100 relative shadow-2xl overflow-x-hidden flex flex-col">
        <Header />
        
        {activeTab === 'wingo' && <SessionTabs />}

        <div className="flex-1 flex flex-col">
          {renderContent()}
        </div>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <ResultAnnouncement />
        <ToastContainer />
        {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
        {showResetModal && <ResetPasswordModal onClose={() => setShowResetModal(false)} />}
      </div>
    </div>
  );
}
