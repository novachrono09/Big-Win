import { useGameStore } from '../store/gameStore';

const TYPE_STYLES = {
  success: 'bg-green-600 border-green-500',
  error:   'bg-red-700 border-red-500',
  win:     'bg-yellow-500 border-yellow-400',
  loss:    'bg-gray-700 border-gray-600',
  info:    'bg-blue-600 border-blue-500',
};

const TYPE_ICONS = {
  success: '✅',
  error:   '❌',
  win:     '🎉',
  loss:    '😔',
  info:    'ℹ️',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useGameStore();

  return (
    <div className="fixed top-16 right-2 z-[100] flex flex-col gap-2 max-w-xs pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${TYPE_STYLES[toast.type]} text-white text-xs font-medium px-3 py-2.5 rounded-xl border shadow-2xl flex items-start gap-2 pointer-events-auto animate-slide-in`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="shrink-0 mt-0.5">{TYPE_ICONS[toast.type]}</span>
          <span className="flex-1 leading-relaxed">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
