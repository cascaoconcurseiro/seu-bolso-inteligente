import { useEffect, type MutableRefObject } from "react";
import { useTransactionStore } from "@/store/useTransactionStore";

/**
 * Aplica no formulário a categoria sugerida pela IA, sem sobrescrever uma escolha manual do usuário.
 *
 * Importante: o efeito depende só de valores primitivos (não do objeto `store`, que muda a cada `set`
 * no Zustand). Com `store` nas dependências, cada atualização redisparava o efeito e gerava loop
 * ("Maximum update depth exceeded", React #185).
 */
export function useAutoCategoryFromPrediction(
  predictedCategoryId: string | null,
  lastAppliedCategoryIdRef: MutableRefObject<string | null>
) {
  const categoryId = useTransactionStore((s) => s.categoryId);
  const hasUserSelectedCategoryManually = useTransactionStore(
    (s) => s.hasUserSelectedCategoryManually
  );

  useEffect(() => {
    if (!predictedCategoryId) return;

    const { setCategoryId, setHasUserSelectedCategoryManually } = useTransactionStore.getState();
    const isCurrentCategoryFromAI = categoryId === lastAppliedCategoryIdRef.current;

    if (hasUserSelectedCategoryManually && !isCurrentCategoryFromAI) return;

    if (categoryId !== predictedCategoryId) setCategoryId(predictedCategoryId);
    lastAppliedCategoryIdRef.current = predictedCategoryId;
    if (hasUserSelectedCategoryManually) setHasUserSelectedCategoryManually(false);
  }, [predictedCategoryId, hasUserSelectedCategoryManually, categoryId, lastAppliedCategoryIdRef]);
}
