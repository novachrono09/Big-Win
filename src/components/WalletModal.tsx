import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { QRCodeSVG } from 'qrcode.react';
import { Lock, Info, CheckCircle2 } from 'lucide-react';

export default function WalletModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history' | 'promo'>('deposit');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  
  // New deposit flow state
  const [depositStep, setDepositStep] = useState<'amount' | 'pay'>('amount');
  const [utr, setUtr] = useState('');
  const [upiId, setUpiId] = useState('yourupi@oksbi');
  const [promoSettings, setPromoSettings] = useState({ fixed: 0, percentEnabled: false, percent: 0 });

  useEffect(() => {
    if (tab === 'history') fetchHistory();
    if (tab === 'deposit') {
      fetchSettings();
      setDepositStep('amount');
    }
    if (tab === 'withdraw') {
      fetchWithdrawalMethods();
    }
  }, [tab]);

  const fetchWithdrawalMethods = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('withdrawal_methods')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_primary', { ascending: false });
    if (data) {
      setWithdrawalMethods(data);
      if (data.length > 0) setSelectedMethodId(data[0].id);
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setTransactions(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('app_settings').select('upi_id, joining_bonus_amount, joining_bonus_percent_enabled, joining_bonus_percent').single();
    if (data) {
      if (data.upi_id) setUpiId(data.upi_id);
      setPromoSettings({ 
        fixed: data.joining_bonus_amount || 0, 
        percentEnabled: data.joining_bonus_percent_enabled ?? false, 
        percent: data.joining_bonus_percent || 0 
      });
    }
  };

  const handleWithdrawal = async () => {
    if (!profile?.id) return;
    if (amount > (profile?.winnings_balance || profile?.winnings || 0)) {
      addToast('error', 'Amount exceeds withdrawable winnings');
      return;
    }
    if (amount < 200) {
      addToast('error', 'Minimum withdrawal is ₹200');
      return;
    }
    if (!selectedMethodId) {
      addToast('error', 'Please select a withdrawal method');
      return;
    }

    setLoading(true);
    try {
      const method = withdrawalMethods.find(m => m.id === selectedMethodId);
      
      const { data, error } = await supabase.rpc('request_withdrawal', {
        p_user_id: profile.id,
        p_amount: amount,
        p_method_id: method.id,
        p_method_details: method.details
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      addToast('success', `Withdrawal of ₹${amount} requested!`);
      await refreshProfile(profile.id);
      setTab('history');
    } catch (err: any) {
      addToast('error', err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!profile?.id) return;
    if (utr.length < 12) {
      addToast('error', 'Please enter a valid 12-digit UTR number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('submit_deposit_request', {
        p_user_id: profile.id,
        p_amount: amount,
        p_utr: utr
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      addToast('success', 'Deposit submitted! Pending approval.');
      setTab('history');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  const upiUri = `upi://pay?pa=${upiId}&pn=Big%20Win&am=${amount}&cu=INR`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-md rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-lg italic uppercase">Financial Hub</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="bg-black/20 p-2.5 rounded-xl border border-white/10 text-center shadow-inner">
              <p className="text-[8px] font-black text-red-200 uppercase tracking-widest mb-0.5">Deposits</p>
              <p className="text-white text-sm font-black">₹{Number(profile?.deposit_balance || profile?.deposited || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-yellow-500/20 p-2.5 rounded-xl border border-yellow-500/30 text-center shadow-inner">
              <p className="text-[8px] font-black text-yellow-200 uppercase tracking-widest mb-0.5">Bonuses</p>
              <p className="text-yellow-400 text-sm font-black">₹{Number(profile?.bonus_balance || profile?.joining_bonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-green-500/20 p-2.5 rounded-xl border border-green-500/30 text-center shadow-inner">
              <p className="text-[8px] font-black text-green-200 uppercase tracking-widest mb-0.5">Winnings</p>
              <p className="text-green-400 text-sm font-black">₹{Number(profile?.winnings_balance || profile?.winnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20 flex items-center gap-2">
              <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest">Total Usable:</span>
              <span className="text-white font-black text-xs">₹{Number(profile?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {profile?.bonus_locked && (promoSettings.fixed > 0 || (promoSettings.percentEnabled && promoSettings.percent > 0)) && (
              <span className="bg-yellow-400 text-yellow-900 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                <Lock size={8} /> PENDING BONUS
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 p-1 m-4 rounded-xl overflow-x-auto scrollbar-hide">
          {(['deposit', 'withdraw', 'history', 'promo'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-[80px] py-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                tab === t ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 flex-1 overflow-y-auto">
          {/* Locked Bonus Info */}
          {profile?.bonus_locked && (promoSettings.fixed > 0 || (promoSettings.percentEnabled && promoSettings.percent > 0)) && (
            <div className="mb-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-start gap-3 relative z-10">
                <div className="bg-yellow-500 text-white p-2 rounded-xl shadow-lg shadow-yellow-500/20">
                  <Lock size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-yellow-600 font-black text-xs uppercase tracking-tight">
                    {promoSettings.fixed > 0 && promoSettings.percentEnabled && promoSettings.percent > 0 
                      ? `Welcome Bonus: ₹${promoSettings.fixed} + ${promoSettings.percent}%`
                      : promoSettings.fixed > 0 
                        ? `Joining Bonus: ₹${promoSettings.fixed}`
                        : `First Deposit Bonus: ${promoSettings.percent}%`
                    }
                  </p>
                  <p className="text-gray-500 text-[10px] font-bold mt-0.5 leading-tight italic">Deposit once to unlock this bonus and add it to your main balance!</p>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 text-yellow-500/10 rotate-12">
                <Lock size={80} />
              </div>
            </div>
          )}

          {tab === 'deposit' && depositStep === 'amount' && (
            <div className="space-y-6">
              <div>
                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 block text-center">Select Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 500, 1000, 2000, 5000, 10000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-3 rounded-xl text-sm font-black border transition-all ${
                        amount === val ? 'bg-red-600/20 border-red-500 text-red-500 scale-105 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">₹</span>
                <input
                  type="number"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 pl-8 pr-4 text-white font-black text-xl focus:border-red-500 transition-colors outline-none"
                />
              </div>

              <button
                onClick={() => setDepositStep('pay')}
                disabled={amount < 100}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-lg"
              >
                PROCEED TO PAY
              </button>
            </div>
          )}

          {tab === 'deposit' && depositStep === 'pay' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <button onClick={() => setDepositStep('amount')} className="text-gray-500 text-xs font-bold uppercase tracking-tighter hover:text-red-500 transition-colors flex items-center gap-1">
                &larr; Modify Amount
              </button>
              
              <div className="bg-white p-6 rounded-3xl text-center space-y-4 shadow-2xl">
                <div className="bg-gray-50 p-4 rounded-2xl inline-block mx-auto border-2 border-dashed border-gray-200">
                  <QRCodeSVG value={upiUri} size={160} level="H" />
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Transfer Amount</p>
                  <p className="text-gray-900 font-black text-2xl italic">₹{amount.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase mb-1">UPI ID</p>
                  <p className="text-sm font-black text-red-600 select-all">{upiId}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block text-center">Step 2: Enter Transaction UTR</label>
                <input
                  type="text"
                  value={utr}
                  onChange={e => setUtr(e.target.value)}
                  placeholder="Enter 12-digit Ref Number"
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 px-4 text-white text-center font-black tracking-widest focus:border-green-500 transition-colors outline-none"
                  maxLength={15}
                />
              </div>

              <button
                onClick={handleSubmitDeposit}
                disabled={loading || utr.length < 12}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95"
              >
                {loading ? 'Submitting...' : 'CONFIRM PAYMENT'}
              </button>
            </div>
          )}

          {tab === 'withdraw' && (
            <div className="space-y-6">
              <div>
                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2 block text-center">Withdrawal Method</label>
                {withdrawalMethods.length === 0 ? (
                  <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-4 text-center">
                    <p className="text-red-400 text-xs font-bold mb-2">No methods saved</p>
                    <p className="text-gray-500 text-[10px] uppercase">Please add a method in Account Settings</p>
                  </div>
                ) : (
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-3 px-4 text-white text-sm font-bold focus:outline-none focus:border-red-500 appearance-none"
                  >
                    {withdrawalMethods.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.type === 'upi' ? `UPI • ${m.details.upi_id}` :
                         m.type === 'bank' ? `Bank • ****${m.details.account_no.slice(-4)}` :
                         'QR Code Image'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1 block text-center">Amount to Withdraw</label>
                <p className="text-green-500 text-[9px] font-black uppercase tracking-widest mb-3 text-center">Max Withdrawable: ₹{Number(profile?.winnings || 0).toLocaleString()}</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[200, 500, 1000, 5000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        amount === val ? 'bg-red-600/20 border-red-500 text-red-500 scale-105 shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black">₹</span>
                  <input
                    type="number"
                    value={amount || ''}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 pl-8 pr-4 text-white font-black text-xl focus:border-red-500 transition-colors outline-none"
                  />
                </div>
              </div>
              
              <button
                onClick={handleWithdrawal}
                disabled={loading || amount < 200 || withdrawalMethods.length === 0}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl transition-all"
              >
                {loading ? 'Processing...' : 'WITHDRAW NOW'}
              </button>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 && <p className="text-gray-500 text-center py-8 font-bold italic">No history found</p>}
              {transactions.map(tx => (
                <div key={tx.id} className="bg-gray-800/50 border border-gray-800 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                      tx.type === 'deposit' ? 'bg-green-500/20 text-green-500' :
                      tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-500' :
                      tx.type === 'bonus' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-yellow-500/20 text-yellow-500'
                    }`}>
                      {tx.type[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-xs font-black uppercase italic">{tx.type}</p>
                      <p className="text-gray-500 text-[9px] font-bold">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-green-500' : 'text-red-500'}`}>
                      ₹{Number(tx.amount).toLocaleString()}
                    </p>
                    <p className={`text-[9px] font-black uppercase tracking-tighter ${tx.status === 'completed' ? 'text-green-600' : 'text-orange-500'}`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'promo' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-600 to-red-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-xl font-black italic uppercase">First Deposit Bonus</h4>
                  <p className="text-[10px] font-bold text-red-200 mb-4 tracking-widest uppercase">Get extra 10% on deposits above ₹500</p>
                  <span className="bg-white text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Active Now</span>
                </div>
              </div>
              <div className="bg-gray-800 p-6 rounded-[2rem] border border-gray-700">
                <h4 className="text-white font-black italic uppercase mb-1">Daily Login Bonus</h4>
                <p className="text-gray-400 text-xs font-medium">Coming soon... Stay tuned for daily rewards!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
