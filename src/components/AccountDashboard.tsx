import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, CreditCard, Gift, HeadphonesIcon, LogOut, Settings, 
  TrendingUp, TrendingDown, Target, Activity as ActivityIcon, Clock, ChevronLeft, Lock, Users
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PaginatedTable from './PaginatedTable';
import WithdrawalMethodsModal from './WithdrawalMethodsModal';
import SupportSystem from './SupportSystem';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface AccountDashboardProps {
  onOpenWallet: () => void;
  onOpenReferral: () => void;
}

export default function AccountDashboard({ onOpenWallet, onOpenReferral }: AccountDashboardProps) {
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ wagered: 0, won: 0, net: 0, winRate: 0, totalRounds: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    username: profile?.username || '',
    daily_bet_limit: profile?.daily_bet_limit || 100000,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchAccountData();
      setSettingsForm({
        username: profile.username || '',
        daily_bet_limit: profile.daily_bet_limit || 100000,
      });
    }
  }, [profile?.id]);

  const fetchAccountData = async () => {
    setLoading(true);
    try {
      const { data: bets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', profile.id)
        .not('won', 'is', null);

      if (bets) {
        let wagered = 0, won = 0, wins = 0;
        bets.forEach(b => {
          wagered += Number(b.amount);
          if (b.won) { won += Number(b.payout); wins++; }
        });
        setStats({ wagered, won, net: won - wagered, winRate: bets.length > 0 ? (wins / bets.length) * 100 : 0, totalRounds: bets.length });
        setChartData([
          { day: '1', pnl: -100 }, 
          { day: '2', pnl: 200 }, 
          { day: '3', pnl: -50 },
          { day: '4', pnl: 400 }, 
          { day: 'Today', pnl: won - wagered }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase.from('profiles').update(settingsForm).eq('id', profile.id);
      if (error) throw error;
      await refreshProfile(profile.id);
      addToast('success', 'Profile updated successfully');
      setShowSettings(false);
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleUpdatePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      addToast('error', 'New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('error', 'Passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      
      addToast('success', 'Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-4 pb-24">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-red-600 to-red-900 rounded-[2.5rem] p-6 text-white shadow-xl mb-6 relative overflow-hidden"
      >
        <div className="absolute -right-10 -bottom-10 opacity-10"><Wallet size={150} /></div>
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-16 h-16 bg-white/20 rounded-full border-2 border-white/40 flex items-center justify-center text-xl font-black shadow-lg backdrop-blur-sm">
            BW
          </div>
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase">{profile?.username}</h2>
            <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-white/20">BIG WIN PLAYER</span>
          </div>
        </div>
        
        <div className="bg-black/20 rounded-3xl p-5 border border-white/10 backdrop-blur-md relative z-10 mb-3">
          <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-1">Total Usable Balance</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-black italic">₹{Number(profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={onOpenWallet} 
              className="bg-white text-red-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Wallet size={24} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 relative z-10">
          <div className="bg-black/10 rounded-2xl p-2.5 border border-white/5 backdrop-blur-sm text-center">
             <p className="text-[7px] font-black text-red-200 uppercase tracking-widest mb-0.5 opacity-60">Deposits</p>
             <p className="text-white text-[11px] font-black">₹{Number(profile?.deposit_balance || profile?.deposited || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-yellow-500/20 rounded-2xl p-2.5 border border-yellow-500/20 backdrop-blur-sm text-center">
             <p className="text-[7px] font-black text-yellow-200 uppercase tracking-widest mb-0.5 opacity-60">Bonuses</p>
             <p className="text-yellow-400 text-[11px] font-black">₹{Number(profile?.bonus_balance || profile?.joining_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-green-500/20 rounded-2xl p-2.5 border border-green-500/20 backdrop-blur-sm text-center">
             <p className="text-[7px] font-black text-green-200 uppercase tracking-widest mb-0.5 opacity-60">Winnings</p>
             <p className="text-green-400 text-[11px] font-black">₹{Number(profile?.winnings_balance || profile?.winnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-4 gap-3 mb-6"
      >
        {[
          { icon: CreditCard, label: 'Deposit', onClick: onOpenWallet, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Wallet, label: 'Withdraw', onClick: onOpenWallet, color: 'text-red-600', bg: 'bg-red-50' },
          { icon: Gift, label: 'Refer', onClick: onOpenReferral, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: HeadphonesIcon, label: 'Support', onClick: () => setShowSupport(true), color: 'text-blue-600', bg: 'bg-blue-50' }
        ].map((btn, i) => (
          <motion.button 
            key={i} 
            variants={item}
            whileTap={{ scale: 0.9 }}
            onClick={btn.onClick} 
            className="bg-white rounded-[1.5rem] p-3 flex flex-col items-center gap-2 shadow-sm border border-gray-100 group transition-all"
          >
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", btn.bg, btn.color)}>
              <btn.icon size={20} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter text-gray-600">{btn.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 mb-6"
      >
        {[
          { label: 'Wagered', value: `₹${stats.wagered.toLocaleString()}`, icon: ActivityIcon, color: 'text-gray-400' },
          { label: 'Won', value: `₹${stats.won.toLocaleString()}`, icon: Target, color: 'text-green-600' },
          { label: 'Net P/L', value: `${stats.net >= 0 ? '+' : ''}₹${stats.net.toLocaleString()}`, icon: TrendingUp, color: stats.net >= 0 ? 'text-green-600' : 'text-red-600' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, icon: Target, color: 'text-gray-800' }
        ].map((s, i) => (
          <motion.div key={i} variants={item} className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-gray-400"><s.icon size={12} /><span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span></div>
            <p className={`text-lg font-black italic tracking-tight ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Performance Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6"
      >
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Performance Index</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="day" hide />
              <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
              <Line type="monotone" dataKey="pnl" stroke="#dc2626" strokeWidth={4} dot={{ r: 4, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Secondary Menu */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6"
      >
        <button onClick={() => navigate(profile?.is_agent ? '/agent' : '/become-agent')} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-50 transition-colors">
          <div className="flex items-center gap-3 text-red-600 font-bold text-sm">
            <Users size={20}/>
            <span className="italic uppercase tracking-widest text-[10px] font-black">
              {profile?.is_agent ? 'Agent Dashboard' : 'Become an Agent'}
            </span>
          </div>
          <ChevronLeft className="rotate-180 text-gray-300" size={18} />
        </button>
        <button onClick={() => setShowMethods(true)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-50 transition-colors">
          <div className="flex items-center gap-3 text-gray-700 font-bold text-sm"><Wallet size={20}/><span className="italic">Withdrawal Methods</span></div>
          <ChevronLeft className="rotate-180 text-gray-300" size={18} />
        </button>
        <button onClick={() => setShowSettings(true)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 border-b border-gray-50 transition-colors">
          <div className="flex items-center gap-3 text-gray-700 font-bold text-sm"><Settings size={20}/><span className="italic">Account Settings</span></div>
          <ChevronLeft className="rotate-180 text-gray-300" size={18} />
        </button>
        <button onClick={() => signOut()} className="w-full flex items-center justify-between p-5 hover:bg-red-50 transition-colors group">
          <div className="flex items-center gap-3 text-red-600 font-black text-sm uppercase tracking-widest"><LogOut size={20}/><span className="italic">Secure Logout</span></div>
        </button>
      </motion.div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {showMethods && <WithdrawalMethodsModal userId={profile.id} onClose={() => setShowMethods(false)} />}
        
        {showSupport && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[70] bg-gray-50 flex flex-col"
          >
            <div className="bg-red-600 p-5 text-white flex items-center gap-4 shadow-lg relative z-10">
              <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowSupport(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft size={24} strokeWidth={3} />
              </motion.button>
              <h2 className="font-black uppercase italic tracking-tighter text-2xl">Help & Support</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SupportSystem />
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50" />
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black italic uppercase text-gray-800 tracking-tighter">Settings</h3>
                <motion.button whileTap={{ scale: 0.8 }} onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"><X size={24}/></motion.button>
              </div>

              <div className="space-y-8">
                {/* Profile Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400"><Settings size={14}/><span className="text-[10px] font-black uppercase tracking-widest">Public Profile</span></div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block ml-1">Username</label>
                    <input type="text" value={settingsForm.username} onChange={e => setSettingsForm({...settingsForm, username: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:outline-none focus:border-red-500 transition-all shadow-inner" />
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveSettings} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[10px]">Save Changes</motion.button>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Security Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400"><Lock size={14}/><span className="text-[10px] font-black uppercase tracking-widest">Security</span></div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block ml-1">New Password</label>
                      <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} placeholder="Min 6 characters" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:outline-none focus:border-red-500 transition-all shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block ml-1">Confirm New Password</label>
                      <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} placeholder="Repeat new password" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-gray-800 focus:outline-none focus:border-red-500 transition-all shadow-inner" />
                    </div>
                  </div>

                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdatePassword} 
                    disabled={updatingPassword}
                    className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-600/20 active:scale-95 transition-all uppercase tracking-widest text-[10px] disabled:opacity-50"
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
