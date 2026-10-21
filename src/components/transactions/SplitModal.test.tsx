import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SplitModal } from "./SplitModal";

describe("SplitModal", () => {
  it("shows a loading state instead of an empty participants message while members load", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="me"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[]}
        activeAmount={100}
        currentUserMemberId="me"
        isLoadingMembers
      />
    );

    expect(screen.getByRole("status", { name: "Carregando participantes" })).toBeVisible();
    expect(screen.queryByText("Adicione pessoas para dividir despesas.")).not.toBeInTheDocument();
  });

  it("does not report an empty list when loading participants fails", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="me"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[]}
        activeAmount={100}
        currentUserMemberId="me"
        hasMembersLoadError
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os participantes"
    );
    expect(screen.queryByText("Adicione pessoas para dividir despesas.")).not.toBeInTheDocument();
  });

  it("keeps cached participants visible when a refresh fails", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="me"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[{ id: "member-1", name: "Fran" } as never]}
        activeAmount={100}
        currentUserMemberId="me"
        hasMembersLoadError
      />
    );

    expect(screen.getByRole("button", { name: "Selecionar Fran" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("usando os participantes já carregados");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not report an empty payer list while members are loading", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="member-1"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[]}
        activeAmount={100}
        currentUserMemberId="me"
        isLoadingMembers
      />
    );

    expect(screen.getByRole("status", { name: "Carregando pagadores" })).toBeVisible();
    expect(
      screen.queryByText("Nenhum outro membro cadastrado na família.")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("does not report an empty payer list when loading members fails", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="member-1"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[]}
        activeAmount={100}
        currentUserMemberId="me"
        hasMembersLoadError
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os pagadores");
    expect(
      screen.queryByText("Nenhum outro membro cadastrado na família.")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

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
        familyMembers={
          [
            { id: "member-1", name: "Fran", member_type: "family" },
            {
              id: "contact-1",
              name: "Jhonatan",
              member_type: "contact",
              active_in_form: true,
            },
          ] as never
        }
        activeAmount={100}
        currentUserMemberId="me"
      />
    );

    expect(screen.getByText("Dividir com quem?")).toBeInTheDocument();
    expect(screen.queryByText("Divisão Rápida")).not.toBeInTheDocument();
    expect(setSplits).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Selecionar Fran" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar Jhonatan" })).toBeInTheDocument();
  });

  it("blocks confirmation when participant loading failed and there is no cached list", () => {
    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        payerId="me"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[]}
        activeAmount={100}
        currentUserMemberId="me"
        hasMembersLoadError
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os participantes"
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });
});
