import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Family } from "./Family";

const mocks = vi.hoisted(() => ({
  useFamily: vi.fn(),
  useFamilyMembers: vi.fn(),
  useSharedContacts: vi.fn(),
  useFamilyInvitations: vi.fn(),
  useCancelInvitation: vi.fn(),
  usePendingInvitations: vi.fn(),
  useAcceptInvitation: vi.fn(),
  useRejectInvitation: vi.fn(),
  useAddSharedContact: vi.fn(),
  useConvertContactToMember: vi.fn(),
  useConvertMemberToContact: vi.fn(),
  useInviteFamilyMember: vi.fn(),
  useRemoveFamilyMember: vi.fn(),
  useToggleContactActiveInForm: vi.fn(),
  useUpdateFamilyMember: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useFamily", () => ({
  useFamily: mocks.useFamily,
  useFamilyMembers: mocks.useFamilyMembers,
  useSharedContacts: mocks.useSharedContacts,
  useAddSharedContact: mocks.useAddSharedContact,
  useConvertContactToMember: mocks.useConvertContactToMember,
  useConvertMemberToContact: mocks.useConvertMemberToContact,
  useInviteFamilyMember: mocks.useInviteFamilyMember,
  useRemoveFamilyMember: mocks.useRemoveFamilyMember,
  useToggleContactActiveInForm: mocks.useToggleContactActiveInForm,
  useUpdateFamilyMember: mocks.useUpdateFamilyMember,
}));

vi.mock("@/hooks/useFamilyInvitations", () => ({
  useCancelInvitation: mocks.useCancelInvitation,
  useFamilyInvitations: mocks.useFamilyInvitations,
  usePendingInvitations: mocks.usePendingInvitations,
  useAcceptInvitation: mocks.useAcceptInvitation,
  useRejectInvitation: mocks.useRejectInvitation,
}));

describe("Family contact loading state", () => {
  beforeEach(() => {
    mocks.usePendingInvitations.mockReturnValue({ data: [], isLoading: false, isError: false });
    mocks.useAcceptInvitation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useRejectInvitation.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useFamily.mockReturnValue({
      data: { id: "family-1", owner_id: "user-1", name: "Família de Wesley" },
      isLoading: false,
      isError: false,
    });
    mocks.useFamilyMembers.mockReturnValue({ data: [], isLoading: false, isError: false });
    mocks.useSharedContacts.mockReturnValue({ data: [], isLoading: false, isError: false });
    mocks.useFamilyInvitations.mockReturnValue({ data: [], isError: false });
    mocks.useCancelInvitation.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useAddSharedContact.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useConvertContactToMember.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useConvertMemberToContact.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useInviteFamilyMember.mockReturnValue({ mutateAsync: vi.fn() });
    mocks.useRemoveFamilyMember.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mocks.useToggleContactActiveInForm.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mocks.useUpdateFamilyMember.mockReturnValue({ mutateAsync: vi.fn() });
  });

  it("does not present an empty contact list while contacts are loading", () => {
    mocks.useSharedContacts.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(
      <MemoryRouter>
        <Family />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /contatos de despesa \(carregando…\)/i })
    ).toBeVisible();
    expect(screen.getByRole("status", { name: "Carregando contatos de despesa" })).toBeVisible();
    expect(screen.queryByText("Nenhum contato de despesa cadastrado.")).not.toBeInTheDocument();
  });

  it("renders the contact after the query resolves", () => {
    mocks.useSharedContacts.mockReturnValue({
      data: [
        {
          id: "contact-jhonatan",
          name: "Jhonatan Rizzon",
          linked_user_id: "jhonatan-user",
          active_in_form: true,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter>
        <Family />
      </MemoryRouter>
    );

    expect(screen.getByText("Jhonatan Rizzon")).toBeVisible();
    expect(screen.getByRole("heading", { name: /contatos de despesa \(1\)/i })).toBeVisible();
  });

  it("shows an empty state only after a successful empty result", () => {
    mocks.useSharedContacts.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(
      <MemoryRouter>
        <Family />
      </MemoryRouter>
    );

    expect(screen.getByText("Nenhum contato de despesa cadastrado.")).toBeVisible();
    expect(screen.getByRole("heading", { name: /contatos de despesa \(0\)/i })).toBeVisible();
  });

  it("keeps an unavailable contact list distinct from a successful empty result", () => {
    mocks.useSharedContacts.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(
      <MemoryRouter>
        <Family />
      </MemoryRouter>
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Não foi possível atualizar todos os dados"
    );
    expect(screen.queryByText("Nenhum contato de despesa cadastrado.")).not.toBeInTheDocument();
  });

  it("keeps cached family members and contacts visible when a background refresh fails", () => {
    mocks.useFamily.mockReturnValue({
      data: { id: "family-1", owner_id: "user-1", name: "Família de Wesley" },
      isLoading: false,
      isError: true,
    });
    mocks.useFamilyMembers.mockReturnValue({
      data: [
        {
          id: "member-fran",
          name: "Fran",
          linked_user_id: "fran-user",
          member_type: "family",
          status: "active",
        },
      ],
      isLoading: false,
      isError: true,
    });
    mocks.useSharedContacts.mockReturnValue({
      data: [
        {
          id: "contact-jhonatan",
          name: "Jhonatan Rizzon",
          linked_user_id: "jhonatan-user",
          member_type: "contact",
          status: "active",
          active_in_form: true,
        },
      ],
      isLoading: false,
      isError: true,
    });

    render(
      <MemoryRouter>
        <Family />
      </MemoryRouter>
    );

    expect(screen.getByText("Fran")).toBeVisible();
    expect(screen.getByText("Jhonatan Rizzon")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Os dados já carregados continuam visíveis"
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
