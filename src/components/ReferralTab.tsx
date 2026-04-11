import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Copy, Share2, Users, Wallet, TrendingUp, HelpCircle, History } from 'lucide-react';
import PaginatedTable from './PaginatedTable';

export default function ReferralTab() {
  const { profile } = useAuthStore();
  const { addToast } = useGameStore();
  const [activeTab, setActiveTab] = useState<'subordinates' | 'earnings'>('subordinates');
  const [stats, setStats] = useState({
    totalReferred: 0,
    totalEarnings: 0,
    thisMonth: 0
  });

  useEffect(() => {
    if (profile?.id) fetchReferralStats();
  }, [profile]);

  const fetchReferralStats = async () => {
    // 1. Fetch referral count
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', profile.id);

    // 2. Fetch total earnings
    const { data: earnings } = await supabase
      .from('referral_earnings')
      .select('amount, created_at')
      .eq('referrer_id', profile.id);

    const totalEarned = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEarned = earnings
      ?.filter(e => e.created_at >= firstDay)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    setStats({
      totalReferred: count || 0,
      totalEarnings: totalEarned,
      thisMonth: monthEarned
    });
  };

  const referralLink = `${window.location.origin}/register?ref=${profile?.referral_code}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast('success', `${label} copied!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Invite Card */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Share2 size={120} /></div>
        <h3 className="text-2xl font-black italic mb-1 uppercase tracking-tight">Refer & Earn</h3>
        <p className="text-red-100 text-xs font-medium mb-6 opacity-80 uppercase tracking-widest">Share with friends and earn commission</p>
        
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-200 mb-2">My Referral Code</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black tracking-[0.3em] font-mono">{profile?.referral_code || '-------'}</span>
              <button onClick={() => copyToClipboard(profile?.referral_code || '', 'Code')} className="bg-white text-red-600 px-4 py-2 rounded-xl font-black text-xs uppercase active:scale-95 transition-all">Copy</button>
            </div>
          </div>
          <div className="bg-black/20 rounded-2xl p-4 flex items-center justify-between group">
            <div className="overflow-hidden mr-4">
              <p className="text-[10px] font-bold uppercase text-red-300 mb-1">Invite Link</p>
              <p className="text-[11px] font-mono opacity-60 truncate">{referralLink}</p>
            </div>
            <button onClick={() => copyToClipboard(referralLink, 'Link')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Copy size={18} /></button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Invited', value: stats.totalReferred, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Total Earning', value: `₹${stats.totalEarnings.toFixed(0)}`, icon: Wallet, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'This Month', value: `₹${stats.thisMonth.toFixed(0)}`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
            <div className={`w-8 h-8 ${s.bg} ${s.color} rounded-lg flex items-center justify-center mx-auto mb-2`}><s.icon size={16} /></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">{s.label}</p>
            <p className="text-sm font-black text-gray-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        <button onClick={() => setActiveTab('subordinates')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'subordinates' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}>Subordinates</button>
        <button onClick={() => setActiveTab('earnings')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'earnings' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400'}`}>Earnings</button>
      </div>

      {activeTab === 'subordinates' ? (
        <PaginatedTable
          tableName="profiles"
          queryModifier={(q) => q.eq('referred_by', profile?.id)}
          pageSize={10}
          emptyMessage="No subordinates yet"
          columns={[
            { key: 'username', label: 'User', render: (r) => <span className="font-bold text-gray-800 uppercase italic text-xs">{r.username.substring(0,3)}****{r.username.slice(-2)}</span> },
            { key: 'created_at', label: 'Joined', render: (r) => <span className="text-[9px] font-bold text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span> },
            { key: 'status', label: 'Status', render: () => <span className="text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">Active</span> }
          ]}
        />
      ) : (
        <PaginatedTable
          tableName="referral_earnings"
          queryModifier={(q) => q.eq('referrer_id', profile?.id)}
          pageSize={10}
          emptyMessage="No earnings yet"
          columns={[
            { key: 'from_type', label: 'Type', render: (r) => <span className="uppercase font-black text-[9px] italic text-gray-600">{r.from_type}</span> },
            { key: 'amount', label: 'Amount', render: (r) => <span className="text-green-600 font-black text-xs">+ ₹{r.amount}</span> },
            { key: 'created_at', label: 'Time', render: (r) => <span className="text-[9px] font-bold text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span> }
          ]}
        />
      )}

      {/* How it works */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><HelpCircle size={18} className="text-red-600" /><h4 className="font-black uppercase italic text-sm text-gray-800">How it works?</h4></div>
        <div className="space-y-4">
          {[
            { step: '01', title: 'Invite Friends', desc: 'Share your referral link or code with your friends.' },
            { step: '02', title: 'Friends Register', desc: 'When they sign up using your code, they become your subordinate.' },
            { step: '03', title: 'Earn Commission', desc: 'Get 10% bonus on their deposits & 5% on their game losses!' },
          ].map((s, i) => (
            <div key={i} className="flex gap-4"><span className="text-xl font-black text-red-100 leading-none">{s.step}</span><div><p className="text-xs font-bold text-gray-800 mb-0.5">{s.title}</p><p className="text-[10px] text-gray-400 font-medium leading-relaxed">{s.desc}</p></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
