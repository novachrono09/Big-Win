import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionType = '30s' | '1min' | '3min' | '5min' | '10min';

export interface SessionConfig {
  label: string;
  shortLabel: string;
  durationSeconds: number;
  suffix: string;
}

export const SESSION_CONFIGS: Record<SessionType, SessionConfig> = {
  '30s':   { label: 'Big WinGo 30S',   shortLabel: '30S',   durationSeconds: 30,  suffix: '30s'  },
  '1min':  { label: 'Big WinGo 1Min',  shortLabel: '1Min',  durationSeconds: 60,  suffix: '1m'   },
  '3min':  { label: 'Big WinGo 3Min',  shortLabel: '3Min',  durationSeconds: 180, suffix: '3m'   },
  '5min':  { label: 'Big WinGo 5Min',  shortLabel: '5Min',  durationSeconds: 300, suffix: '5m'   },
  '10min': { label: 'Big WinGo 10Min', shortLabel: '10Min', durationSeconds: 600, suffix: '10m'  },
};

export const SESSION_ORDER: SessionType[] = ['30s', '1min', '3min', '5min', '10min'];

export type BetType = 'color' | 'number' | 'size';
export type ColorValue = 'green' | 'violet' | 'red';
export type SizeValue = 'big' | 'small';

export interface Bet {
  id: string;
  user_id: string;
  type: BetType;
  value: ColorValue | SizeValue | number;
  amount: number;
  multiplier: number;
  session_type: SessionType;
  period: string;
  won?: boolean;
  payout?: number;
  result?: number;
}

export interface GameResult {
  period: string;
  number: number;
  color: ColorValue | 'red-violet' | 'green-violet';
  big_small: 'Big' | 'Small';
  session_type: SessionType;
  timestamp: number;
}

export interface SessionState {
  sessionType: SessionType;
  period: string;
  timeLeft: number;
  isAcceptingBets: boolean;
  isResolving: boolean;
  history: GameResult[];
  currentBets: Bet[];
  lastResult: GameResult | null;
}

export interface User {
  id: string;
  username: string;
  balance: number;
  deposit_balance: number;
  winnings_balance: number;
  bonus_balance: number;
  deposited: number;
  winnings: number;
  is_admin?: boolean;
  joining_bonus: number;
  bonus_locked: boolean;
  has_deposited: boolean;
}

// ─── Pure Game Logic ──────────────────────────────────────────────────────────

export function getColorForNumber(num: number): ColorValue | 'red-violet' | 'green-violet' {
  if (num === 0) return 'red-violet';
  if (num === 5) return 'green-violet';
  if ([1, 3, 7, 9].includes(num)) return 'green';
  return 'red';
}

export function getSizeForNumber(num: number): 'Big' | 'Small' {
  return num >= 5 ? 'Big' : 'Small';
}

export function getMultiplierForBet(type: BetType, value: ColorValue | SizeValue | number): number {
  if (type === 'number') return 9;
  if (type === 'color') {
    if (value === 'violet') return 4.5;
    return 2;
  }
  return 2;
}

export function calculateWin(bet: Bet, resultNumber: number): number {
  const color = getColorForNumber(resultNumber);
  const size = getSizeForNumber(resultNumber);
  
  if (bet.type === 'number') {
    if (Number(bet.value) === resultNumber) return bet.amount * 9;
    return 0;
  }
  
  if (bet.type === 'color') {
    if (bet.value === 'green') {
      if (color === 'green' || color === 'green-violet') return bet.amount * 2;
    }
    if (bet.value === 'red') {
      if (color === 'red' || color === 'red-violet') return bet.amount * 2;
    }
    if (bet.value === 'violet') {
      if (color === 'red-violet' || color === 'green-violet') return bet.amount * 4.5;
    }
    return 0;
  }
  
  if (bet.type === 'size') {
    if (bet.value === 'big' && size === 'Big') return bet.amount * 2;
    if (bet.value === 'small' && size === 'Small') return bet.amount * 2;
    return 0;
  }
  
  return 0;
}

export function generatePeriod(sessionType: SessionType, counter: number): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const paddedCounter = String(counter).padStart(5, '0');

  const prefixes: Record<SessionType, string> = {
    '30s': '30s', '1min': '01', '3min': '03', '5min': '05', '10min': '10',
  };

  return `${dateStr}${prefixes[sessionType]}${paddedCounter}`;
}

