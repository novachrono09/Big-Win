import React from 'react';
import { Play, Lock } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface GamesHubProps {
  onPlayWingo: () => void;
}

export default function GamesHub({ onPlayWingo }: GamesHubProps) {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-2"
      >
        <h2 className="text-2xl font-black italic uppercase tracking-tight text-gray-800">Games Hub</h2>
        <p className="text-gray-500 text-xs font-black uppercase tracking-widest opacity-60">Play Big. Win Bigger.</p>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        {/* Big WinGo Card */}
        <motion.button 
          variants={item}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPlayWingo}
          className="relative bg-gradient-to-br from-red-600 to-red-900 h-44 rounded-[2.5rem] overflow-hidden shadow-xl shadow-red-900/20 group text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all" />
          <div className="p-6 h-full flex flex-col justify-between relative z-10">
            <div>
              <span className="bg-white/20 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/20">
                Hot 🔥
              </span>
            </div>
            <div>
              <h3 className="text-white font-black text-2xl italic tracking-tighter mb-1">Big WinGo</h3>
              <p className="text-red-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Play className="w-3 h-3 fill-current" /> Play Now
              </p>
            </div>
          </div>
        </motion.button>

        {/* Aviator Placeholder */}
        <motion.div 
          variants={item}
          className="relative bg-gray-900 h-44 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-900/20 text-left border border-gray-800"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-16 h-1 bg-red-500 rotate-45 transform -translate-y-4" />
            <div className="w-16 h-1 bg-white -rotate-45 transform translate-y-4 -translate-x-8" />
          </div>
          <div className="p-6 h-full flex flex-col justify-between relative z-20">
            <div className="flex justify-end">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-gray-400 font-black text-xl italic tracking-tighter">Aviator</h3>
              <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Coming Soon</p>
            </div>
          </div>
        </motion.div>

        {/* Mines Placeholder */}
        <motion.div 
          variants={item}
          className="relative bg-gray-900 h-44 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-900/20 text-left border border-gray-800"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
             <div className="grid grid-cols-3 gap-1.5">
                {[...Array(9)].map((_, i) => <div key={i} className="w-3 h-3 bg-white rounded-sm" />)}
             </div>
          </div>
          <div className="p-6 h-full flex flex-col justify-between relative z-20">
            <div className="flex justify-end">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-gray-400 font-black text-xl italic tracking-tighter">Mines</h3>
              <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Coming Soon</p>
            </div>
          </div>
        </motion.div>

        {/* Trx Hash Placeholder */}
        <motion.div 
          variants={item}
          className="relative bg-gray-900 h-44 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-900/20 text-left border border-gray-800"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
          <div className="p-6 h-full flex flex-col justify-between relative z-20">
            <div className="flex justify-end">
              <Lock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-gray-400 font-black text-xl italic tracking-tighter">TRX Hash</h3>
              <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">Coming Soon</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
