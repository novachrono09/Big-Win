import { TabType } from '../App';
import { motion } from 'framer-motion';
import React from 'react';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs: { id: TabType; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: 'wingo',
      label: 'Big WinGo',
      icon: (active) => (
        <svg className={`w-6 h-6 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'all-games',
      label: 'Games',
      icon: (active) => (
        <svg className={`w-6 h-6 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: (active) => (
        <svg className={`w-6 h-6 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'promotion',
      label: 'Refer',
      icon: (active) => (
        <svg className={`w-6 h-6 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      icon: (active) => (
        <svg className={`w-6 h-6 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex justify-around items-center py-2 px-1 z-[60] shadow-[0_-8px_25px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 flex-1 relative py-1 group outline-none"
          >
            <div className="relative z-10">
              {tab.icon(active)}
              {active && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -inset-2 bg-red-50 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest relative z-10 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`}>
              {tab.label}
            </span>
            <motion.div 
              whileTap={{ scale: 0.9 }}
              className="absolute inset-0 z-0"
            />
          </button>
        );
      })}
    </nav>
  );
}
