import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { addToast } = useGameStore();

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const agent = params.get('agent');
    if (ref || agent) setInviteCode((ref || agent || '').toUpperCase());
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail || email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      addToast('success', 'Password reset link sent to your email');
      setShowForgot(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // 1. Get current bonus setting from DB
        const { data: settings } = await supabase.from('app_settings').select('joining_bonus_amount, joining_bonus_percent, joining_bonus_percent_enabled').single();
        const bonusAmount = settings?.joining_bonus_amount ?? 0;
        const percentEnabled = settings?.joining_bonus_percent_enabled ?? true;
        const bonusPercent = settings?.joining_bonus_percent ?? 10;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              username: username,
              referral_code: inviteCode || null,
              agent_code: inviteCode || null,
              joining_bonus: bonusAmount
            } 
          }
        });

        if (authError) throw authError;
        if (authData.user) {
          let msg = '';
          if (bonusAmount > 0 && percentEnabled && bonusPercent > 0) {
            msg = `Welcome! ₹${bonusAmount} + ${bonusPercent}% bonus on your first deposit awaits you!`;
          } else if (bonusAmount > 0) {
            msg = `Welcome! ₹${bonusAmount} joining bonus has been added to your account (Locked).`;
          } else if (percentEnabled && bonusPercent > 0) {
            msg = `Welcome! Get a ${bonusPercent}% bonus on your very first deposit!`;
          } else {
            msg = 'Registration successful! Welcome to Big Win.';
          }
          addToast('success', msg);
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;
        addToast('success', 'Welcome back!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-5xl font-black text-white italic tracking-tighter">Big</span>
          <span className="text-3xl font-bold text-red-600 uppercase tracking-widest">Win</span>
        </div>
        <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">Play Big. Win Bigger.</p>
      </div>

      <div className="w-full max-w-sm bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
        
        <div className="flex rounded-2xl overflow-hidden mb-8 bg-gray-800 p-1 border border-gray-700/50">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
              mode === 'login' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
              mode === 'register' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose profile name"
                required
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-600 font-bold"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter secure email"
              required
              className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-600 font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-600 font-bold"
            />
          </div>

          {mode === 'login' && (
            <div className="flex justify-end px-1 -mt-2">
              <button
                type="button"
                onClick={() => { setResetEmail(email); setShowForgot(true); }}
                className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">Invite Code (Optional)</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite or agent code"
                className="w-full bg-red-600/5 border-2 border-red-900/20 rounded-2xl px-5 py-3.5 text-red-500 text-sm focus:outline-none focus:border-red-600 transition-all placeholder:text-red-900/30 font-black tracking-widest"
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-[10px] font-black uppercase bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center tracking-tighter">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-red-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-xs"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Secure Login' : 'Create Profile'}
          </button>
        </form>
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
            <h3 className="text-xl font-black italic uppercase text-white mb-2">Reset Password</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6 leading-relaxed">Enter your registered email to receive a secure password reset link.</p>
            
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl px-5 py-3.5 text-white text-sm focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-600 font-bold"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="flex-1 bg-gray-800 text-gray-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
