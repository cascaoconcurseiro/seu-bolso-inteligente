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

// Total visible duration: 900ms (fade-in 120ms + hold ~600ms + fade-out 180ms)
const DURATION = 900;

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
        animation: "feedbackFadeIn 0.12s ease-out forwards, feedbackFadeOut 0.22s 0.68s ease-in forwards",
      }}
    >
      {/* Full-screen color wash wave */}
      <div
        className={`absolute top-1/2 left-1/2 rounded-full ${isSuccess ? "bg-emerald-500" : "bg-red-500"}`}
        style={{
          width: "250vmax",
          height: "250vmax",
          opacity: 0.95,
          animation: "feedbackWave 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      />

      {/* Centered icon pill */}
      <div
        className={`
          relative flex flex-col items-center justify-center gap-3
        `}
        style={{
          animation: "feedbackPop 0.35s 0.04s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          opacity: 0,
          transform: "scale(0.6)",
        }}
      >
        <div
          className={`
            flex items-center justify-center rounded-full
            ${isSuccess ? "bg-white text-emerald-500" : "bg-white text-red-500"}
            w-24 h-24 shadow-2xl
          `}
        >
          {isSuccess ? (
            <Check className="w-12 h-12" strokeWidth={2.5} />
          ) : (
            <X className="w-12 h-12" strokeWidth={2.5} />
          )}
        </div>
        <p
          className="text-white font-semibold text-base tracking-wide"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
        >
          {isSuccess ? "Salvo!" : "Erro ao salvar"}
        </p>
      </div>
    </div>
  );
}
