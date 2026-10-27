import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GreetingCard } from "./GreetingCard";

const { mockUseAuth, mockUseUserProfile } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserProfile: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: mockUseAuth }));
vi.mock("@/hooks/useUserProfile", () => ({ useUserProfile: mockUseUserProfile }));

describe("GreetingCard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseUserProfile.mockReset();
  });

  it("uses the provider name when the stored profile name is only the email prefix", () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: "wesley.diaslima@gmail.com",
        user_metadata: { name: "Wesley Dias Lima" },
      },
    });
    mockUseUserProfile.mockReturnValue({ data: { full_name: "wesley.diaslima" } });

    render(<GreetingCard />);

    expect(screen.getByRole("heading", { name: "Wesley" })).toBeInTheDocument();
    expect(screen.queryByText("wesley.diaslima")).not.toBeInTheDocument();
  });

  it("does not expose the email prefix when the provider has no name", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "wesley.diaslima@gmail.com", user_metadata: {} },
    });
    mockUseUserProfile.mockReturnValue({ data: null });

    render(<GreetingCard />);

    expect(screen.getByRole("heading", { name: "usuário" })).toBeInTheDocument();
    expect(screen.queryByText("wesley.diaslima")).not.toBeInTheDocument();
  });

  it("rejects an email address or email prefix in profile and provider name fields", () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: "wesley.diaslima@gmail.com",
        user_metadata: { name: "wesley.diaslima", user_name: "wesley.diaslima@gmail.com" },
      },
    });
    mockUseUserProfile.mockReturnValue({ data: { full_name: "wesley.diaslima@gmail.com" } });

    render(<GreetingCard />);

    expect(screen.getByRole("heading", { name: "usuário" })).toBeInTheDocument();
    expect(screen.queryByText(/wesley\.diaslima/)).not.toBeInTheDocument();
  });

  it("ignores non-string provider metadata without breaking the dashboard", () => {
    mockUseAuth.mockReturnValue({
      user: { email: "wesley.diaslima@gmail.com", user_metadata: { name: { value: "Wesley" } } },
    });
    mockUseUserProfile.mockReturnValue({ data: null });

    render(<GreetingCard />);

    expect(screen.getByRole("heading", { name: "usuário" })).toBeInTheDocument();
  });
});
