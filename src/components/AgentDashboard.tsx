import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { Copy, Users, Wallet, TrendingUp, Award, Calendar, ChevronRight, History, LayoutDashboard, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import PaginatedTable from './PaginatedTable';
import AgentWithdrawalTab from './AgentWithdrawalTab';

export default function AgentDashboard() {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [activeTab, setActiveTab] = useState<'network' | 'team' | 'withdraw'>('network');
  const [stats, setStats] = useState({
    todayCommission: 0,
    sevenDayCommission: 0,
    teamTurnover: 0,
    thirtyDayTurnover: 0,
    directPlayers: 0,
    activePlayers: 0,
    nextMilestonePlayers: 0,
    nextMilestoneBonus: 0,
    perPlayerBonusConfig: 0
  });
  const [loading, setLoading] = useState(true);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  useEffect(() => {
    if (profile?.id && profile?.is_agent) {
      fetchAgentStats();
    }
  }, [profile?.id, profile?.is_agent]);

  const fetchAgentStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_agent_dashboard_stats', { p_agent_id: profile!.id });
      if (error) throw error;

      const { data: configData } = await supabase.from('agent_bonus_config').select('value').eq('key', 'per_player_after_100').single();

      setStats({
        todayCommission: Number(data.today_commission),
        sevenDayCommission: Number(data.seven_day_commission),
        teamTurnover: Number(data.seven_day_turnover),
        thirtyDayTurnover: Number(data.thirty_day_turnover),
        directPlayers: Number(data.direct_players),
        activePlayers: Number(data.active_players),
        nextMilestonePlayers: Number(data.next_milestone_players),
        nextMilestoneBonus: Number(data.next_milestone_bonus),
        perPlayerBonusConfig: Number(configData?.value || 0)
      });
    } catch (err) {
      console.error('Error fetching agent stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/?agent=${profile?.agent_code}`;
    navigator.clipboard.writeText(link);
    addToast('success', 'Invite link copied to clipboard!');
  };

  if (!profile?.is_agent) {
    return (
      <div className="p-8 text-center bg-gray-50 flex-1 min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4 italic">Access Denied</h2>
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
                onClick={() => setActiveTab('withdraw')}
                className="bg-white text-red-600 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Tier Progress Section */}
          <div className="bg-gray-800/40 backdrop-blur-md rounded-3xl p-5 border border-gray-700/50">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  {profile.agent_tier < 3 ? `Progress to ${getTierName(profile.agent_tier + 1)}` : 'Maximum Tier Reached'}
                </span>
              </div>
              {profile.agent_tier < 3 && (
                <span className="text-[10px] font-black text-red-500 uppercase">
                  {Math.min(100, Math.floor((stats.thirtyDayTurnover / (profile.agent_tier === 1 ? 500000 : 2500000)) * 100))}%
                </span>
              )}
            </div>
            
            {profile.agent_tier < 3 ? (
              <>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.thirtyDayTurnover / (profile.agent_tier === 1 ? 500000 : 2500000)) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter">
                  <div className="text-gray-500">
                    30D Turnover: <span className="text-white">₹{(stats.thirtyDayTurnover / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="text-red-500">
                    Remaining: ₹{Math.max(0, (profile.agent_tier === 1 ? 500000 : 2500000) - stats.thirtyDayTurnover).toLocaleString()}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-yellow-500">
                <Award size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">You are an Elite Agent! Maximum benefits active.</span>
              </div>
            )}
          </div>

          <div className="flex bg-gray-800/50 p-1 rounded-2xl border border-gray-700 backdrop-blur-sm">
            <button 
              onClick={() => setActiveTab('network')}
              className={cn(
                "flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'network' ? "bg-red-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <LayoutDashboard size={14} /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={cn(
                "flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'team' ? "bg-red-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Users size={14} /> My Team
            </button>
            <button 
              onClick={() => setActiveTab('withdraw')}
              className={cn(
                "flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'withdraw' ? "bg-red-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Wallet size={14} /> Withdraw
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 -mt-6 relative z-20 space-y-6">
        {activeTab === 'network' && (
          <>
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
                  <div className="flex gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Direct: {stats.directPlayers}</span>
                    <span className="text-red-600">Active: {stats.activePlayers}</span>
                  </div>
                </div>

              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </button>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900 italic">Commission Log</h3>
              </div>
              <PaginatedTable 
                tableName="agent_commissions"
                select="*, player:profiles!player_id(username)"
                queryModifier={(q) => q.eq('agent_id', profile?.id)}
                pageSize={10}
                initialDateFilter="all"
                columns={[
                  { key: 'created_at', label: 'Info', render: (r) => (
                    <div>
                      <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{r.player?.username || 'User'}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  )},
                  { key: 'bet_amount', label: 'Bet', render: (r) => <span className="font-black text-gray-500">₹{r.bet_amount}</span> },
                  { key: 'commission_amount', label: 'Earned', render: (r) => (
                    <div className="text-right">
                      <div className="text-[10px] font-black text-green-600">+₹{r.commission_amount}</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">@{Number(r.commission_rate) * 100}%</div>
                    </div>
                  )}
                ]}
              />
            </div>

            {/* Milestone Tracker Section */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-50 p-2.5 rounded-2xl text-yellow-600">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic uppercase text-gray-800">Milestone Rewards</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unlock bonuses by growing your team</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Players</p>
                    <p className="text-3xl font-black italic text-gray-900">{stats.activePlayers} <span className="text-sm text-gray-300 not-italic">/ {stats.nextMilestonePlayers || stats.activePlayers}</span></p>
                  </div>
                  {stats.nextMilestonePlayers > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Next Bonus</p>
                      <p className="text-xl font-black italic text-gray-900">₹{stats.nextMilestoneBonus.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {stats.nextMilestonePlayers > 0 ? (
                  <>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (stats.activePlayers / stats.nextMilestonePlayers) * 100)}%` }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      />
                    </div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
                      Get {stats.nextMilestonePlayers - stats.activePlayers} more active players to reach ₹{stats.nextMilestoneBonus} bonus
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">All Milestones Achieved!</span>
                    </div>
                    <div className="bg-green-50 border border-green-100 px-4 py-2 rounded-xl">
                      <p className="text-[10px] font-black text-green-700 uppercase tracking-widest text-center">
                        Now earning ₹{stats.perPlayerBonusConfig} for EVERY new active player!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {stats.activePlayers >= 100 && stats.nextMilestonePlayers === 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Users size={16} /></div>
                    <div>
                      <p className="text-[10px] font-black text-blue-900 uppercase">Extra Bonus Active</p>
                      <p className="text-[8px] font-bold text-blue-600 uppercase">₹{stats.perPlayerBonusConfig} per player after 100</p>
                    </div>
                  </div>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-[8px] font-black uppercase">Active</span>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Bonus History</h4>
                <PaginatedTable 
                  tableName="agent_bonuses"
                  select="*, player:profiles!related_player_id(username)"
                  queryModifier={(q) => q.eq('agent_id', profile?.id)}
                  pageSize={5}
                  initialDateFilter="all"
                  columns={[
                    { key: 'bonus_type', label: 'Type', render: (r) => (
                      <div>
                        <div className="text-[10px] font-black text-gray-900 uppercase">{r.bonus_type === 'milestone' ? 'Milestone' : 'Per Player'}</div>
                        <div className="text-[8px] font-bold text-gray-400 uppercase">
                          {r.bonus_type === 'milestone' ? `${r.milestone_players} Players` : `User: ${r.player?.username || 'N/A'}`}
                        </div>
                      </div>
                    )},
                    { key: 'amount', label: 'Bonus', render: (r) => <span className="font-black text-green-600">₹{r.amount.toLocaleString()}</span> },
                    { key: 'created_at', label: 'Date', render: (r) => <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span> }
                  ]}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black italic uppercase text-gray-800 flex items-center gap-2">
                <div className="w-2 h-8 bg-red-600 rounded-full"></div>
                My Direct Players
              </h3>
              <button 
                onClick={() => setShowOnlyActive(!showOnlyActive)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2",
                  showOnlyActive 
                    ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20" 
                    : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                )}
              >
                {showOnlyActive ? 'Showing Active' : 'Show Only Active'}
              </button>
            </div>
            <PaginatedTable 
              key={showOnlyActive ? 'active' : 'all'}
              tableName="agent_referrals_view"
              queryModifier={(q) => {
                let query = q.eq('agent_referred_by', profile?.id);
                if (showOnlyActive) query = query.eq('is_active', true);
                return query;
              }}
              pageSize={10}
              columns={[
                { key: 'username', label: 'Player', render: (r) => (
                  <div>
                    <div className="font-black uppercase text-gray-900">{r.username}</div>
                    <div className="text-[8px] font-bold text-gray-400 uppercase">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                )},
                { key: 'is_active', label: 'Status', render: (r) => (
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border text-center",
                      r.is_active ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100"
                    )}>
                      {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {!r.is_active && (
                      <span className="text-[7px] text-gray-400 font-bold uppercase leading-tight">
                        {r.lifetime_deposit < 500 ? `Dep: ₹${Math.floor(r.lifetime_deposit)}/500` : `Bets: ${r.bets_30d}/3`}
                      </span>
                    )}
                  </div>
                )},
                { key: 'turnover', label: 'Turnover', render: (r) => (
                  <span className="font-black text-blue-600 text-right block">₹{Number(r.turnover || 0).toLocaleString()}</span>
                )}
              ]}
            />
          </div>
        )}

        {activeTab === 'withdraw' && (
          <AgentWithdrawalTab />
        )}
      </div>
    </div>
  );
}
