import { useGameStore } from '../store/gameStore';

export default function CurrentBets() {
  const { activeSession, sessions } = useGameStore();
  const session = sessions[activeSession];
  const bets = session.currentBets;

  if (bets.length === 0) return null;

  const totalAmount = bets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="mx-3 mt-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-700 text-sm font-bold">Your Bets This Round</span>
          </div>
          <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 font-medium">
            {bets.length} bet{bets.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {bets.map(bet => (
            <div key={bet.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                {/* Color/type indicator */}
                <div className={`w-3 h-3 rounded-full ${
                  bet.value === 'green' ? 'bg-green-500' :
                  bet.value === 'violet' ? 'bg-violet-500' :
                  bet.value === 'red' ? 'bg-red-500' :
                  bet.value === 'big' ? 'bg-amber-400' :
                  bet.value === 'small' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-gray-700 text-sm font-semibold capitalize">
                  {bet.type === 'number' ? `Number ${bet.value}` : String(bet.value)}
                </span>
                <span className="text-gray-400 text-xs">×{bet.multiplier}X</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-800 text-sm">₹{bet.amount}</span>
                <span className="text-gray-400 text-xs ml-1">→ up to ₹{(bet.amount * bet.multiplier).toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 text-xs font-medium">Total at stake</span>
          <span className="font-black text-red-600">₹{totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
