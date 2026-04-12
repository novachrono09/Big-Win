import { useState, useEffect } from 'react';
import { useGameStore, SESSION_CONFIGS } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

/** Optimized Digit Box - Using hardware-accelerated CSS transitions for smoothness */
function DigitBox({ char }: { char: string }) {
  return (
    <div className="w-9 h-12 bg-white rounded-xl flex items-center justify-center shadow-inner border border-red-100 overflow-hidden relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -15, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }} // Switched to lightweight Ease
          className="text-red-600 font-black text-2xl leading-none absolute"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function formatTime(seconds: number): { mm: string; ss: string } {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return {
    mm: String(m).padStart(2, '0'),
    ss: String(sec).padStart(2, '0'),
  };
}

function ballGradient(num: number): string {
  if (num === 0) return 'from-red-400 to-violet-500';
  if (num === 5) return 'from-green-400 to-violet-500';
  if ([1, 3, 7, 9].includes(num)) return 'from-green-400 to-green-600';
  return 'from-red-400 to-red-600';
}

export default function CountdownPanel() {
  const { activeSession, sessions } = useGameStore();
  const session = sessions[activeSession];
  const cfg = SESSION_CONFIGS[activeSession];
  const totalDuration = cfg.durationSeconds;
  const [isLowTrafficActive, setIsLowTrafficActive] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('low_traffic_mode').eq('id', 1).single().then(({data}) => {
      if (data) setIsLowTrafficActive(data.low_traffic_mode);
    });
  }, []);

  const { mm, ss } = formatTime(session.timeLeft);
  const recentHistory = session.history.slice(0, 5);

  const progress = Math.max(0, Math.min(100, (session.timeLeft / totalDuration) * 100));
  const isUrgent = session.timeLeft <= 10;

  return (
    <div className="mx-3 mt-3">
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-[2rem] shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
        
        {/* Progress bar - Optimized CSS transition */}
        <div className="h-1 bg-black/20 relative">
          <div
            className={`h-full transition-all duration-1000 linear ${isUrgent ? 'bg-yellow-400' : 'bg-white/40'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5 relative z-10">
          <div className="flex flex-col gap-5">
            
            <div className="flex justify-between items-center">
              <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/10">
                <HelpCircle size={10} />
                Rules
              </button>
              {isLowTrafficActive ? (
                <div className="flex items-center gap-1 text-green-300 text-[8px] font-black uppercase tracking-widest bg-green-500/20 px-2 py-1 rounded-md border border-green-500/30">
                  <ShieldCheck size={10} />
                  Low Traffic Mode • Good luck!
                </div>
              ) : (
                <div className="text-white/60 text-[9px] font-black uppercase tracking-widest italic">Live Countdown</div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-white font-black text-xs uppercase tracking-widest mb-1 italic truncate">{cfg.label}</div>
                <div className="bg-black/20 rounded-lg px-2 py-1 inline-block border border-white/5">
                  <span className="text-white/50 font-black text-[8px] uppercase tracking-tighter mr-2 italic">Period</span>
                  <span className="text-white font-mono text-[10px] font-bold tracking-widest">
                    {session.period}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <DigitBox char={mm[0]} />
                <DigitBox char={mm[1]} />
                <div className="flex flex-col gap-1 mx-0.5 opacity-50">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
                <DigitBox char={ss[0]} />
                <DigitBox char={ss[1]} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex gap-1.5 items-center">
                {recentHistory.map((result, i) => (
                  <div
                    key={`${result.period}-${i}`}
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${ballGradient(result.number)} flex items-center justify-center border border-white/20 shadow-md`}
                  >
                    <span className="text-white font-black text-[10px] italic">{result.number}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-400/10 px-3 py-1.5 rounded-xl border border-green-400/20">
                <Zap size={10} className={session.isAcceptingBets ? "fill-current animate-pulse" : ""} />
                {session.isAcceptingBets ? "Live" : "Closed"}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
