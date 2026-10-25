import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { TransactionSplitData } from "@/types/transactions";
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

  it.each([0.01, 0.02])(
    "blocks a 50/50 split of R$ %s across two members when it creates a zero-value share",
    async (amount) => {
      const user = userEvent.setup();
      const members = [
        { id: "member-1", name: "Fran", member_type: "family" },
        { id: "member-2", name: "Jhonatan", member_type: "contact", active_in_form: true },
      ] as never;

      function SplitModalHarness() {
        const [splits, setSplits] = useState<TransactionSplitData[]>([]);
        return (
          <SplitModal
            isOpen
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            payerId="me"
            setPayerId={vi.fn()}
            splits={splits}
            setSplits={setSplits}
            familyMembers={members}
            activeAmount={amount}
            currentUserMemberId="me"
          />
        );
      }

      render(<SplitModalHarness />);

      await user.click(screen.getByRole("button", { name: "Selecionar Fran" }));
      await user.click(screen.getByRole("button", { name: "Selecionar Jhonatan" }));
      await user.click(screen.getByRole("button", { name: "50/50" }));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Cada participante precisa ter uma fatia maior que R$ 0,00"
      );
      expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    }
  );

  it("clears zero-value member rows when the creator selects a 100% share", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const members = [
      { id: "member-1", name: "Fran", member_type: "family" },
      { id: "member-2", name: "Jhonatan", member_type: "contact", active_in_form: true },
    ] as never;

    function SplitModalHarness() {
      const [splits, setSplits] = useState<TransactionSplitData[]>([]);
      return (
        <SplitModal
          isOpen
          onClose={vi.fn()}
          onConfirm={onConfirm}
          payerId="me"
          setPayerId={vi.fn()}
          splits={splits}
          setSplits={setSplits}
          familyMembers={members}
          activeAmount={0.01}
          currentUserMemberId="me"
        />
      );
    }

    render(<SplitModalHarness />);

    await user.click(screen.getByRole("button", { name: "Selecionar Fran" }));
    await user.click(screen.getByRole("button", { name: "Selecionar Jhonatan" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledWith([]);
  });

  it("assigns the full share to the current user when another member paid", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const setSplits = vi.fn();
    const members = [{ id: "member-1", name: "Fran", member_type: "family" }] as never;

    function SplitModalHarness() {
      const [splits, updateSplits] = useState<TransactionSplitData[]>([]);
      return (
        <SplitModal
          isOpen
          onClose={vi.fn()}
          onConfirm={onConfirm}
          payerId="member-1"
          setPayerId={vi.fn()}
          splits={splits}
          setSplits={(nextSplits) => {
            setSplits(nextSplits);
            updateSplits(nextSplits);
          }}
          familyMembers={members}
          activeAmount={0.01}
          currentUserMemberId="me"
        />
      );
    }

    render(<SplitModalHarness />);
    await user.click(screen.getByRole("button", { name: /100%.*Tudo/ }));

    expect(await screen.findByRole("button", { name: "Confirmar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledWith([{ memberId: "me", percentage: 100, amount: 0.01 }]);
    expect(setSplits).toHaveBeenLastCalledWith([{ memberId: "me", percentage: 100, amount: 0.01 }]);
  });

  it("blocks a 100% current-user split when the current family member id is missing", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <SplitModal
        isOpen
        onClose={vi.fn()}
        onConfirm={onConfirm}
        payerId="member-1"
        setPayerId={vi.fn()}
        splits={[]}
        setSplits={vi.fn()}
        familyMembers={[{ id: "member-1", name: "Fran" } as never]}
        activeAmount={100}
      />
    );

    await user.click(screen.getByRole("button", { name: /100%.*Tudo/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Não foi possível identificar seu vínculo familiar"
    );
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("blocks confirmation when participants are selected and total amount is zero", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const members = [{ id: "member-1", name: "Fran", member_type: "family" }] as never;

    function SplitModalHarness() {
      const [splits, setSplits] = useState<TransactionSplitData[]>([]);
      return (
        <SplitModal
          isOpen
          onClose={vi.fn()}
          onConfirm={onConfirm}
          payerId="me"
          setPayerId={vi.fn()}
          splits={splits}
          setSplits={setSplits}
          familyMembers={members}
          activeAmount={0}
          currentUserMemberId="me"
        />
      );
    }

    render(<SplitModalHarness />);
    await user.click(screen.getByRole("button", { name: "Selecionar Fran" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Informe um valor total maior que R$ 0,00");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
