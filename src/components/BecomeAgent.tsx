import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { motion } from 'framer-motion';
import { ChevronRight, Award, TrendingUp, Users, ShieldCheck, Loader2, Clock } from 'lucide-react';

export default function BecomeAgent() {
  const { profile, refreshProfile } = useAuthStore();
  const { addToast } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      checkApplicationStatus();
    }
  }, [profile?.id]);

  const checkApplicationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_applications')
        .select('status')
        .eq('user_id', profile!.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (data) {
        setApplied(true);
      }
    } catch (err) {
      console.error('Error checking application status:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleApply = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('apply_for_agent');
      if (error) throw error;
      if (data?.error) {
        addToast('error', data.error);
      } else {
        setApplied(true);
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

  if (profile?.is_agent) {
    return (
      <div className="p-8 text-center bg-gray-100 flex-1">
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100">
          <div className="bg-red-100 w-20 h-20 rounded-3xl flex items-center justify-center text-red-600 mx-auto mb-6">
            <Award size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 italic">You are an Agent!</h2>
          <p className="text-gray-500 mb-8 text-[10px] font-bold uppercase tracking-widest">Your network management portal is active.</p>
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
          <p className="text-red-100 text-xs font-black uppercase tracking-[0.2em] opacity-80">Earn passive income with the Big Win Network.</p>
        </div>
      </div>

      <div className="p-6 -mt-6 relative z-20">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-gray-50 border border-gray-100">
              <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                <Award size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Starter Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Get 1.5% commission on all turnover from your direct players.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-gray-50 border border-gray-100">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Pro Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Reach 5L turnover to unlock 2.0% commission.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-gray-50 border border-gray-100">
              <div className="bg-yellow-100 p-3 rounded-2xl text-yellow-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Elite Tier</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Reach 25L turnover to unlock 2.5% maximum commission.</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            {applied ? (
              <div className="bg-green-50 border-2 border-green-200 rounded-[2rem] p-8 text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} />
                </div>
                <h3 className="text-green-800 font-black uppercase tracking-widest text-sm mb-2">Application Pending</h3>
                <p className="text-green-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Our team is currently reviewing your request.<br />We'll notify you via dashboard once approved.</p>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : (
                  <>
                    Apply to Become Agent
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-gray-950 rounded-[2rem] p-8 text-white overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Users size={80} />
            </div>
            <h3 className="font-black italic text-lg mb-4">Why join us?</h3>
            <ul className="space-y-4 relative z-10">
              <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                Instant Commission Crediting
              </li>
              <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                Sub-Agent Multi-Level Earnings
              </li>
              <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                Real-time Network Dashboard
              </li>
              <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                Direct Support for Elite Agents
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
