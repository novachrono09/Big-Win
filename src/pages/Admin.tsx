import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { SessionType, useGameStore } from '../store/gameStore';
import { 
  LayoutDashboard, Users, Activity, History, CreditCard, Settings, LogOut, CheckCircle, Wallet, Share2, ClipboardList, MessageSquare, ChevronLeft, Send, X, Award
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../utils/cn';
import PaginatedTable from '../components/PaginatedTable';

export default function AdminPanel() {
  const { profile, signOut } = useAuthStore();
  const { addToast } = useGameStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appSettings, setAppSettings] = useState({ 
    upi_id: '', 
    referral_deposit_bonus_percent: 10, 
    referral_bet_loss_bonus_percent: 5, 
    telegram_support_link: '', 
    joining_bonus_amount: 80,
    low_traffic_mode: true,
    low_traffic_threshold: 1500,
    loss_bonus_percent: 10,
    joining_bonus_percent: 10,
    joining_bonus_percent_enabled: true
  });
  const [agentBonusConfig, setAgentBonusConfig] = useState<{ [key: string]: number }>({});
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBetsToday: 0,
    houseProfit: 0,
    totalRevenue: 0,
    totalReferralPaid: 0
  });
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Support state
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [ticketListKey, setTicketListKey] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('admin_global_tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        setTicketListKey(prev => prev + 1);
        addToast('info', 'New support ticket received!');
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [addToast]);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id);
      const channel = supabase
        .channel(`admin_ticket_${selectedTicket.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ticket_messages', 
          filter: `ticket_id=eq.${selectedTicket.id}` 
        }, (payload) => {
          const msg = payload.new;
          setTicketMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (profile?.is_admin && activeTab === 'dashboard') {
      fetchDashboardStats();
    }
    if (profile?.is_admin && activeTab === 'settings') {
      fetchSettings();
    }
    if (profile?.is_admin && activeTab === 'milestones') {
      fetchAgentBonusConfig();
    }
  }, [profile, activeTab]);

  const fetchAgentBonusConfig = async () => {
    const { data } = await supabase.from('agent_bonus_config').select('*');
    if (data) {
      const config: { [key: string]: number } = {};
      data.forEach(row => {
        config[row.key] = Number(row.value);
      });
      setAgentBonusConfig(config);
    }
  };

  const handleUpdateBonusConfig = async (key: string, currentValue: number) => {
    const newValue = prompt(`Enter new value for ${key}:`, currentValue.toString());
    if (newValue === null) return;
    try {
      const { error } = await supabase.from('agent_bonus_config').update({ value: Number(newValue) }).eq('key', key);
      if (error) throw error;
      addToast('success', 'Config updated');
      fetchAgentBonusConfig();
    } catch (err: any) { addToast('error', err.message); }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: txs } = await supabase.from('transactions')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: allEarnings } = await supabase.from('referral_earnings').select('amount');
      
      let profit = 0, revenue = 0, betsToday = 0;
      const dailyData: any = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        dailyData[label] = 0;
      }

      if (txs) {
        txs.forEach(tx => {
          const dateLabel = new Date(tx.created_at).toLocaleDateString(undefined, { weekday: 'short' });
          const isToday = new Date(tx.created_at).toDateString() === new Date().toDateString();

          if (tx.type === 'bet' && isToday) betsToday++;
          
          if (tx.type === 'loss') {
            profit += Number(tx.amount);
            if (dailyData[dateLabel] !== undefined) dailyData[dateLabel] += Number(tx.amount);
          }
          if (tx.type === 'win') {
            profit -= Number(tx.amount);
            if (dailyData[dateLabel] !== undefined) dailyData[dateLabel] -= Number(tx.amount);
          }
          if (tx.type === 'deposit' && tx.status === 'completed') {
            revenue += Number(tx.amount);
          }
        });
      }

      setStats({
        totalUsers: count || 0,
        totalBetsToday: betsToday,
        houseProfit: profit,
        totalRevenue: revenue,
        totalReferralPaid: allEarnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
      });

      setChartData(Object.keys(dailyData).map(key => ({
        name: key,
        profit: dailyData[key]
      })));

    } catch (err: any) {
      addToast('error', 'Failed to load stats: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (data) setAppSettings({ 
      upi_id: data.upi_id || '',
      referral_deposit_bonus_percent: data.referral_deposit_bonus_percent,
      referral_bet_loss_bonus_percent: data.referral_bet_loss_bonus_percent,
      telegram_support_link: data.telegram_support_link || '',
      joining_bonus_amount: data.joining_bonus_amount ?? 80,
      low_traffic_mode: data.low_traffic_mode ?? true,
      low_traffic_threshold: data.low_traffic_threshold ?? 1500,
      loss_bonus_percent: data.loss_bonus_percent ?? 10,
      joining_bonus_percent: data.joining_bonus_percent ?? 10,
      joining_bonus_percent_enabled: data.joining_bonus_percent_enabled ?? true
    });
  };

  const fetchTicketMessages = async (ticketId: string) => {
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
    if (data) setTicketMessages(data);
  };

  const handleAdminReply = async () => {
    if (!adminReply.trim() || !selectedTicket) return;
    const msgObj = { ticket_id: selectedTicket.id, sender_id: profile.id, message: adminReply };
    try {
      const tempId = 'temp-' + Date.now();
      setTicketMessages(prev => [...prev, { ...msgObj, id: tempId, created_at: new Date().toISOString() }]);
      const { error } = await supabase.from('ticket_messages').insert([msgObj]);
      if (error) throw error;
      await supabase.from('support_tickets').update({ status: 'replied' }).eq('id', selectedTicket.id);
      await supabase.from('user_notifications').insert([{
        user_id: selectedTicket.user_id,
        title: 'Support Update',
        message: `Agent replied to your ticket: ${selectedTicket.subject}`,
        type: 'info'
      }]);
      setAdminReply('');
      addToast('success', 'Reply sent');
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', ticketId);
      if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status: 'closed' });
      addToast('success', 'Ticket closed');
    } catch (e: any) { addToast('error', e.message); }
  };

  const handleProcessWithdrawal = async (txId: string, approve: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_process_withdrawal', { p_transaction_id: txId, p_approve: approve });
      if (error) throw error;
      addToast('success', `Withdrawal ${approve ? 'approved' : 'rejected'}`);
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleProcessDeposit = async (txId: string, approve: boolean) => {
    const reason = approve ? '' : prompt('Reason for rejection:');
    if (!approve && reason === null) return;
    try {
      const { data: tx } = await supabase.from('transactions').select('user_id, amount').eq('id', txId).single();
      const { error } = await supabase.rpc('admin_process_deposit', { p_transaction_id: txId, p_approve: approve, p_reason: reason || null });
      if (error) throw error;

      if (approve && tx) {
        const { data: userProfile } = await supabase.from('profiles').select('has_deposited').eq('id', tx.user_id).single();
        if (userProfile && !userProfile.has_deposited) {
          await supabase.rpc('unlock_joining_bonus', { p_user_id: tx.user_id, p_deposit_amount: tx.amount });
        }
      }

      addToast('success', `Deposit ${approve ? 'approved' : 'rejected'}`);
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase.from('app_settings').update(appSettings).eq('id', 1);
      if (error) throw error;
      addToast('success', 'Settings saved');
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleEditBalance = async (userId: string, currentBalance: number) => {
    const newBal = prompt('Enter new balance:', currentBalance.toString());
    if (!newBal) return;
    try {
      const { error } = await supabase.rpc('admin_edit_balance', { p_target_user_id: userId, p_new_balance: Number(newBal), p_reason: 'Admin Adjustment' });
      if (error) throw error;
      addToast('success', 'Balance updated');
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleApproveAgent = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_approve_agent', { p_user_id: userId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      await supabase.from('user_notifications').insert([{
        user_id: userId,
        title: 'Agent Approved!',
        message: 'Your application to become an agent has been approved. Welcome to the team!',
        type: 'success'
      }]);
      
      addToast('success', 'Agent approved successfully');
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleRejectAgent = async (applicationId: string, userId: string) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await supabase.from('agent_applications').update({ 
        status: 'rejected', 
        reviewed_at: new Date().toISOString() 
      }).eq('id', applicationId);
      
      await supabase.from('user_notifications').insert([{
        user_id: userId,
        title: 'Agent Application',
        message: `Your agent application was rejected. Reason: ${reason || 'None'}`,
        type: 'error'
      }]);
      
      addToast('info', 'Agent application rejected');
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleEditMilestone = async (activePlayers: number, currentBonus: number) => {
    const newBonus = prompt(`Enter new bonus for ${activePlayers} Active Players:`, currentBonus.toString());
    if (!newBonus) return;
    try {
      const { error } = await supabase.from('agent_milestones').update({ bonus_amount: Number(newBonus) }).eq('active_players', activePlayers);
      if (error) throw error;
      addToast('success', 'Milestone updated');
    } catch (err: any) { addToast('error', err.message); }
  };

  const handleForceResult = async (sessionType: SessionType) => {
    const num = prompt(`Force result for ${sessionType}\nNumber (0-9):`);
    if (num === null) return;
    const parsedNum = parseInt(num);
    if (isNaN(parsedNum) || parsedNum < 0 || parsedNum > 9) { addToast('error', 'Invalid number'); return; }
    const color = (parsedNum === 0 || parsedNum === 5) ? (parsedNum === 0 ? 'red-violet' : 'green-violet') : ([1,3,7,9].includes(parsedNum) ? 'green' : 'red');
    const bsChoice = prompt(`Calculated: ${parsedNum >= 5 ? 'Big' : 'Small'}\nEnter B/S to override:`);
    let bigSmall = parsedNum >= 5 ? 'Big' : 'Small';
    if (bsChoice?.toUpperCase() === 'B') bigSmall = 'Big';
    if (bsChoice?.toUpperCase() === 'S') bigSmall = 'Small';
    const sessionData = useGameStore.getState().sessions[sessionType];
    try {
      const { error } = await supabase.rpc('admin_force_result', { 
        p_session_type: sessionType, 
        p_period: sessionData.period, 
        p_number: parsedNum, 
        p_color: color, 
        p_big_small: bigSmall 
      });
      if (error) throw error;
      addToast('success', `Forced next result: ${parsedNum} (${bigSmall})`);
    } catch (err: any) { addToast('error', err.message); }
  };

  if (!profile?.is_admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      <div className="w-64 bg-gray-900 text-white flex flex-col fixed h-full shadow-2xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-gray-800">
          <div className="bg-red-600 text-white font-black text-xl w-10 h-10 flex items-center justify-center rounded-xl shadow-lg">BW</div>
          <span className="font-bold text-xl tracking-tight uppercase italic">Big Win Admin</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'monitor', icon: Activity, label: 'Games Monitor' },
            { id: 'rounds', icon: History, label: 'Game Rounds' },
            { id: 'users', icon: Users, label: 'User Control' },
            { id: 'deposits', icon: Wallet, label: 'Pending Deposits' },
            { id: 'withdrawals', icon: ClipboardList, label: 'Withdrawals' },
            { id: 'agents', icon: Share2, label: 'Agents' },
            { id: 'milestones', icon: Award, label: 'Milestones' },
            { id: 'support', icon: MessageSquare, label: 'Support Tickets' },
            { id: 'referrals', icon: Share2, label: 'Referrals' },
            { id: 'transactions', icon: CreditCard, label: 'Financials' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-red-600 text-white translate-x-2' : 'text-gray-400 hover:bg-gray-800'}`}><item.icon className="w-5 h-5" />{item.label}</button>
          ))}
        </nav>
        <div className="p-6 border-t border-gray-800"><button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-red-600/10 border border-red-600/20 py-3 rounded-xl uppercase"><LogOut className="w-4 h-4" /> Logout</button></div>
      </div>

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-2xl font-black text-gray-800 capitalize italic">{activeTab.replace('-', ' ')}</h1>
          <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-green-200">System Live</span>
        </header>

        <main className="p-8 flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Today\'s Bets', value: stats.totalBetsToday, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'House Profit', value: `₹${stats.houseProfit.toLocaleString()}`, icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: History, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-[1.02]"><div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}><stat.icon className="w-7 h-7" /></div><div><p className="text-gray-400 text-[10px] font-black uppercase tracking-wider">{stat.label}</p><p className="text-2xl font-black text-gray-900">{stat.value}</p></div></div>
                ))}
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 h-[350px]">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="profit" stroke="#DC2626" strokeWidth={5} dot={{r: 6, fill: '#DC2626', stroke: '#fff', strokeWidth: 2}} /></LineChart></ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="grid grid-cols-1 gap-4">
              {(['30s', '1min', '3min', '5min', '10min'] as SessionType[]).map(st => (
                <div key={st} className="bg-white border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-8">
                    <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xl italic">{st.toUpperCase()}</div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Live Period: <span className="text-gray-900">{useGameStore.getState().sessions[st].period}</span></p>
                  </div>
                  <button onClick={() => handleForceResult(st)} className="px-6 py-3 bg-red-600 text-white font-black rounded-xl text-xs uppercase shadow-md">Force Result</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'support' && (
            selectedTicket ? (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[600px] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-4"><button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white rounded-full transition-all shadow-sm border border-gray-100"><ChevronLeft size={20}/></button><div><h3 className="font-black italic uppercase text-gray-800">{selectedTicket.subject}</h3><p className="text-[10px] font-black text-gray-400 uppercase">Category: {selectedTicket.category}</p></div></div>
                  <div className="flex gap-2">{selectedTicket.status !== 'closed' && (<button onClick={() => handleCloseTicket(selectedTicket.id)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Close Ticket</button>)}</div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 p-8 bg-[#E5DDD5] shadow-inner">
                  {ticketMessages.map((m, i) => {
                    const isMe = m.sender_id === profile.id;
                    return (
                      <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                        <div className={cn("max-w-[75%] px-4 py-2 rounded-xl shadow-sm relative text-sm", isMe ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none')}>
                          {!isMe && <p className="text-[8px] font-black uppercase tracking-tight text-red-600 mb-0.5">Customer Message</p>}
                          <p className="font-medium leading-snug">{m.message}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 opacity-50`}><p className="text-[9px] font-bold">{new Date(m.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</p>{isMe && (<div className="flex -space-x-1"><CheckCircle size={10} className="text-blue-500" /><CheckCircle size={10} className="text-blue-500" /></div>)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 bg-[#F0F0F0] flex gap-3 border-t border-gray-200"><div className="flex-1"><input type="text" value={adminReply} onChange={(e) => setAdminReply(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAdminReply()} placeholder="Type official response..." className="w-full bg-white border-none py-3.5 px-6 rounded-full text-sm font-medium focus:ring-0 shadow-sm" /></div><button onClick={handleAdminReply} disabled={!adminReply.trim()} className="bg-[#00A884] hover:bg-[#008F6C] text-white w-12 h-12 rounded-full shadow-md active:scale-90 transition-all flex items-center justify-center"><Send size={20}/></button></div>
              </div>
            ) : (
              <PaginatedTable key={ticketListKey} tableName="support_tickets" pageSize={15} columns={[{ key: 'created_at', label: 'Date', render: (r) => <span className="text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</span> }, { key: 'category', label: 'Category', render: (r) => <span className="uppercase font-black text-[10px] bg-gray-100 px-2 py-1 rounded">{r.category}</span> }, { key: 'subject', label: 'Subject', render: (r) => (<button onClick={() => { setSelectedTicket(r); fetchTicketMessages(r.id); }} className="font-bold text-gray-800 hover:text-red-600 transition-colors uppercase italic">{r.subject}</button>) }, { key: 'status', label: 'Status', render: (r) => (<span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${r.status === 'open' ? 'bg-orange-50 text-orange-600 border-orange-100' : r.status === 'replied' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>{r.status}</span>) }]} />
            )
          )}

          {activeTab === 'rounds' && (
            <PaginatedTable tableName="games" pageSize={15} searchFields={['period', 'session_type']} columns={[{ key: 'period', label: 'Period', render: (r) => <span className="font-mono font-bold">{r.period}</span> }, { key: 'session_type', label: 'Type', render: (r) => <span className="uppercase font-black text-[10px] bg-gray-100 px-2 py-1 rounded">{r.session_type}</span> }, { key: 'number', label: 'Result', render: (r) => <span className="w-6 h-6 flex items-center justify-center bg-red-600 text-white rounded-full font-bold">{r.number}</span> }, { key: 'big_small', label: 'Size', render: (r) => <span className="font-black uppercase text-xs">{r.big_small}</span> }, { key: 'created_at', label: 'Timestamp', render: (r) => <span className="text-gray-400 text-xs">{new Date(r.created_at).toLocaleString()}</span> }]} />
          )}

          {activeTab === 'users' && (
            <PaginatedTable tableName="profiles" pageSize={15} searchFields={['username', 'referral_code']} columns={[
              { key: 'username', label: 'Player', render: (r) => <div className="font-black uppercase italic">{r.username}</div> }, 
              { key: 'balance', label: 'Total', render: (r) => <span className="font-black text-green-600">₹{Number(r.balance).toLocaleString()}</span> }, 
              { key: 'deposited', label: 'Deposited', render: (r) => <span className="font-bold text-gray-500">₹{Number(r.deposit_balance || r.deposited || 0).toLocaleString()}</span> }, 
              { key: 'winnings', label: 'Winnings', render: (r) => <span className="font-bold text-blue-500">₹{Number(r.winnings_balance || r.winnings || 0).toLocaleString()}</span> }, 
              { key: 'bonus_balance', label: 'Bonus', render: (r) => <span className="font-bold text-yellow-600">₹{Number(r.bonus_balance || 0).toLocaleString()}</span> },
              { key: 'is_admin', label: 'Role', render: (r) => <span className={r.is_admin ? "text-red-600 font-bold" : "text-gray-400"}>{r.is_admin ? "ADMIN" : "PLAYER"}</span> }, 
              { key: 'created_at', label: 'Joined', render: (r) => <span className="text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span> }, 
              { key: 'id', label: 'Action', render: (r) => <button onClick={() => handleEditBalance(r.id, r.balance)} className="text-red-600 font-black text-[10px] uppercase bg-red-50 px-3 py-1 rounded-lg">Edit</button> }
            ]} />
          )}

          {activeTab === 'deposits' && (
            <PaginatedTable tableName="transactions" queryModifier={(q) => q.eq('type', 'deposit').eq('status', 'pending')} pageSize={10} searchFields={['utr']} columns={[{ key: 'created_at', label: 'Date', render: (r) => <span>{new Date(r.created_at).toLocaleString()}</span> }, { key: 'utr', label: 'UTR/Ref', render: (r) => <span className="font-mono font-bold">{r.utr}</span> }, { key: 'amount', label: 'Amount', render: (r) => <span className="font-black text-green-600">₹{r.amount}</span> }, { key: 'id', label: 'Action', render: (r) => (<div className="flex gap-2"><button onClick={() => handleProcessDeposit(r.id, true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Approve</button><button onClick={() => handleProcessDeposit(r.id, false)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Reject</button></div>) }]} />
          )}

          {activeTab === 'withdrawals' && (
            <PaginatedTable tableName="transactions" queryModifier={(q) => q.eq('type', 'withdrawal')} pageSize={10} searchFields={['status', 'user_id']} columns={[{ key: 'created_at', label: 'Requested', render: (r) => <span>{new Date(r.created_at).toLocaleString()}</span> }, { key: 'user_id', label: 'User ID', render: (r) => <span className="font-mono text-[10px] text-gray-500">{r.user_id.substring(0, 8)}</span> }, { key: 'amount', label: 'Amount', render: (r) => <span className="font-black text-red-600">₹{Math.abs(r.amount)}</span> }, { key: 'withdrawal_details', label: 'Method Details', render: (r) => (<div className="text-[10px] font-bold text-gray-600 bg-gray-50 p-2 rounded w-48 truncate hover:w-auto hover:absolute hover:z-10 hover:shadow-lg">{r.withdrawal_details?.upi_id && <span>UPI: {r.withdrawal_details.upi_id}</span>}{r.withdrawal_details?.account_no && (<div><p>Bank: {r.withdrawal_details.bank_name}</p><p>A/C: {r.withdrawal_details.account_no}</p><p>IFSC: {r.withdrawal_details.ifsc}</p></div>)}{r.withdrawal_details?.qr_url && (<a href={r.withdrawal_details.qr_url} target="_blank" rel="noreferrer" className="text-blue-500 underline">View QR Image</a>)}{!r.withdrawal_details && <span className="text-gray-400 italic">No details (Old transaction)</span>}</div>) }, { key: 'status', label: 'Status', render: (r) => <span className={`uppercase font-black text-[10px] ${r.status === 'completed' ? 'text-green-500' : r.status === 'pending' ? 'text-yellow-500' : 'text-red-500'}`}>{r.status}</span> }, { key: 'id', label: 'Action', render: (r) => r.status === 'pending' ? (<div className="flex gap-2"><button onClick={() => handleProcessWithdrawal(r.id, true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Approve</button><button onClick={() => handleProcessWithdrawal(r.id, false)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Reject</button></div>) : <span className="text-gray-400 text-[10px] italic">Processed</span> }]} />
          )}

          {activeTab === 'agents' && (
            <div className="space-y-12">
              <section>
                <h3 className="text-lg font-black uppercase italic text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-red-600 rounded-full"></div>
                  Pending Agent Applications
                </h3>
                <PaginatedTable 
                  tableName="agent_applications" 
                  select="*, profiles(username)"
                  queryModifier={(q) => q.eq('status', 'pending')} 
                  initialDateFilter="all"
                  dateField="applied_at"
                  pageSize={10} 
                  columns={[
                    { key: 'applied_at', label: 'Date', render: (r) => <span className="text-xs">{new Date(r.applied_at).toLocaleString()}</span> },
                    { key: 'username', label: 'Applicant', render: (r) => <span className="font-black uppercase italic">{r.profiles?.username || 'User'}</span> },
                    { key: 'user_id', label: 'User ID', render: (r) => <span className="font-mono text-[10px]">{r.user_id.substring(0, 8)}</span> },
                    { key: 'id', label: 'Actions', render: (r) => (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveAgent(r.user_id)} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Approve</button>
                        <button onClick={() => handleRejectAgent(r.id, r.user_id)} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Reject</button>
                      </div>
                    )}
                  ]} 
                />
              </section>

              <section>
                <h3 className="text-lg font-black uppercase italic text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-gray-900 rounded-full"></div>
                  Active Agents List
                </h3>
                <PaginatedTable 
                  tableName="profiles" 
                  queryModifier={(q) => q.eq('is_agent', true)} 
                  initialDateFilter="all"
                  dateField="agent_approved_at"
                  pageSize={10} 
                  columns={[
                    { key: 'agent_code', label: 'Code', render: (r) => <span className="font-black text-red-600 tracking-widest">{r.agent_code}</span> },
                    { key: 'username', label: 'Username', render: (r) => <span className="font-bold uppercase text-gray-900">{r.username}</span> },
                    { key: 'agent_tier', label: 'Tier', render: (r) => <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black uppercase">{r.agent_tier === 3 ? 'ELITE' : r.agent_tier === 2 ? 'PRO' : 'STARTER'}</span> },
                    { key: 'agent_balance', label: 'Wallet', render: (r) => <span className="font-black text-green-600">₹{r.agent_balance?.toLocaleString() || 0}</span> },
                    { key: 'agent_approved_at', label: 'Since', render: (r) => <span className="text-[10px] text-gray-400">{new Date(r.agent_approved_at).toLocaleDateString()}</span> }
                  ]} 
                />
              </section>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-black uppercase italic text-gray-800 mb-6 flex items-center gap-2">
                <div className="w-2 h-8 bg-yellow-500 rounded-full"></div>
                Agent Milestone Config
              </h3>
              <PaginatedTable 
                tableName="agent_milestones"
                pageSize={10}
                initialDateFilter="all"
                dateField="active_players"
                columns={[
                  { key: 'active_players', label: 'Active Players Goal', render: (r) => <span className="font-black text-gray-900">{r.active_players} Players</span> },
                  { key: 'bonus_amount', label: 'Bonus Amount', render: (r) => <span className="font-black text-green-600">₹{r.bonus_amount.toLocaleString()}</span> },
                  { key: 'active_players', label: 'Action', render: (r) => (
                    <button 
                      onClick={() => handleEditMilestone(r.active_players, r.bonus_amount)} 
                      className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm"
                    >
                      Edit Bonus
                    </button>
                  )}
                ]}
              />
              
              <div className="mt-12 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-xl text-red-600">
                    <Users size={20} />
                  </div>
                  <h3 className="text-lg font-black uppercase italic text-gray-800">Extra Bonuses</h3>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase">Per Player Bonus (After 100)</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Bonus paid for every new active player beyond 100</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-red-600">₹{agentBonusConfig['per_player_after_100']?.toLocaleString() || '0'}</span>
                    <button 
                      onClick={() => handleUpdateBonusConfig('per_player_after_100', agentBonusConfig['per_player_after_100'] || 0)}
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300">
                Tip: These bonuses are paid instantly only ONCE per agent when they reach the specific player count.
              </p>
            </div>
          )}

          {activeTab === 'referrals' && (
            <PaginatedTable tableName="referral_earnings" pageSize={15} columns={[{ key: 'created_at', label: 'Date', render: (r) => <span>{new Date(r.created_at).toLocaleDateString()}</span> }, { key: 'from_type', label: 'Source', render: (r) => <span className="uppercase font-black text-[10px]">{r.from_type}</span> }, { key: 'amount', label: 'Commission', render: (r) => <span className="text-green-600 font-black">₹{r.amount}</span> }]} />
          )}

          {activeTab === 'transactions' && (
            <PaginatedTable tableName="transactions" pageSize={15} searchFields={['type', 'status', 'utr']} columns={[{ key: 'created_at', label: 'Timestamp', render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleString()}</span> }, { key: 'type', label: 'Type', render: (r) => <span className="font-black uppercase text-[10px] italic">{r.type}</span> }, { key: 'amount', label: 'Value', render: (r) => <span className="font-black">₹{r.amount}</span> }, { key: 'status', label: 'Status', render: (r) => <span className="uppercase font-black text-[10px]">{r.status}</span> }, { key: 'id', label: 'Action', render: (r) => r.status === 'pending' && r.type === 'withdrawal' ? (<div className="flex gap-2"><button onClick={() => handleProcessWithdrawal(r.id, true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Approve</button><button onClick={() => handleProcessWithdrawal(r.id, false)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">Reject</button></div>) : null }]} />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl bg-white p-8 rounded-[2rem] shadow-sm border space-y-6 mx-auto">
              <h3 className="font-black italic uppercase text-lg border-b pb-4">Global Config</h3>
              <div className="space-y-4">
                
                {/* Low Traffic Protection Box */}
                <div className="bg-red-50/50 border border-red-100 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-red-900 uppercase italic">Low Traffic Protection</h4>
                      <p className="text-[10px] text-red-600 font-bold mt-0.5">Let early players win small amounts to build trust.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={appSettings.low_traffic_mode}
                        onChange={e => setAppSettings({...appSettings, low_traffic_mode: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                  {appSettings.low_traffic_mode && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-red-800/60 mb-1 block">Traffic Threshold (₹)</label>
                      <input 
                        type="number" 
                        value={appSettings.low_traffic_threshold} 
                        onChange={e => setAppSettings({...appSettings, low_traffic_threshold: Number(e.target.value)})} 
                        className="w-full bg-white border border-red-200 p-3 rounded-xl font-black text-red-900 focus:outline-none focus:border-red-500" 
                      />
                    </div>
                  )}
                </div>

                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Deposit UPI ID</label><input type="text" value={appSettings.upi_id} onChange={e => setAppSettings({...appSettings, upi_id: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl font-mono" /></div>
                <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Support Telegram Channel</label><input type="text" value={appSettings.telegram_support_link} onChange={e => setAppSettings({...appSettings, telegram_support_link: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl font-mono" /></div>
                
                <div className="bg-yellow-50/50 border border-yellow-100 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-yellow-900 uppercase italic">First Deposit % Bonus</h4>
                      <p className="text-[10px] text-yellow-600 font-bold mt-0.5">Bonus = Fixed Amount + % of First Deposit</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={appSettings.joining_bonus_percent_enabled}
                        onChange={e => setAppSettings({...appSettings, joining_bonus_percent_enabled: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-yellow-800/60 mb-1 block">Fixed Amount (₹)</label>
                      <input type="number" value={appSettings.joining_bonus_amount} onChange={e => setAppSettings({...appSettings, joining_bonus_amount: Number(e.target.value)})} className="w-full bg-white border border-yellow-200 p-3 rounded-xl font-black text-yellow-900" />
                    </div>
                    {appSettings.joining_bonus_percent_enabled && (
                      <div>
                        <label className="text-[10px] font-black uppercase text-yellow-800/60 mb-1 block">Bonus %</label>
                        <input type="number" value={appSettings.joining_bonus_percent} onChange={e => setAppSettings({...appSettings, joining_bonus_percent: Number(e.target.value)})} className="w-full bg-white border border-yellow-200 p-3 rounded-xl font-black text-red-600" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Ref Deposit %</label><input type="number" value={appSettings.referral_deposit_bonus_percent} onChange={e => setAppSettings({...appSettings, referral_deposit_bonus_percent: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl font-black" /></div>
                  <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Ref Loss %</label><input type="number" value={appSettings.referral_bet_loss_bonus_percent} onChange={e => setAppSettings({...appSettings, referral_bet_loss_bonus_percent: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl font-black" /></div>
                  <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Loss Bonus %</label><input type="number" value={appSettings.loss_bonus_percent} onChange={e => setAppSettings({...appSettings, loss_bonus_percent: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl font-black" /></div>
                </div>
                <button onClick={handleSaveSettings} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] shadow-lg">Save Changes</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
