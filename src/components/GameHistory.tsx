import { useGameStore, GameResult } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import PaginatedTable from './PaginatedTable';

function ColorDot({ color }: { color: GameResult['color'] }) {
  if (color === 'red-violet') {
    return (
      <div className="flex gap-0.5 items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
      </div>
    );
  }
  if (color === 'green-violet') {
    return (
      <div className="flex gap-0.5 items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
      </div>
    );
  }
  const colorMap = { green: 'bg-green-500', red: 'bg-red-500', violet: 'bg-violet-500' };
  return <span className={`w-3 h-3 rounded-full ${colorMap[color as 'green' | 'red' | 'violet']} inline-block`} />;
}

function NumberBall({ number, color }: { number: number; color: GameResult['color'] }) {
  let textColor = 'text-red-500';
  if (color === 'green' || color === 'green-violet') textColor = 'text-green-500';
  if (color === 'violet') textColor = 'text-violet-500';
  return <span className={`font-black text-sm ${textColor}`}>{number}</span>;
}

export default function GameHistory() {
  const { historyTab, setHistoryTab, activeSession, sessions } = useGameStore();
  const { profile } = useAuthStore();
  const refreshTrigger = sessions[activeSession]?.history[0]?.period || '';

  const gameColumns = [
    { key: 'period', label: 'Period', render: (r: any) => <span className="font-mono font-bold text-[10px]">{r.period}</span> },
    { key: 'number', label: 'Num', render: (r: any) => <NumberBall number={r.number} color={r.color} /> },
    { key: 'big_small', label: 'Size', render: (r: any) => <span className="text-[10px] font-black uppercase text-gray-600">{r.big_small}</span> },
    { key: 'color', label: 'Color', render: (r: any) => <ColorDot color={r.color} /> }
  ];

  const myColumns = [
    { key: 'period', label: 'Period', render: (r: any) => <span className="font-mono font-bold text-[10px]">{r.period}</span> },
    { key: 'value', label: 'Bet', render: (r: any) => <span className="capitalize font-black text-gray-700 text-[10px]">{r.value}</span> },
    { key: 'amount', label: 'Amt', render: (r: any) => <span className="font-black text-gray-900 text-[10px]">₹{r.amount}</span> },
    { key: 'won', label: 'Result', render: (r: any) => (
      <div className="text-right">
        {r.won === null ? <span className="text-[9px] font-black text-yellow-500">Pending</span> : 
         r.won ? <span className="text-[9px] font-black text-green-600">+₹{r.payout}</span> : 
         <span className="text-[9px] font-black text-red-500">Lost</span>}
      </div>
    )}
  ];

  return (
    <div className="mx-3 mt-4 mb-4 rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 bg-white">
      <div className="flex bg-gray-50 p-1">
        {[
          { id: 'game', label: 'Game History' },
          { id: 'chart', label: 'Chart' },
          { id: 'my', label: 'My Bets' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setHistoryTab(t.id as any)}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${
              historyTab === t.id ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-2">
        {historyTab === 'game' && (
          <PaginatedTable
            key={`game-${activeSession}`}
            tableName="games"
            queryModifier={(q) => q.eq('session_type', activeSession)}
            columns={gameColumns}
            pageSize={10}
            emptyMessage="No results yet"
            refreshTrigger={refreshTrigger}
          />
        )}

        {historyTab === 'chart' && (
          <div className="py-10 text-center text-gray-400 font-bold italic text-xs uppercase tracking-widest">
            Visual chart coming soon
          </div>
        )}

        {historyTab === 'my' && (
          <PaginatedTable
            key={`my-${activeSession}`}
            tableName="bets"
            queryModifier={(q) => q.eq('user_id', profile?.id).eq('session_type', activeSession)}
            columns={myColumns}
            pageSize={10}
            emptyMessage="No bets placed yet"
            refreshTrigger={refreshTrigger}
          />
        )}
      </div>
    </div>
  );
}
