import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountSettings } from "./AccountSettings";

describe("AccountSettings loading state", () => {
  it("shows session identity immediately while the saved profile loads", () => {
    render(
      <AccountSettings
        profile={null}
        user={{
          email: "wesley.diaslima@gmail.com",
          user_metadata: { full_name: "Wesley Dias Lima" },
        }}
        profileLoading
        updateProfile={{ mutateAsync: vi.fn(), isPending: false }}
        signOut={vi.fn()}
        onDeleteAccount={vi.fn()}
      />
    );

    expect(screen.getByText("Wesley Dias Lima")).toBeVisible();
    expect(screen.getByText("wesley.diaslima@gmail.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(
      screen.getByRole("status", { name: "Carregando personalização do avatar" })
    ).toBeVisible();
  });
});
