import { useState, useEffect } from 'react';
import { useGameStore, BetType, ColorValue, SizeValue } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { Wallet, Info, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

const MULTIPLIERS = [1, 5, 10, 20, 50, 100];
const BET_AMOUNTS = [10, 50, 100, 500, 1000];

function ballGradient(num: number): string {
  if (num === 0) return 'from-red-400 to-violet-500';
  if (num === 5) return 'from-green-400 to-violet-500';
  if ([1, 3, 7, 9].includes(num)) return 'from-green-400 to-green-600';
  return 'from-red-400 to-red-600';
}

const RANDOM_OPTIONS: Array<{ type: BetType; value: ColorValue | SizeValue | number }> = [
  { type: 'color', value: 'green' }, { type: 'color', value: 'red' }, { type: 'color', value: 'violet' },
  { type: 'size', value: 'big' }, { type: 'size', value: 'small' },
  ...Array.from({ length: 10 }, (_, i) => ({ type: 'number' as BetType, value: i })),
];

export default function BettingPanel() {
  const { activeSession, sessions, selectedBet, selectedMultiplier, setSelectedBet, setSelectedMultiplier, placeBet, randomBet, addToast } = useGameStore();
  const { profile } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);

  const session = sessions[activeSession];

  const handleBetClick = (type: BetType, value: ColorValue | SizeValue | number) => {
    if (!session.isAcceptingBets) {
      addToast('error', 'Betting is closed for this round');
      return;
    }
    setSelectedBet({ type, value });
    setShowModal(true);
  };

  const handleRandomSpin = () => {
    if (!session.isAcceptingBets || isSpinning) return;
    
    setIsSpinning(true);
    let spins = 0;
    const maxSpins = 15;
    
    const interval = setInterval(() => {
      setSpinIndex(Math.floor(Math.random() * RANDOM_OPTIONS.length));
      spins++;
      
      if (spins >= maxSpins) {
        clearInterval(interval);
        const final = RANDOM_OPTIONS[Math.floor(Math.random() * RANDOM_OPTIONS.length)];
        setSelectedBet(final);
        setIsSpinning(false);
        setTimeout(() => setShowModal(true), 200);
      }
    }, 80);
  };

  const handleConfirm = async (amount: number) => {
    await placeBet(amount);
    setShowModal(false);
  };

  return (
    <div className="p-3 space-y-4">
      {/* Color Selection */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { color: 'green', label: 'Green', bg: 'bg-green-600' },
          { color: 'violet', label: 'Violet', bg: 'bg-violet-600' },
          { color: 'red', label: 'Red', bg: 'bg-red-600' },
        ].map((btn) => (
          <motion.button
            key={btn.color}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleBetClick('color', btn.color as ColorValue)}
            className={`${btn.bg} py-3 rounded-2xl text-white font-black uppercase italic tracking-tighter text-sm shadow-lg shadow-black/20 relative overflow-hidden group`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
            {btn.label}
          </motion.button>
        ))}
      </div>

      {/* Size Selection */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'big', label: 'Big', bg: 'bg-orange-500' },
          { value: 'small', label: 'Small', bg: 'bg-blue-500' },
        ].map((btn) => (
          <motion.button
            key={btn.value}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleBetClick('size', btn.value as SizeValue)}
            className={`${btn.bg} py-3 rounded-2xl text-white font-black uppercase italic tracking-tighter text-sm shadow-lg relative overflow-hidden group`}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
            {btn.label}
          </motion.button>
        ))}
      </div>

      {/* Number Grid */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleBetClick('number', i)}
              className={cn(
                "w-full aspect-square rounded-2xl bg-gradient-to-br flex items-center justify-center border-2 border-white shadow-md relative group",
                ballGradient(i)
              )}
            >
              <span className="text-white font-black text-xl italic drop-shadow-md">{i}</span>
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick Random Bet */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleRandomSpin}
        disabled={isSpinning}
        className={cn(
          "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl border transition-all",
          isSpinning ? "bg-red-600 text-white border-red-500" : "bg-gray-900 text-white border-gray-800"
        )}
      >
        {isSpinning ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            Choosing: {String(RANDOM_OPTIONS[spinIndex].value).toUpperCase()}
          </>
        ) : (
          <>
            <Zap size={14} className="text-yellow-400 fill-current" /> Random Luck
          </>
        )}
      </motion.button>

      {/* Bet Modal */}
      <AnimatePresence>
        {showModal && selectedBet && (
          <BetModal
            label={String(selectedBet.value).toUpperCase()}
            betColor={
              selectedBet.type === 'color' 
                ? (selectedBet.value === 'green' ? 'bg-green-600' : selectedBet.value === 'red' ? 'bg-red-600' : 'bg-violet-600')
                : selectedBet.type === 'size'
                ? (selectedBet.value === 'big' ? 'bg-orange-500' : 'bg-blue-500')
                : cn("bg-gradient-to-br", ballGradient(Number(selectedBet.value)))
            }
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BetModal({ label, betColor, onClose, onConfirm }: { label: string, betColor: string, onClose: () => void, onConfirm: (amt: number) => void }) {
  const { selectedMultiplier, setSelectedMultiplier } = useGameStore();
  const { profile } = useAuthStore();
  const [baseAmount, setBaseAmount] = useState(10);

  const total = baseAmount * selectedMultiplier;
  const canBet = profile && profile.balance >= total;

  const quickAdd = (val: number) => setBaseAmount(prev => prev + val);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm px-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white w-full max-w-lg rounded-t-[3rem] shadow-2xl overflow-hidden pb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className={cn(betColor, "px-8 py-6 flex items-center justify-between relative overflow-hidden")}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
          <div className="relative z-10 text-white">
            <p className="opacity-70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Your Selection</p>
            <h3 className="font-black text-3xl italic tracking-tighter drop-shadow-md">{label}</h3>
          </div>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={onClose} 
            className="bg-white/20 p-2 rounded-full text-white relative z-10 backdrop-blur-sm border border-white/20"
          >
            <CheckCircle2 size={24} />
          </motion.button>
        </div>

        <div className="p-8 space-y-6">
          {/* Amount selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Custom Amount</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 font-bold">Wallet: ₹{profile?.balance?.toLocaleString()}</span>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₹</span>
                <input 
                  type="number" 
                  value={baseAmount || ''} 
                  onChange={e => setBaseAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-8 pr-4 text-gray-900 font-black text-xl focus:border-red-500 transition-all outline-none shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 10, 100, 1000].map(val => (
                  <motion.button
                    key={val}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => quickAdd(val)}
                    className="bg-gray-900 text-white text-[10px] font-black w-12 rounded-xl border border-gray-800 shadow-lg active:bg-red-600 transition-colors"
                  >
                    +{val}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {BET_AMOUNTS.map(amt => (
                <motion.button
                  key={amt}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setBaseAmount(amt)}
                  className={cn(
                    "min-w-[70px] py-2.5 rounded-xl text-xs font-black transition-all border-2",
                    baseAmount === amt ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" : "bg-gray-50 border-gray-100 text-gray-400"
                  )}
                >
                  ₹{amt}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Multiplier selection */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Multiplier</span>
            <div className="grid grid-cols-6 gap-2">
              {MULTIPLIERS.map(m => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMultiplier(m)}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-black transition-all border-2",
                    selectedMultiplier === m ? "bg-gray-900 border-gray-900 text-white shadow-md" : "bg-gray-50 border-gray-100 text-gray-400"
                  )}
                >
                  {m}x
                </motion.button>
              ))}
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between px-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-inner">
              <span className="text-sm font-bold text-gray-500 italic">Total Investment</span>
              <span className="text-2xl font-black text-gray-900 italic tracking-tighter">₹{total.toLocaleString()}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onConfirm(baseAmount)}
              disabled={!canBet || baseAmount <= 0}
              className={cn(
                "w-full py-5 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl transition-all flex items-center justify-center gap-3",
                canBet && baseAmount > 0 ? "bg-red-600 text-white shadow-red-600/30" : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {canBet ? (baseAmount > 0 ? 'Place Prediction' : 'Select Amount') : 'Insufficient Balance'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
