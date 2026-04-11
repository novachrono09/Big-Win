import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { Lock, X, CheckCircle } from 'lucide-react';

interface ResetPasswordModalProps {
  onClose: () => void;
}

export default function ResetPasswordModal({ onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useGameStore();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      addToast('error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      addToast('success', 'Your password has been updated! You can now login.');
      onClose();
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Animated accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-4 border border-red-600/30">
            <Lock className="text-red-600" size={32} strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">Set New Password</h3>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Secure your account now</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-700"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white/5 border-2 border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <>
                Save New Password <CheckCircle size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
