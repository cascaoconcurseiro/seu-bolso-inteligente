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
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
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
    expect(supabase.from).toHaveBeenCalledTimes(14);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(exportedBlob?.type).toBe("application/json");

    const json = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(exportedBlob as Blob);
    });
    expect(JSON.parse(json)).toMatchObject({
      version: "1.0",
      userId: "user-1",
      data: { accounts: [], transactions: [], trips: [] },
    });

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup-test"), {
      timeout: 2500,
    });
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
