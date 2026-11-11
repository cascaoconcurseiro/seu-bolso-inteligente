import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useTransactionStore } from "@/store/useTransactionStore";
import { useAutoCategoryFromPrediction } from "./useAutoCategoryFromPrediction";

function useHarness(predicted: string | null) {
  const lastRef = useRef<string | null>(null);
  useAutoCategoryFromPrediction(predicted, lastRef);
}

describe("useAutoCategoryFromPrediction", () => {
  beforeEach(() => {
    useTransactionStore.setState({ categoryId: "", hasUserSelectedCategoryManually: false });
  });

  it("aplica a categoria sugerida pela IA e não entra em loop de atualização", () => {
    const { result } = renderHook(() => {
      useHarness("cat-mercado");
      return useTransactionStore.getState().categoryId;
    });
    expect(result.current).toBe("cat-mercado");
  });

  it("não sobrescreve uma escolha manual do usuário", () => {
    useTransactionStore.setState({ categoryId: "cat-manual", hasUserSelectedCategoryManually: true });
    renderHook(() => useHarness("cat-mercado"));
    expect(useTransactionStore.getState().categoryId).toBe("cat-manual");
  });

  it("não dispara re-render infinito quando a sugestão já foi aplicada", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      useHarness("cat-mercado");
    });
    act(() => {
      useTransactionStore.getState().setDescription("mercado do bairro");
    });
    expect(renders).toBeLessThan(10);
  });
});