// ─── Zustand Store ────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'win' | 'loss' | 'info';
  message: string;
}

interface GameStore {
  user: User | null;
  syncUser: (user: User | null) => void;
  syncUserBalance: (balance: number) => void;

  activeSession: SessionType;
  setActiveSession: (s: SessionType) => void;

  sessions: Record<SessionType, SessionState>;
  counters: Record<SessionType, number>;
  selectedBet: { type: BetType; value: ColorValue | SizeValue | number } | null;
  selectedMultiplier: number;
  isPlacingBet: boolean;
  setSelectedBet: (bet: { type: BetType; value: ColorValue | SizeValue | number } | null) => void;
  setSelectedMultiplier: (m: number) => void;
  placeBet: (amount: number) => Promise<void>;
  randomBet: () => void;

  historyTab: 'game' | 'chart' | 'my';
  setHistoryTab: (t: 'game' | 'chart' | 'my') => void;

  myBets: Bet[];
  lastRoundResult: {
    session: SessionType;
    won: boolean;
    amount: number;
    result: GameResult;
  } | null;
  clearLastRoundResult: () => void;

  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], message: string) => void;
  removeToast: (id: string) => void;

  resolvingPeriods: Record<string, boolean>;
  lastToastKey: string;

  fetchInitialHistory: () => Promise<void>;
  fetchHistoryForSession: (st: SessionType) => Promise<void>;
  resyncTimers: () => void;
  tick: () => Promise<void>;
}

function makeInitialSession(sessionType: SessionType, counter: number): SessionState {
  const { durationSeconds } = SESSION_CONFIGS[sessionType];
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const timeLeft = durationSeconds - (nowInSeconds % durationSeconds);

  return {
    sessionType,
    period: generatePeriod(sessionType, counter),
    timeLeft,
    isAcceptingBets: timeLeft > 5,
    isResolving: false,
    history: [],
    currentBets: [],
    lastResult: null,
  };
}

function getInitialCounter(sessionType: SessionType): number {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const elapsedSeconds = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
  return Math.floor(elapsedSeconds / SESSION_CONFIGS[sessionType].durationSeconds) + 1;
}

const INITIAL_COUNTERS: Record<SessionType, number> = {
  '30s': getInitialCounter('30s'),
  '1min': getInitialCounter('1min'),
  '3min': getInitialCounter('3min'),
  '5min': getInitialCounter('5min'),
  '10min': getInitialCounter('10min'),
};

