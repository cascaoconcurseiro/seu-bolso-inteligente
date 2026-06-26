import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { create } from 'zustand';

type FeedbackType = 'success' | 'error' | null;

interface FeedbackStore {
  type: FeedbackType;
  show: (type: FeedbackType) => void;
  hide: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  type: null,
  show: (type) => set({ type }),
  hide: () => set({ type: null }),
}));

export function showActionFeedback(type: 'success' | 'error') {
  useFeedbackStore.getState().show(type);
}

// Duração em ms que o ícone fica visível
const DURATION = 1000;

export function ActionFeedback() {
  const { type, hide } = useFeedbackStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!type) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(hide, DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, hide]);

  if (!type) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      <div
        className={`
          flex items-center justify-center rounded-full shadow-2xl
          animate-feedback-pop
          ${isSuccess
            ? 'bg-emerald-500 text-white w-24 h-24'
            : 'bg-red-500 text-white w-24 h-24'
          }
        `}
      >
        {isSuccess
          ? <Check className="w-12 h-12 stroke-[3]" />
          : <X className="w-12 h-12 stroke-[3]" />
        }
      </div>
    </div>
  );
}
