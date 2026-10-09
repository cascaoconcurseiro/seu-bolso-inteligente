import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SplitModal } from "./SplitModal";

describe("SplitModal", () => {
  it("opens without selecting a family member", () => {
    const setSplits = vi.fn();

    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="me"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={setSplits}
        familyMembers={[{ id: "member-1", name: "Fran" } as never]}
        activeAmount={100}
        currentUserMemberId="me"
      />
    );

    expect(screen.getByText("Dividir com quem?")).toBeInTheDocument();
    expect(screen.queryByText("Divisão Rápida")).not.toBeInTheDocument();
    expect(setSplits).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Selecionar Fran" })).toBeInTheDocument();
  });
});