export const useGameStore = create<GameStore>((set, get) => ({
  user: null,
  syncUser: (user) => set({ user }),
  syncUserBalance: (balance) => {
    set(s => ({ user: s.user ? { ...s.user, balance } : null }));
  },

  activeSession: '1min',
  setActiveSession: (s) => set({ activeSession: s }),

  sessions: {
    '30s':   { ...makeInitialSession('30s',   INITIAL_COUNTERS['30s']),   history: [] },
    '1min':  { ...makeInitialSession('1min',  INITIAL_COUNTERS['1min']),  history: [] },
    '3min':  { ...makeInitialSession('3min',  INITIAL_COUNTERS['3min']),  history: [] },
    '5min':  { ...makeInitialSession('5min',  INITIAL_COUNTERS['5min']),  history: [] },
    '10min': { ...makeInitialSession('10min', INITIAL_COUNTERS['10min']), history: [] },
  },

  counters: INITIAL_COUNTERS,

  fetchHistoryForSession: async (st: SessionType) => {
    if (get().sessions[st].isResolving) return;

    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('session_type', st)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data && data.length > 0) {
      if (data[0].period !== get().sessions[st].history[0]?.period) {
        set(state => ({
          sessions: {
            ...state.sessions,
            [st]: { ...state.sessions[st], history: data, lastResult: data[0] }
          }
        }));
      }
    }
  },

  fetchInitialHistory: async () => {
    for (const st of SESSION_ORDER) {
      const { data } = await supabase
        .from('games')
        .select('*')
        .eq('session_type', st)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data && data.length > 0) {
        set(state => ({
          sessions: {
            ...state.sessions,
            [st]: { ...state.sessions[st], history: data }
          }
        }));
      }
    }
  },

  selectedBet: null,
  selectedMultiplier: 1,
  isPlacingBet: false,
  setSelectedBet: (bet) => set({ selectedBet: bet }),
  setSelectedMultiplier: (m) => set({ selectedMultiplier: m }),

  async placeBet(amount) {
    const { user, selectedBet, activeSession, sessions, selectedMultiplier, isPlacingBet } = get();
    if (!user) { get().addToast('error', 'Please login first'); return; }
    if (!selectedBet) { get().addToast('error', 'Please select a bet option'); return; }
    if (isPlacingBet) { get().addToast('info', 'Processing bet, please wait...'); return; }

    const session = sessions[activeSession];
    if (!session.isAcceptingBets) {
      get().addToast('error', 'Betting is closed for this round');
      return;
    }

    const totalAmount = amount * selectedMultiplier;
    if (user.balance < totalAmount) {
      get().addToast('error', 'Insufficient balance');
      return;
    }

    set({ isPlacingBet: true });

    try {
      const betData = {
        user_id: user.id,
        type: selectedBet.type,
        value: String(selectedBet.value),
        amount: totalAmount,
        session_type: activeSession,
        period: session.period,
      };

      const { data: insertedBet, error } = await supabase
        .from('bets')
        .insert([betData])
        .select()
        .single();

      if (error) {
        get().addToast('error', 'Failed to place bet: ' + error.message);
        return;
      }

      const { data: edgeData, error: edgeError } = await supabase.rpc('update_user_balance', {
        p_user_id: user.id,
        p_amount: -totalAmount,
        p_reason: 'bet',
        p_details: { period: session.period, session: activeSession, bet_id: insertedBet.id }
      });

      if (edgeError || edgeData?.error) {
        await supabase.from('bets').delete().eq('id', insertedBet.id);
        get().addToast('error', edgeData?.error || edgeError?.message || 'Failed to deduct balance for bet');
        return;
      }

      const newBalance = edgeData.balance;

      set(s => ({
        user: { ...s.user!, balance: newBalance },
        sessions: {
          ...s.sessions,
          [activeSession]: {
            ...s.sessions[activeSession],
            currentBets: [...s.sessions[activeSession].currentBets, { ...insertedBet, value: selectedBet.value }],
          },
        },
      }));

      get().addToast('success', `Bet placed: ₹${totalAmount.toLocaleString()} on ${String(selectedBet.value).toUpperCase()}`);
    } finally {
      set({ isPlacingBet: false });
    }
  },

  randomBet() {
    const types: Array<{ type: BetType; value: ColorValue | SizeValue | number }> = [
      { type: 'color', value: 'green' }, { type: 'color', value: 'red' }, { type: 'color', value: 'violet' },
      { type: 'size', value: 'big' }, { type: 'size', value: 'small' },
      ...Array.from({ length: 10 }, (_, i) => ({ type: 'number' as BetType, value: i })),
    ];
    set({ selectedBet: types[Math.floor(Math.random() * types.length)] });
  },

  historyTab: 'game',
  setHistoryTab: (t) => set({ historyTab: t }),

  myBets: [],
  lastRoundResult: null,
  clearLastRoundResult: () => set({ lastRoundResult: null }),

  toasts: [],
  addToast(type, message) {
    const id = `toast_${Date.now()}_${Math.random()}`;
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },

  resolvingPeriods: {},
  lastToastKey: '',

  resyncTimers: () => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const elapsedSecondsTotal = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);

    set(state => {
      const updatedSessions = { ...state.sessions };
      const updatedCounters = { ...state.counters };
      let hasChanges = false;

      for (const st of SESSION_ORDER) {
        const { durationSeconds } = SESSION_CONFIGS[st];
        const correctCounter = Math.floor(elapsedSecondsTotal / durationSeconds) + 1;
        const correctTimeLeft = durationSeconds - (elapsedSecondsTotal % durationSeconds);

        if (state.counters[st] !== correctCounter || state.sessions[st].timeLeft !== correctTimeLeft) {
          hasChanges = true;
          updatedCounters[st] = correctCounter;
          updatedSessions[st] = {
            ...updatedSessions[st],
            period: generatePeriod(st, correctCounter),
            timeLeft: correctTimeLeft,
            isAcceptingBets: correctTimeLeft > 5,
          };
        }
      }
      return hasChanges ? { sessions: updatedSessions, counters: updatedCounters } : state;
    });
  },

  async tick() {
    const state = get();
    const updatedSessions = { ...state.sessions };
    const sessionsToResolve: SessionType[] = [];

    for (const st of SESSION_ORDER) {
      const session = { ...updatedSessions[st] };
      const { durationSeconds } = SESSION_CONFIGS[st];
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const elapsedSeconds = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
      const correctCounter = Math.floor(elapsedSeconds / durationSeconds) + 1;
      const correctTimeLeft = durationSeconds - (elapsedSeconds % durationSeconds);

      if (state.counters[st] === correctCounter) {
        session.timeLeft = correctTimeLeft;
        if (session.timeLeft <= 5) session.isAcceptingBets = false;
        
        if (session.timeLeft > 0 && session.timeLeft < 15 && session.timeLeft % 5 === 0) {
          get().fetchHistoryForSession(st).then();
        }

        if (session.timeLeft <= 0 && !session.isResolving) {
          sessionsToResolve.push(st);
          session.isResolving = true;
        }
      } else if (!session.isResolving) {
        sessionsToResolve.push(st);
        session.isResolving = true;
        session.timeLeft = 0;
      }

      updatedSessions[st] = session;
    }

    set({ sessions: updatedSessions });

    for (const st of sessionsToResolve) {
      const session = updatedSessions[st];
      const resolveKey = `${st}-${session.period}`;

      if ((get().resolvingPeriods || {})[resolveKey]) continue;
      set(s => ({ resolvingPeriods: {...(s.resolvingPeriods || {}), [resolveKey]: true } }));

      try {
        const fetchPromise = supabase
          .from('forced_results')
          .select('*')
          .eq('session_type', st)
          .eq('period', session.period)
          .limit(1);
          
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 10000));
        const { data: forcedData } = (await Promise.race([fetchPromise, timeoutPromise])) as any;
        const forced = forcedData && forcedData.length > 0 ? forcedData[0] : null;

        let resultNumber: number;
        let resultColor: string;
        let resultBigSmall: string;

        if (forced) {
          resultNumber = forced.number;
          resultColor = forced.color;
          resultBigSmall = forced.big_small;
          supabase.from('forced_results').delete().eq('id', forced.id).then();
        } else {
          // Fetch settings to check Low Traffic Protection
          const { data: settings } = await supabase.from('app_settings').select('low_traffic_mode, low_traffic_threshold').eq('id', 1).single();
          const lowTrafficMode = settings?.low_traffic_mode ?? true;
          const lowTrafficThreshold = settings?.low_traffic_threshold ?? 1500;

          const { data: allBets } = await supabase
            .from('bets')
            .select('type, value, amount')
            .eq('session_type', st)
            .eq('period', session.period)
            .is('won', null);

          let totals: any = { green: 0, violet: 0, red: 0, big: 0, small: 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
          let totalBetAmountInRound = 0;

          if (allBets) {
            allBets.forEach(bet => {
              const val = String(bet.value).toLowerCase();
              if (totals[val] !== undefined) totals[val] += Number(bet.amount);
              totalBetAmountInRound += Number(bet.amount);
            });
          }

          let lowestPayout = Infinity;
          let bestNumbers: number[] = [];

          // CORE HOUSE LOGIC (100% UNCHANGED)
          for (let num = 0; num <= 9; num++) {
            let currentPayout = 0;
            const numColor = getColorForNumber(num);
            const numSize = getSizeForNumber(num);
            currentPayout += (totals[String(num)] || 0) * 9;
            if (numSize === 'Big') currentPayout += (totals['big'] || 0) * 2;
            else currentPayout += (totals['small'] || 0) * 2;
            if (numColor === 'green' || numColor === 'green-violet') currentPayout += (totals['green'] || 0) * 2;
            if (numColor === 'red' || numColor === 'red-violet') currentPayout += (totals['red'] || 0) * 2;
            if (numColor === 'red-violet' || numColor === 'green-violet') currentPayout += (totals['violet'] || 0) * 4.5;

            if (currentPayout < lowestPayout) { lowestPayout = currentPayout; bestNumbers = [num]; }
            else if (currentPayout === lowestPayout) { bestNumbers.push(num); }
          }

          // LOW TRAFFIC PROTECTION: only applies when total bets < threshold
          let finalBestNumbers = bestNumbers;
          
          if (lowTrafficMode && totalBetAmountInRound > 0 && totalBetAmountInRound < lowTrafficThreshold) {
             // NEVER choose a completely zero-bet outcome.
             // Find all numbers that have at least one bet on them.
             const numbersWithBets: number[] = [];
             for (let num = 0; num <= 9; num++) {
               const numColor = getColorForNumber(num);
               const numSize = getSizeForNumber(num);
               const hasBet = (totals[String(num)] > 0) || 
                              (totals[numSize.toLowerCase()] > 0) || 
                              (totals[numColor.replace('-violet', '')] > 0) || 
                              (totals['violet'] > 0 && numColor.includes('violet'));
               if (hasBet) numbersWithBets.push(num);
             }

             if (numbersWithBets.length > 0) {
               // Among numbers with bets, find the one with the lowest payout to minimize house loss
               let lowestPayoutWithBet = Infinity;
               let bestNumbersWithBet: number[] = [];

               for (const num of numbersWithBets) {
                 let currentPayout = 0;
                 const numColor = getColorForNumber(num);
                 const numSize = getSizeForNumber(num);
                 currentPayout += (totals[String(num)] || 0) * 9;
                 if (numSize === 'Big') currentPayout += (totals['big'] || 0) * 2;
                 else currentPayout += (totals['small'] || 0) * 2;
                 if (numColor === 'green' || numColor === 'green-violet') currentPayout += (totals['green'] || 0) * 2;
                 if (numColor === 'red' || numColor === 'red-violet') currentPayout += (totals['red'] || 0) * 2;
                 if (numColor === 'red-violet' || numColor === 'green-violet') currentPayout += (totals['violet'] || 0) * 4.5;

                 if (currentPayout < lowestPayoutWithBet) { 
                   lowestPayoutWithBet = currentPayout; 
                   bestNumbersWithBet = [num]; 
                 } else if (currentPayout === lowestPayoutWithBet) { 
                   bestNumbersWithBet.push(num); 
                 }
               }
               finalBestNumbers = bestNumbersWithBet;
             }
          }

          resultNumber = finalBestNumbers[Math.floor(Math.random() * finalBestNumbers.length)];
          resultColor = getColorForNumber(resultNumber);
          resultBigSmall = getSizeForNumber(resultNumber);
        }

        const candidate = { period: session.period, number: resultNumber, color: resultColor, big_small: resultBigSmall, session_type: st };
        await supabase.from('games').insert([candidate]).then(() => {}, () => {});

        let official: any = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          const { data } = await supabase.from('games').select('number, color, big_small').eq('session_type', st).eq('period', session.period).maybeSingle();
          if (data) { official = data; break; }
          await new Promise(r => setTimeout(r, 80 * (attempt + 1)));
        }

        if (!official) throw new Error('Official result missing');

        const finalResultNumber = official.number;
        const resultObj: GameResult = {
          period: session.period,
          number: finalResultNumber,
          color: official.color as any,
          big_small: official.big_small as any,
          session_type: st,
          timestamp: Date.now(),
        };

        const resolvedBetsForDb = session.currentBets.map(bet => {
          const payout = calculateWin(bet, finalResultNumber);
          return { id: bet.id, won: payout > 0, payout: Number(payout.toFixed(2)), result: finalResultNumber };
        });

        if (resolvedBetsForDb.length > 0) {
          await Promise.all(resolvedBetsForDb.map(rb => supabase.from('bets').update({ won: rb.won, payout: rb.payout, result: rb.result }).eq('id', rb.id)));
        }

        let totalWin = 0, totalLoss = 0, totalAmountBet = 0;
        for (const bet of session.currentBets) {
          totalAmountBet += bet.amount;
          const payout = calculateWin(bet, finalResultNumber);
          if (payout > 0) totalWin += payout;
          else totalLoss += bet.amount;
        }

        const netPayout = totalWin - totalAmountBet;
        const hadBetInSession = session.currentBets.length > 0;

        if (totalWin > 0 && get().user) {
          await supabase.rpc('update_user_balance', { p_user_id: get().user!.id, p_amount: totalWin, p_reason: 'win', p_details: { period: session.period, session: st, official_result: finalResultNumber } });
        }
        
        if (totalLoss > 0 && get().user) {
          supabase.rpc('process_loss_referral_bonus', { p_user_id: get().user!.id, p_loss_amount: totalLoss }).then();
        }
        
        let lossBonusEarned = 0;
        if (netPayout < 0 && get().user) {
          const { data: bonusData } = await supabase.rpc('process_round_loss_bonus', { p_user_id: get().user!.id, p_net_loss: Math.abs(netPayout), p_period: session.period });
          if (bonusData) lossBonusEarned = Number(bonusData);
        }

        set(curr => {
          const newMyBets = [...curr.myBets];
          for (const bet of session.currentBets) {
            const payout = calculateWin(bet, finalResultNumber);
            newMyBets.unshift({ ...bet, result: finalResultNumber, won: payout > 0, payout });
          }

          if (hadBetInSession) {
            const lastToastKey = `${resolveKey}-${finalResultNumber}`;
            if (curr.lastToastKey !== lastToastKey) {
              if (netPayout > 0) {
                get().addToast('win', `🎉 You won ₹${Math.abs(netPayout).toLocaleString()}! Result: ${finalResultNumber}`);
              } else if (netPayout < 0) {
                if (lossBonusEarned > 0) {
                  get().addToast('loss', `You lost ₹${Math.abs(netPayout).toLocaleString()} → Received ₹${lossBonusEarned} Loss Bonus!`);
                } else {
                  get().addToast('loss', `You lost ₹${Math.abs(netPayout).toLocaleString()}. Result: ${finalResultNumber}`);
                }
              } else {
                get().addToast('info', `Push. Result: ${finalResultNumber}`);
              }
            }
          }

          const { durationSeconds } = SESSION_CONFIGS[st];
          const now = new Date(), startOfDay = new Date(now);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const elapsedSeconds = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
          const correctCounter = Math.floor(elapsedSeconds / durationSeconds) + 1;
          const correctTimeLeft = durationSeconds - (elapsedSeconds % durationSeconds);

          return {
            ...curr,
            myBets: newMyBets,
            lastRoundResult: hadBetInSession ? { session: st, won: netPayout > 0, amount: Math.abs(netPayout), result: resultObj } : curr.lastRoundResult,
            lastToastKey: hadBetInSession ? `${resolveKey}-${finalResultNumber}` : curr.lastToastKey,
            sessions: {
              ...curr.sessions,
              [st]: {
                ...curr.sessions[st],
                period: generatePeriod(st, correctCounter),
                timeLeft: correctTimeLeft,
                isAcceptingBets: correctTimeLeft > 5,
                isResolving: false,
                currentBets: [],
                lastResult: resultObj,
                history: [resultObj, ...curr.sessions[st].history].slice(0, 50),
              }
            },
            counters: { ...curr.counters, [st]: correctCounter },
            resolvingPeriods: { ...(curr.resolvingPeriods || {}), [resolveKey]: false }
          };
        });

      } catch (err) {
        console.error('Error resolving round:', st, err);
        set(curr => {
          const { durationSeconds } = SESSION_CONFIGS[st];
          const now = new Date(), startOfDay = new Date(now);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const elapsedSeconds = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
          const correctCounter = Math.floor(elapsedSeconds / durationSeconds) + 1;
          const correctTimeLeft = durationSeconds - (elapsedSeconds % durationSeconds);
          return {
            ...curr,
            sessions: { ...curr.sessions, [st]: { ...curr.sessions[st], period: generatePeriod(st, correctCounter), timeLeft: correctTimeLeft, isAcceptingBets: correctTimeLeft > 5, isResolving: false, currentBets: [] } },
            counters: { ...curr.counters, [st]: correctCounter },
            resolvingPeriods: { ...(curr.resolvingPeriods || {}), [resolveKey]: false }
          };
        });
      }
    }
  },
}));

let lastTickTime = 0;
let rafId: number | null = null;

export function startGameTick() {
  if (rafId) return;
  const loop = (timestamp: number) => {
    if (timestamp - lastTickTime >= 1000) {
      lastTickTime = timestamp;
      useGameStore.getState().tick().then();
    }
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

export function stopGameTick() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
