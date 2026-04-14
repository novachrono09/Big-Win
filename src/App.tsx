import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useGameStore, startGameTick } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import AuthPage from './components/AuthPage';
import Header from './components/Header';
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

// Pages
import WingoGame from './pages/WingoGame';
import ReferralTab from './components/ReferralTab';
import GamesHub from './components/GamesHub';
import Activity from './components/Activity';
import AccountDashboard from './components/AccountDashboard';
import AgentDashboard from './components/AgentDashboard';
import BecomeAgent from './components/BecomeAgent';

export default function App() {
  const { user, loading, initialized, initialize, profile } = useAuthStore();
  const { fetchNotifications, subscribe, unsubscribe } = useNotificationStore();
  const [showWallet, setShowWallet] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

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
  const isAdminPath = location.pathname === '/admin';

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
      navigate('/');
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

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-lg min-h-screen bg-gray-100 relative shadow-2xl overflow-x-hidden flex flex-col">
        <Header />

        <div className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/wingo" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <WingoGame />
                </motion.div>
              } />
              <Route path="/all-games" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <GamesHub onPlayWingo={() => navigate('/wingo')} />
                </motion.div>
              } />
              <Route path="/activity" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <Activity />
                </motion.div>
              } />
              <Route path="/promotion" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1 p-4 pb-24">
                  <ReferralTab />
                </motion.div>
              } />
              <Route path="/agent" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <AgentDashboard />
                </motion.div>
              } />
              <Route path="/become-agent" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <BecomeAgent />
                </motion.div>
              } />
              <Route path="/account" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2, ease: "easeOut" }} className="w-full flex-1">
                  <AccountDashboard onOpenWallet={() => setShowWallet(true)} onOpenReferral={() => navigate('/promotion')} />
                </motion.div>
              } />
              <Route path="*" element={<Navigate to="/wingo" replace />} />
            </Routes>
          </AnimatePresence>
        </div>

        <BottomNav />
        
        <ResultAnnouncement />
        <ToastContainer />
        {showWallet && <WalletModal onClose={() => setShowWallet(false)} />}
        {showResetModal && <ResetPasswordModal onClose={() => setShowResetModal(false)} />}
      </div>
    </div>
  );
}