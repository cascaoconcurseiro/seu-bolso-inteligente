import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { create } from "zustand";

type FeedbackType = "success" | "error" | null;

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

export function showActionFeedback(type: "success" | "error") {
  useFeedbackStore.getState().show(type);
}

const DURATION = 1200;

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

  const isSuccess = type === "success";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      {/* Background fade */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          isSuccess ? "bg-emerald-500/10" : "bg-red-500/10"
        }`}
      />
      {/* Icon with scale animation */}
      <div
        className={`
          flex items-center justify-center rounded-full shadow-2xl
          animate-feedback-pop
          ${isSuccess ? "bg-emerald-500 text-white w-28 h-28" : "bg-red-500 text-white w-28 h-28"}
        `}
        style={{
          animation:
            "feedbackPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, feedbackFade 0.3s 0.8s ease-out forwards",
        }}
      >
        {isSuccess ? (
          <Check className="w-14 h-14" strokeWidth={3} />
        ) : (
          <X className="w-14 h-14" strokeWidth={3} />
        )}
      </div>
    </div>
  );
}
