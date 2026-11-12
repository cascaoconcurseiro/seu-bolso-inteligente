import { describe, expect, it } from "vitest";
import { describeRejectionReason } from "../errorLogger";

describe("describeRejectionReason", () => {
  it("usa a mensagem de instâncias de Error", () => {
    expect(describeRejectionReason(new Error("falhou"))).toBe("falhou");
  });

  it("retorna strings como estão", () => {
    expect(describeRejectionReason("texto")).toBe("texto");
  });

  it("extrai campos de erros simples do Supabase em vez de '[object Object]'", () => {
    const reason = { message: "permission denied", code: "42501", details: "", hint: "rls" };
    const text = describeRejectionReason(reason);
    expect(text).toBe("message: permission denied | code: 42501 | hint: rls");
    expect(text).not.toContain("[object Object]");
  });

  it("serializa objetos sem campos conhecidos", () => {
    expect(describeRejectionReason({ foo: 1 })).toBe('{"foo":1}');
  });

  it("não quebra com objeto vazio ou referência circular", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(describeRejectionReason({})).toContain("Rejeição sem mensagem");
    expect(describeRejectionReason(circular)).toContain("Rejeição sem mensagem");
  });

  it("converte valores primitivos", () => {
    expect(describeRejectionReason(undefined)).toBe("undefined");
    expect(describeRejectionReason(42)).toBe("42");
  });
});
