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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
      style={{
        animation:
          "feedbackFadeIn 0.15s ease-out forwards, feedbackFadeOut 0.3s 0.85s ease-in forwards",
      }}
    >
      <div className={`absolute inset-0 ${isSuccess ? "bg-emerald-500" : "bg-red-500"}`} />
      <div
        className={`
          flex items-center justify-center rounded-full shadow-2xl
          ${isSuccess ? "bg-white text-emerald-500" : "bg-white text-red-500"}
          w-28 h-28
        `}
        style={{
          animation: "feedbackPop 0.4s 0.05s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
          opacity: 0,
          transform: "scale(0)",
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
