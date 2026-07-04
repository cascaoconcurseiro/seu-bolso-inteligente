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

// Manifesto de design: transições de interações comuns ficam abaixo de 500ms.
// O antigo wash de tela cheia (900ms) foi aposentado; o check pop central
// mantém a energia da confirmação sem sequestrar a tela.
const DURATION = 480;

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
          "feedbackFadeIn 0.1s ease-out forwards, feedbackFadeOut 0.16s 0.32s ease-in forwards",
      }}
      aria-live="polite"
    >
      <div
        className={`
          flex items-center justify-center rounded-full shadow-lg
          ${isSuccess ? "bg-positive text-white" : "bg-negative text-white"}
          w-16 h-16
        `}
        style={{
          animation: "feedbackPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          opacity: 0,
          transform: "scale(0.6)",
        }}
      >
        {isSuccess ? (
          <Check className="w-8 h-8" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <X className="w-8 h-8" strokeWidth={2.5} aria-hidden="true" />
        )}
        <span className="sr-only">{isSuccess ? "Salvo" : "Erro ao salvar"}</span>
      </div>
    </div>
  );
}
