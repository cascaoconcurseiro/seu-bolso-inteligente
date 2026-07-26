import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TripFormDialog } from "./TripFormDialog";

const initialValues = {
  name: "",
  destination: "",
  notes: "",
  startDate: "",
  endDate: "",
  currency: "BRL",
  budget: "",
  coverImage: "",
  memberIds: [],
};

describe("TripFormDialog", () => {
  it("cria uma viagem mantendo título e destino independentes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TripFormDialog
        open
        formKey="new-trip"
        mode="create"
        initialValues={initialValues}
        familyMembers={[]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/^Nome da viagem/), "Verão no Japão");
    await user.type(screen.getByLabelText(/^Destino/), "Tóquio");
    fireEvent.change(screen.getByLabelText(/^Data de início/), {
      target: { value: "2026-09-12" },
    });
    fireEvent.change(screen.getByLabelText(/^Data de término/), {
      target: { value: "2026-09-18" },
    });
    await user.click(screen.getByRole("button", { name: "Criar viagem" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Verão no Japão",
          destination: "Tóquio",
        })
      )
    );
  });

  it("mostra erros por campo e leva o foco ao primeiro inválido", async () => {
    const user = userEvent.setup();
    render(
      <TripFormDialog
        open
        formKey="new-trip"
        mode="create"
        initialValues={initialValues}
        familyMembers={[]}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Criar viagem" }));

    expect(await screen.findByText("Dê um nome para a viagem")).toBeVisible();
    expect(screen.getByLabelText(/^Nome da viagem/)).toHaveFocus();
    expect(screen.getByLabelText(/^Nome da viagem/)).toHaveAttribute("aria-invalid", "true");
  });

  it("mantém os dados preenchidos quando o servidor rejeita o envio", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Servidor indisponível"));
    render(
      <TripFormDialog
        open
        formKey="trip-1"
        mode="edit"
        initialValues={{
          ...initialValues,
          name: "Minha viagem",
          destination: "Lisboa",
          startDate: "2026-10-01",
          endDate: "2026-10-07",
        }}
        familyMembers={[]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Servidor indisponível")).toBeVisible();
    expect(screen.getByLabelText(/^Nome da viagem/)).toHaveValue("Minha viagem");
  });

  it("preserva a digitação em rerenders e reinicia apenas ao reabrir", async () => {
    const user = userEvent.setup();
    const props = {
      mode: "edit" as const,
      formKey: "trip-1",
      familyMembers: [],
      onOpenChange: vi.fn(),
      onSubmit: vi.fn().mockResolvedValue(undefined),
    };
    const { rerender } = render(
      <TripFormDialog open initialValues={{ ...initialValues, name: "Original" }} {...props} />
    );

    const name = screen.getByLabelText(/^Nome da viagem/);
    await user.clear(name);
    await user.type(name, "Minha edição");
    rerender(
      <TripFormDialog open initialValues={{ ...initialValues, name: "Servidor" }} {...props} />
    );
    expect(name).toHaveValue("Minha edição");

    rerender(
      <TripFormDialog
        open={false}
        initialValues={{ ...initialValues, name: "Servidor" }}
        {...props}
      />
    );
    rerender(
      <TripFormDialog open initialValues={{ ...initialValues, name: "Servidor" }} {...props} />
    );
    expect(screen.getByLabelText(/^Nome da viagem/)).toHaveValue("Servidor");
  });
});
