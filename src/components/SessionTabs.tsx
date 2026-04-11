import { SESSION_ORDER, SESSION_CONFIGS, SessionType, useGameStore } from '../store/gameStore';

export default function SessionTabs() {
  const { activeSession, setActiveSession, sessions } = useGameStore();

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex max-w-lg mx-auto overflow-x-auto scrollbar-hide">
        {SESSION_ORDER.map((s: SessionType) => {
          const cfg = SESSION_CONFIGS[s];
          const isActive = activeSession === s;
          const session = sessions[s];
          const isUrgent = session.timeLeft <= 10 && session.timeLeft > 0;

          return (
            <button
              key={s}
              onClick={() => setActiveSession(s)}
              className={`relative flex-1 min-w-[60px] py-2.5 px-1 text-center transition-all border-b-2 group ${
                isActive
                  ? 'border-red-500 bg-red-50'
                  : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
              }`}
            >
              {/* Active tab pill background */}
              {isActive && (
                <div className="absolute inset-x-1 inset-y-1 bg-red-50 rounded-lg -z-10" />
              )}

              <div className={`text-[10px] font-semibold leading-tight mb-0.5 ${isActive ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                Win Go
              </div>
              <div className={`text-xs font-black ${isActive ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                {cfg.shortLabel}
              </div>

              {/* Urgency dot */}
              {isUrgent && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
