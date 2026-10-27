import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackupManager } from "./BackupManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

describe("BackupManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        }) as never
    );
  });

  it("keeps backup restoration unavailable without issuing database writes", () => {
    render(<BackupManager />);

    expect(screen.getByText(/Restauração temporariamente indisponível/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Selecionar arquivo de Backup/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /RESTAURAR/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Confirmar Restauração Total/i })
    ).not.toBeInTheDocument();

    const restoreButton = screen.getByRole("button", { name: /Restauração desativada/i });
    expect(restoreButton).toBeDisabled();
    fireEvent.click(restoreButton);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("keeps export available and describes the partial unencrypted file accurately", () => {
    render(<BackupManager />);

    expect(screen.getByRole("button", { name: /Baixar arquivo de Backup/i })).toBeEnabled();
    expect(screen.getByText(/JSON sem criptografia/i)).toBeInTheDocument();
    expect(screen.getByText(/nas 14 tabelas incluídas/i)).toBeInTheDocument();
    expect(screen.getByText(/não representa um snapshot consistente/i)).toBeInTheDocument();
    expect(
      screen.getByText(/pode conter dados compartilhados e identificadores de outras pessoas/i)
    ).toBeInTheDocument();
  });

  it("downloads the JSON from all listed tables and releases its temporary URL", async () => {
    let exportedBlob: Blob | undefined;
    const transactionRanges: number[][] = [];
    vi.mocked(supabase.from).mockImplementation(
      (tableName) =>
        ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(async (from: number, to: number) => {
                if (tableName === "transactions") {
                  transactionRanges.push([from, to]);
                  if (from === 0) {
                    return {
                      data: Array.from({ length: 500 }, (_, index) => ({ id: `tx-${index}` })),
                      error: null,
                      count: 1001,
                    };
                  }
                  if (from === 500) {
                    return {
                      data: Array.from({ length: 500 }, (_, index) => ({
                        id: `tx-${index + 500}`,
                      })),
                      error: null,
                      count: 1001,
                    };
                  }
                  if (from === 1000) return { data: [{ id: "tx-1000" }], error: null, count: 1001 };
                }
                return { data: [], error: null, count: 0 };
              }),
            })),
          })),
        }) as never
    );
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return "blob:backup-test";
    });
    const revokeObjectURL = vi.fn();
    const timeoutSpy = vi.spyOn(window, "setTimeout");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<BackupManager />);
    fireEvent.click(screen.getByRole("button", { name: /Baixar arquivo de Backup/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("A cópia parcial dos dados foi baixada.")
    );
    expect(supabase.from).toHaveBeenCalledTimes(16);
    expect(transactionRanges).toEqual([
      [0, 999],
      [500, 1499],
      [1000, 1999],
    ]);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(exportedBlob?.type).toBe("application/json");

    const json = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(exportedBlob as Blob);
    });
    const parsedBackup = JSON.parse(json);
    expect(parsedBackup).toMatchObject({
      version: "1.0",
      userId: "user-1",
      data: { accounts: [], transactions: expect.any(Array), trips: [] },
    });
    expect(parsedBackup.data.transactions).toHaveLength(1001);
    expect(parsedBackup.data.transactions.at(-1)).toEqual({ id: "tx-1000" });

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup-test"), {
      timeout: 2500,
    });
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it("does not download a partial backup when any page query fails", async () => {
    vi.mocked(supabase.from).mockImplementation(
      (tableName) =>
        ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(async (from: number) => {
                if (tableName === "transactions" && from === 0) {
                  return {
                    data: Array.from({ length: 1000 }, (_, index) => ({ id: `tx-${index}` })),
                    error: null,
                    count: 1001,
                  };
                }
                if (tableName === "transactions" && from === 1000) {
                  return { data: null, error: new Error("network failure"), count: 1001 };
                }
                return { data: [], error: null, count: 0 };
              }),
            })),
          })),
        }) as never
    );
    const createObjectURL = vi.fn(() => "blob:backup-test");
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });

    render(<BackupManager />);
    fireEvent.click(screen.getByRole("button", { name: /Baixar arquivo de Backup/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Falha ao exportar backup."));
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
