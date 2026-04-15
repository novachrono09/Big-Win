import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { Wallet, Smartphone, CreditCard, QrCode, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../utils/cn';
import PaginatedTable from './PaginatedTable';

export default function AgentWithdrawalTab() {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchMethods();
    }
  }, [profile?.id]);

  const fetchMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawal_methods')
      .select('*')
      .eq('user_id', profile!.id)
      .order('is_primary', { ascending: false });
    
    if (!error && data) {
      setMethods(data);
      if (data.length > 0) {
        const primary = data.find(m => m.is_primary) || data[0];
        setSelectedMethodId(primary.id);
      }
    }
    setLoading(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = Number(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount < 500) {
      addToast('error', 'Minimum withdrawal is ₹500');
      return;
    }
    
    if (withdrawAmount > (profile?.agent_balance || 0)) {
      addToast('error', 'Insufficient agent balance');
      return;
    }

    if (!selectedMethodId) {
      addToast('error', 'Please select a withdrawal method');
      return;
    }

    const selectedMethod = methods.find(m => m.id === selectedMethodId);
    if (!selectedMethod) return;

    setSubmitting(true);
    try {
      // Pass the actual details to the RPC
      const { data, error } = await supabase.rpc('agent_withdraw', { 
        p_amount: withdrawAmount,
        p_withdrawal_details: selectedMethod.details
      });

      if (error) throw error;
      if (data?.error) {
        addToast('error', data.error);
      } else {
        addToast('success', 'Agent withdrawal request submitted!');
        setAmount('');
        refreshProfile(profile!.id);
      }
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-50 p-2.5 rounded-2xl text-red-600">
            <Wallet size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black italic uppercase text-gray-800">Agent Withdrawal</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Min Withdrawal: ₹500</p>
          </div>
        </div>

        <form onSubmit={handleWithdraw} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-2 block">Enter Amount</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black italic text-gray-300">₹</span>
              <input 
                type="number" 
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-3xl py-5 pl-12 pr-6 text-2xl font-black italic focus:outline-none focus:border-red-500 focus:bg-white transition-all"
              />
            </div>
            <p className="mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">
              Available: <span className="text-red-600">₹{profile?.agent_balance?.toLocaleString() || 0}</span>
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 mb-3 block">Select Method</label>
            {methods.length === 0 ? (
              <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">No methods found</p>
                <p className="text-[9px] font-bold text-orange-600 uppercase tracking-tighter mt-1 mb-4">Add a withdrawal method in your Account settings first.</p>
                <button 
                  type="button"
                  onClick={() => window.location.href = '/account'}
                  className="bg-orange-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase"
                >
                  Go to Account
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {methods.map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all",
                      selectedMethodId === method.id 
                        ? "border-red-500 bg-red-50/30" 
                        : "border-gray-100 bg-white hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        method.type === 'upi' ? 'bg-purple-100 text-purple-600' :
                        method.type === 'bank' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      )}>
                        {method.type === 'upi' ? <Smartphone size={20} /> :
                         method.type === 'bank' ? <CreditCard size={20} /> : <QrCode size={20} />}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-gray-800">{method.type}</p>
                        <p className="text-[11px] font-bold text-gray-500">
                          {method.type === 'upi' ? method.details.upi_id :
                           method.type === 'bank' ? `****${method.details.account_no.slice(-4)}` :
                           'Saved QR Code'}
                        </p>
                      </div>
                    </div>
                    {selectedMethodId === method.id && (
                      <CheckCircle className="text-red-600" size={20} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedMethodId || !amount || Number(amount) < 500}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request Withdrawal'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={80} /></div>
        <h4 className="font-black italic text-lg mb-4 uppercase">Important Info</h4>
        <ul className="space-y-3 relative z-10">
          <li className="flex items-start gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1"></div>
            Agent withdrawals are processed within 24 hours.
          </li>
          <li className="flex items-start gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1"></div>
            Minimum amount is ₹500. No maximum limit.
          </li>
          <li className="flex items-start gap-3 text-[9px] font-black uppercase tracking-widest text-gray-400">
            <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1"></div>
            Amount will be sent to your selected method.
          </li>
        </ul>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-black italic uppercase text-gray-800 flex items-center gap-2">
          <div className="w-2 h-8 bg-gray-900 rounded-full"></div>
          Withdrawal History
        </h3>
        <PaginatedTable 
          tableName="transactions"
          queryModifier={(q) => q.eq('user_id', profile?.id).eq('type', 'agent_withdrawal')}
          pageSize={5}
          initialDateFilter="all"
          columns={[
            { key: 'created_at', label: 'Date', render: (r) => <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span> },
            { key: 'amount', label: 'Amount', render: (r) => <span className="font-black text-red-600">₹{Math.abs(r.amount).toLocaleString()}</span> },
            { key: 'details', label: 'Method', render: (r) => (
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {r.details?.upi_id ? 'UPI' : r.details?.account_no ? 'BANK' : 'QR'}
              </span>
            )},
            { key: 'status', label: 'Status', render: (r) => (
              <span className={cn(
                "text-[8px] font-black uppercase px-2 py-1 rounded-full border",
                r.status === 'completed' ? "bg-green-50 text-green-600 border-green-100" :
                r.status === 'pending' ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                "bg-red-50 text-red-600 border-red-100"
              )}>
                {r.status}
              </span>
            )}
          ]}
        />
      </div>
    </div>
  );
}
