import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotification, createTripInviteNotification } from "./notificationService";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}));

vi.mock("@/utils/logger", () => ({ logger: { error: mocks.loggerError } }));

describe("createNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("reports an existing active notice without inserting a duplicate", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "notice-existing" }, error: null });

    await expect(
      createNotification({
        user_id: "recipient",
        type: "INVITATION",
        title: "Invite",
        message: "Card invite",
        related_id: "card",
      })
    ).resolves.toBe("already_exists");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reports created only when the RPC returns the inserted id", async () => {
    mocks.rpc.mockResolvedValue({ data: "notice-new", error: null });

    await expect(
      createNotification({ user_id: "self", type: "GENERAL", title: "Hi", message: "Hello" })
    ).resolves.toBe("created");
  });

  it("reports a deduplicated RPC result separately from a failure", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("forbidden") });
    const input = { user_id: "recipient", type: "GENERAL" as const, title: "Hi", message: "Hello" };

    await expect(createNotification(input)).resolves.toBe("already_exists");
    await expect(createNotification(input)).resolves.toBe("failed");
    expect(mocks.loggerError).toHaveBeenCalledOnce();
  });

  it("links trip invite notices to both the trip and the invitation", async () => {
    mocks.rpc.mockResolvedValue({ data: "notice-trip", error: null });

    await createTripInviteNotification(
      "recipient",
      "Trip name",
      "trip-id",
      "Inviter",
      "invitation-id"
    );

    expect(mocks.rpc).toHaveBeenCalledWith("create_notification_v2", {
      p_notification: expect.objectContaining({
        type: "TRIP_INVITE",
        user_id: "recipient",
        related_id: "trip-id",
        related_type: "trip",
        metadata: { trip_invitation_id: "invitation-id" },
      }),
    });
  });
});
