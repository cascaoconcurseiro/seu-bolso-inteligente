import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEncryptedForageStorage } from "./encryptedStorage";

describe("createEncryptedForageStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("nunca persiste o valor em texto puro quando a criptografia falha", async () => {
    const forage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn().mockResolvedValue(undefined),
    };
    const originalSubtle = crypto.subtle;
    Object.defineProperty(crypto, "subtle", {
      configurable: true,
      value: {
        ...originalSubtle,
        importKey: vi.fn().mockRejectedValue(new Error("crypto unavailable")),
      },
    });

    try {
      const storage = createEncryptedForageStorage(forage);
      await storage.setItem("query-cache", '{"accountBalance":1234}');

      expect(forage.setItem).not.toHaveBeenCalled();
      expect(forage.removeItem).toHaveBeenCalledWith("query-cache");
    } finally {
      Object.defineProperty(crypto, "subtle", {
        configurable: true,
        value: originalSubtle,
      });
    }
  });
});
