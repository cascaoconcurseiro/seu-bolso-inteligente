import { describe, expect, it } from "vitest";
import type { FamilyMember } from "@/hooks/useFamily";
import { getConfiguredSplitMembers, getTripSplitMembers } from "./splitMembers";

const member = (
  values: Partial<FamilyMember> & Pick<FamilyMember, "id" | "name" | "member_type">
) => ({ status: "active", ...values }) as FamilyMember;

describe("getConfiguredSplitMembers", () => {
  it("includes family members and only contacts enabled for transaction forms", () => {
    const fran = member({ id: "fran", name: "Fran", member_type: "family" });
    const jhonatan = member({
      id: "jhonatan",
      name: "Jhonatan",
      member_type: "contact",
      active_in_form: true,
    });
    const disabledContact = member({
      id: "disabled",
      name: "Contato desativado",
      member_type: "contact",
      active_in_form: false,
    });
    const pendingFamilyMember = member({
      id: "pending",
      name: "Convite pendente",
      member_type: "family",
      status: "pending",
    });
    const inactiveContact = member({
      id: "inactive",
      name: "Contato inativo",
      member_type: "contact",
      status: "inactive",
      active_in_form: true,
    });

    expect(
      getConfiguredSplitMembers(
        [fran, pendingFamilyMember],
        [jhonatan, disabledContact, inactiveContact]
      )
    ).toEqual([fran, jhonatan]);
  });

  it("does not duplicate contacts already present in the family list", () => {
    const fran = member({ id: "fran", name: "Fran", member_type: "family" });

    expect(getConfiguredSplitMembers([fran], [fran])).toEqual([fran]);
  });
});

describe("getTripSplitMembers", () => {
  it("keeps selectable trip payers and split members backed by family records", () => {
    const fran = member({
      id: "fran-member",
      name: "Fran",
      member_type: "family",
      linked_user_id: "fran-user",
    });
    const tripContact = member({
      id: "trip-only",
      name: "Participante sem vínculo familiar",
      member_type: "contact",
      user_id: null,
    });
    const inactiveFran = member({
      id: "inactive-fran",
      name: "Fran inativa",
      member_type: "family",
      user_id: "fran-user",
      status: "inactive",
    });

    expect(
      getTripSplitMembers(
        [fran, inactiveFran, tripContact],
        [
          { id: "trip-fran", user_id: "fran-user", status: "active" } as never,
          { id: "trip-only-id", user_id: "trip-user", status: "active" } as never,
          { id: "trip-pending", user_id: "fran-user", status: "pending" } as never,
          { id: "guest-id", user_id: null, status: "active" } as never,
        ]
      )
    ).toEqual([fran]);
  });
});
