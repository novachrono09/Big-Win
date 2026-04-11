import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore, GameResult } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '../utils/cn';

interface ResultOverlayProps {
  won: boolean;
  amount: number;
  result: GameResult;
  onClose: () => void;
}

function ballGradient(num: number): string {
  if (num === 0) return 'from-red-400 to-violet-500';
  if (num === 5) return 'from-green-400 to-violet-500';
  if ([1, 3, 7, 9].includes(num)) return 'from-green-400 to-green-600';
  return 'from-red-400 to-red-600';
}

function ResultOverlay({ won, amount, result, onClose }: ResultOverlayProps) {
  useEffect(() => {
    if (won) {
      const config = {
        spread: 70,
        startVelocity: 30,
        elementCount: 40,
        dragFriction: 0.12,
        duration: 3000,
        colors: ['#FFD700', '#26cc00', '#FFFFFF']
      };

      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: config.colors
      });
      
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: config.colors
      });
    }

    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [won, onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="bg-gray-900 w-full max-w-sm rounded-[3rem] p-8 text-center relative overflow-hidden border border-white/5 shadow-2xl"
      >
        {/* Glow Effect */}
        <div className={cn(
          "absolute -top-20 -left-20 w-64 h-64 blur-[100px] opacity-20 rounded-full",
          won ? "bg-green-500" : "bg-red-500"
        )} />

        <div className="relative z-10">
          <motion.div 
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className={cn(
              "w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl",
              won ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {won ? <Trophy size={40} strokeWidth={2.5} /> : <X size={40} strokeWidth={2.5} />}
          </motion.div>

          <h2 className={cn(
            "text-4xl font-black italic uppercase tracking-tighter mb-2",
            won ? "text-green-400" : "text-red-500"
          )}>
            {won ? "Victory!" : "Try Again"}
          </h2>
          
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8">
            Period: {result.period}
          </p>

          <div className="bg-white/5 rounded-[2rem] p-6 mb-8 border border-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-around mb-6">
              <div className="text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Number</p>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl font-black text-white shadow-xl border-2 border-white/20",
                    ballGradient(result.number)
                  )}
                >
                  {result.number}
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Size</p>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-xs font-black text-white border-2 border-white/5 shadow-xl"
                >
                  {result.big_small.toUpperCase()}
                </motion.div>
              </div>
            </div>

            <div className="h-px bg-white/5 w-full mb-6" />

            {won ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-1">Your Payout</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">
                  +₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-1">Net Loss</p>
                <p className="text-4xl font-black text-white italic tracking-tighter">
                  -₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </motion.div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-5 rounded-2xl bg-gray-800 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-gray-700 transition-all border border-white/5 shadow-xl"
          >
            Continue Playing
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ResultAnnouncement() {
  const { lastRoundResult, clearLastRoundResult } = useGameStore();

  return (
    <AnimatePresence>
      {lastRoundResult && (
        <ResultOverlay
          won={lastRoundResult.won}
          amount={lastRoundResult.amount}
          result={lastRoundResult.result}
          onClose={clearLastRoundResult}
        />
      )}
    </AnimatePresence>
  );
}
