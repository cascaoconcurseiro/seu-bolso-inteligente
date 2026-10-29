import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InviteMemberDialog } from "./InviteMemberDialog";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "me@example.com" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
    })),
  },
}));

describe("InviteMemberDialog", () => {
  const onInvite = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconhece usuário cadastrado e exibe alerta amigável", async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{ id: "target-456", full_name: "Francy Von" }],
      error: null,
    });

    render(
      <InviteMemberDialog
        open={true}
        onOpenChange={onOpenChange}
        onInvite={onInvite}
        isPending={false}
      />
    );

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "francy@example.com" } });

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith("find_profile_for_family_link_v2", {
        p_email: "francy@example.com",
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Usuário encontrado:/)).toBeInTheDocument();
      expect(screen.getByText(/Francy Von/)).toBeInTheDocument();
    });

    // Auto-preenche o nome
    const nameInput = screen.getByLabelText("Nome") as HTMLInputElement;
    expect(nameInput.value).toBe("Francy Von");

    // Enviar convite
    const submitBtn = screen.getByRole("button", { name: "Enviar Convite" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "francy@example.com",
          name: "Francy Von",
          targetUserId: "target-456",
        })
      );
    });
  });
});
