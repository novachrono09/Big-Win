import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { Copy, Users, Wallet, TrendingUp, Award, Calendar, ChevronRight } from 'lucide-react';

export default function AgentDashboard() {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [stats, setStats] = useState({
    todayCommission: 0,
    sevenDayCommission: 0,
    teamTurnover: 0,
    directPlayers: 0
  });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (profile?.id && profile?.is_agent) {
      fetchAgentStats();
      fetchCommissions();
    }
  }, [profile?.id, profile?.is_agent]);

  const fetchAgentStats = async () => {
    try {
      // Get direct players count
      const { count: directCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agent_referred_by', profile?.id);

      // Get commissions for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayComm } = await supabase
        .from('agent_commissions')
        .select('commission_amount')
        .eq('agent_id', profile?.id)
        .gte('created_at', today.toISOString());

      // Get commissions for 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: weekComm } = await supabase
        .from('agent_commissions')
        .select('commission_amount, bet_amount')
        .eq('agent_id', profile?.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const todayTotal = todayComm?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const weekTotal = weekComm?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const turnover = weekComm?.reduce((sum, c) => sum + Number(c.bet_amount), 0) || 0;

      setStats({
        todayCommission: todayTotal,
        sevenDayCommission: weekTotal,
        teamTurnover: turnover,
        directPlayers: directCount || 0
      });
    } catch (err) {
      console.error('Error fetching agent stats:', err);
    }
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_commissions')
        .select('*, player:profiles!player_id(username)')
        .eq('agent_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCommissions(data || []);
    } catch (err) {
      console.error('Error fetching commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(prompt('Enter withdrawal amount (Min ₹500):', '500'));
    if (isNaN(amount) || amount < 500) {
      addToast('error', 'Minimum withdrawal is ₹500');
      return;
    }
    if (amount > (profile?.agent_balance || 0)) {
      addToast('error', 'Insufficient agent balance');
      return;
    }

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.rpc('agent_withdraw', { p_amount: amount });
      if (error) throw error;
      if (data?.error) {
        addToast('error', data.error);
      } else {
        addToast('success', 'Withdrawal request submitted!');
        refreshProfile(profile!.id);
      }
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/?agent=${profile?.agent_code}`;
    navigator.clipboard.writeText(link);
    addToast('success', 'Invite link copied to clipboard!');
  };

  if (!profile?.is_agent) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-8 text-sm font-bold uppercase tracking-widest">Only approved agents can access this dashboard.</p>
        <button 
          onClick={() => window.location.href = '/become-agent'}
          className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
        >
          Become an Agent
        </button>
      </div>
    );
  }

  const getTierName = (tier: number) => {
    if (tier === 1) return 'Starter';
    if (tier === 2) return 'Pro';
    if (tier === 3) return 'Elite';
    return 'Agent';
  };

  const getTierRate = (tier: number) => {
    if (tier === 1) return '1.5%';
    if (tier === 2) return '2.0%';
    if (tier === 3) return '2.5%';
    return '0%';
  };

  return (
    <div className="flex-1 bg-gray-100 pb-24 overflow-x-hidden">
      <div className="bg-gray-900 p-8 pt-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-black italic tracking-tighter">AGENT PANEL</h1>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  profile.agent_tier === 3 ? 'bg-yellow-500 text-black' : 
                  profile.agent_tier === 2 ? 'bg-blue-500 text-white' : 
                  'bg-red-600 text-white'
                }`}>
                  {getTierName(profile.agent_tier)}
                </span>
              </div>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Manage your network and earnings</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-md p-3 rounded-2xl border border-gray-700 text-center min-w-[100px]">
              <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Agent Code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-black text-red-500 tracking-widest">{profile.agent_code}</span>
                <button onClick={() => { navigator.clipboard.writeText(profile.agent_code); addToast('success', 'Code copied!'); }} className="text-gray-500 hover:text-white">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 shadow-2xl shadow-red-600/20 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Wallet size={20} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/80">Agent Balance</span>
              </div>
              <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase tracking-widest">Rate: {getTierRate(profile.agent_tier)}</span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-4xl font-black italic tracking-tighter">₹{profile.agent_balance?.toLocaleString() || '0'}</span>
              </div>
              <button 
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="bg-white text-red-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {withdrawing ? '...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 -mt-6 relative z-20 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Calendar size={10} /> Today Comm.
            </p>
            <p className="text-xl font-black text-gray-900 italic tracking-tighter">₹{stats.todayCommission.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 shadow-xl border border-gray-100">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <TrendingUp size={10} /> 7D Turnover
            </p>
            <p className="text-xl font-black text-gray-900 italic tracking-tighter">₹{(stats.teamTurnover / 1000).toFixed(1)}K</p>
          </div>
        </div>

        <button 
          onClick={copyInviteLink}
          className="w-full bg-white rounded-3xl p-5 shadow-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600">
              <Users size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Invite Sub-Players</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Direct Players: {stats.directPlayers}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 italic">Commission Log</h3>
            <button onClick={fetchCommissions} className="text-red-600 text-[10px] font-black uppercase tracking-widest">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-widest">Player</th>
                  <th className="px-6 py-4 text-center text-[8px] font-black text-gray-400 uppercase tracking-widest">Bet</th>
                  <th className="px-6 py-4 text-right text-[8px] font-black text-gray-400 uppercase tracking-widest">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-300 font-black italic uppercase tracking-widest text-[10px]">Loading transactions...</td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-300 font-black italic uppercase tracking-widest text-[10px]">No commissions yet</td>
                  </tr>
                ) : commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{c.player?.username || 'User'}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-[10px] font-black text-gray-500 tracking-tighter">₹{c.bet_amount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-[10px] font-black text-green-600 tracking-tighter">+₹{c.commission_amount}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">@{c.commission_rate * 100}%</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
