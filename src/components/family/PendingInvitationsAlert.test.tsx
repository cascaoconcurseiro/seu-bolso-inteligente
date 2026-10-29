import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PendingInvitationsAlert } from "./PendingInvitationsAlert";

const mockUsePendingInvitations = vi.fn();
const mockAcceptMutate = vi.fn();
const mockRejectMutate = vi.fn();

vi.mock("@/hooks/useFamilyInvitations", () => ({
  usePendingInvitations: () => mockUsePendingInvitations(),
  useAcceptInvitation: () => ({
    mutate: mockAcceptMutate,
    isPending: false,
    variables: null,
  }),
  useRejectInvitation: () => ({
    mutate: mockRejectMutate,
    isPending: false,
    variables: null,
  }),
}));

describe("PendingInvitationsAlert", () => {
  it("renders nothing when there are no invitations", () => {
    mockUsePendingInvitations.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { container } = render(<PendingInvitationsAlert />);
    expect(container.firstChild).toBeNull();
  });

  it("renders invitation with inviter name and triggers accept/reject", () => {
    mockUsePendingInvitations.mockReturnValue({
      data: [
        {
          id: "inv-1",
          from_user_id: "user-1",
          to_user_id: "user-2",
          family_id: "fam-1",
          member_name: "Francy.von",
          role: "editor",
          status: "pending",
          from_user: {
            full_name: "Wesley Lima",
          },
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<PendingInvitationsAlert />);

    expect(screen.getByText(/Wesley Lima convidou você/i)).toBeInTheDocument();
    expect(screen.getByText(/Francy\.von/i)).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: /aceitar convite/i });
    const rejectBtn = screen.getByRole("button", { name: /recusar/i });

    expect(acceptBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();

    fireEvent.click(acceptBtn);
    expect(mockAcceptMutate).toHaveBeenCalledWith("inv-1");

    fireEvent.click(rejectBtn);
    expect(mockRejectMutate).toHaveBeenCalledWith("inv-1");
  });
});
