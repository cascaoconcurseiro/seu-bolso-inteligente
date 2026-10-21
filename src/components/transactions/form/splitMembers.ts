import type { FamilyMember } from "@/hooks/useFamily";
import type { TripMember } from "@/hooks/useTripMembers";

export function getConfiguredSplitMembers(
  familyMembers: FamilyMember[],
  contacts: FamilyMember[]
): FamilyMember[] {
  const activeFamilyMembers = familyMembers.filter((member) => member.status === "active");
  const existingIds = new Set(activeFamilyMembers.map((member) => member.id));
  const activeContacts = contacts.filter(
    (contact) =>
      contact.status === "active" && contact.active_in_form && !existingIds.has(contact.id)
  );

  return [...activeFamilyMembers, ...activeContacts];
}

export function getTripSplitMembers(
  familyMembers: FamilyMember[],
  tripMembers: TripMember[]
): FamilyMember[] {
  const tripUserIds = new Set(
    tripMembers
      .filter((member) => member.status === "active")
      .map((member) => member.user_id)
      .filter(Boolean)
  );
  return familyMembers.filter(
    (member) =>
      member.status === "active" &&
      [member.user_id, member.linked_user_id].some((userId) => !!userId && tripUserIds.has(userId))
  );
}
