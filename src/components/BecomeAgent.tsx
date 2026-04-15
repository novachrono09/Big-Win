import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { ChevronRight, Award, TrendingUp, Users, ShieldCheck, Loader2, Clock, Send, MapPin, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

export default function BecomeAgent() {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<'none' | 'pending' | 'rejected' | 'approved'>('none');
  const [rejectionData, setRejectionData] = useState<{ date: string, reason: string, canReapplyAt: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    whatsapp: '',
    telegram: '',
    city: '',
    expected_players: '',
    notes: ''
  });

  useEffect(() => {
    if (profile?.id) {
      checkApplicationStatus();
      // Prefill whatsapp if phone exists
      setFormData(prev => ({
        ...prev,
        whatsapp: prev.whatsapp || profile.phone || ''
      }));
    }
  }, [profile?.id]);

  const checkApplicationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_applications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setStatus(data.status);
        if (data.status === 'rejected') {
          const reviewedAt = new Date(data.reviewed_at || data.applied_at);
          const canReapplyAt = new Date(reviewedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          setRejectionData({
            date: reviewedAt.toLocaleDateString(),
            reason: data.notes || 'No reason provided',
            canReapplyAt: canReapplyAt.toLocaleDateString()
          });
          
          // Prefill form with old data for re-applying
          setFormData({
            whatsapp: data.whatsapp || '',
            telegram: data.telegram || '',
            city: data.city || '',
            expected_players: data.expected_players || '',
            notes: ''
          });
        }
      } else {
        setStatus('none');
      }
    } catch (err) {
      console.error('Error checking application status:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Validation
    if (!formData.telegram.startsWith('@')) {
      addToast('error', 'Telegram username must start with @');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('apply_for_agent', {
        p_whatsapp: formData.whatsapp,
        p_telegram: formData.telegram,
        p_city: formData.city,
        p_expected: formData.expected_players,
        p_notes: formData.notes
      });

      if (error) throw error;
      
      if (data?.success === false) {
        addToast('error', data.message);
      } else {
        setStatus('pending');
        addToast('success', 'Application submitted successfully!');
      }
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-4" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checking status...</p>
      </div>
    );
  }

  if (profile?.is_agent || status === 'approved') {
    return (
      <div className="p-8 text-center bg-gray-100 flex-1 min-h-[80vh] flex flex-col items-center justify-center">
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 w-full max-w-sm">
          <div className="bg-red-100 w-20 h-20 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
            <Award size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 italic">You are an Agent!</h2>
          <p className="text-gray-500 mb-8 text-[10px] font-bold uppercase tracking-widest text-center">Your network management portal is active.</p>
          <button 
            onClick={() => window.location.href = '/agent'}
            className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
          >
            Enter Agent Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 pb-24">
      <div className="bg-red-600 p-8 pt-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black italic tracking-tighter mb-2">BECOME AN AGENT</h1>
          <p className="text-red-100 text-xs font-black uppercase tracking-[0.2em] opacity-80 text-wrap max-w-[250px]">Join our network and earn top-tier commissions.</p>
        </div>
      </div>

      <div className="p-6 -mt-6 relative z-20">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-8">
          
          {status === 'pending' && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-[2rem] p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Clock size={32} />
              </div>
              <h3 className="text-yellow-800 font-black uppercase tracking-widest text-sm mb-2">Application Pending</h3>
              <p className="text-yellow-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Your application is already under review. We will contact you on Telegram shortly.
              </p>
            </div>
          )}

          {status === 'rejected' && rejectionData && (
            <div className="bg-red-50 border-2 border-red-200 rounded-[2rem] p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-red-800 font-black uppercase tracking-widest text-sm mb-1">Application Rejected</h3>
                <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">On {rejectionData.date}</p>
              </div>
              <div className="bg-white/50 p-4 rounded-2xl border border-red-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Reason</p>
                <p className="text-xs font-bold text-gray-700 italic">"{rejectionData.reason}"</p>
              </div>
              <p className="text-[10px] font-black text-red-900 uppercase tracking-widest pt-2">
                You can reapply after {rejectionData.canReapplyAt}
              </p>
              <button 
                onClick={() => setStatus('none')}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Update and Reapply
              </button>
            </div>
          )}

          {status === 'none' && (
            <form onSubmit={handleApply} className="space-y-5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="Enter your phone"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Telegram Username</label>
                <div className="relative">
                  <Send className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.telegram}
                    onChange={e => setFormData({...formData, telegram: e.target.value})}
                    placeholder="@username"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expected Monthly Players</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <select
                    required
                    value={formData.expected_players}
                    onChange={e => setFormData({...formData, expected_players: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-red-500 transition-all appearance-none"
                  >
                    <option value="">Select expected players</option>
                    <option value="1-10">1-10 Players</option>
                    <option value="10-50">10-50 Players</option>
                    <option value="50-200">50-200 Players</option>
                    <option value="200+">200+ Players</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    Submit Application
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-50">
            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-gray-50 border border-gray-100">
              <div className="bg-red-100 p-3 rounded-2xl text-red-600 shadow-sm">
                <Award size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Starter Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Get 1.5% commission on all turnover from your direct players.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-blue-50 border border-blue-100">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Pro Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Reach 5L turnover to unlock 2.0% commission.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-yellow-50 border border-yellow-100">
              <div className="bg-yellow-100 p-3 rounded-2xl text-yellow-600 shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Elite Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Reach 25L turnover to unlock 2.5% maximum commission.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
