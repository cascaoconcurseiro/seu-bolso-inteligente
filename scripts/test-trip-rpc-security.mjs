import crypto from "node:crypto";
import fs from "node:fs/promises";
import pg from "pg";
import { getVerifiedDbConnectionConfig } from "./lib/verified-db-connection.mjs";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required");

const migrationPath = new URL(
  "../supabase/migrations/20261024212001_fix_trip_balance_soft_deleted_splits_and_invite_notifications.sql",
  import.meta.url
);
const migrationSql = await fs.readFile(migrationPath, "utf8");
const client = new pg.Client(getVerifiedDbConnectionConfig(connectionString));
const checks = [];
const failures = [];
const assert = (condition, message) => {
  checks.push({ passed: Boolean(condition), message });
  if (!condition) failures.push(message);
};
const uuid = () => crypto.randomUUID();

async function expectSqlState(sql, expectedState, label) {
  const savepoint = `expected_error_${checks.length}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await client.query(sql);
    assert(false, `${label}: call unexpectedly succeeded`);
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    assert(error.code === expectedState, `${label}: received SQLSTATE ${error.code}`);
  } finally {
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  }
}

await client.connect();
let testDataRestored = false;
try {
  await client.query("BEGIN");
  await client.query(migrationSql);

  const users = [uuid(), uuid(), uuid(), uuid()];
  for (const userId of users) {
    const email = `trip-rpc-audit-${userId}@example.invalid`;
    await client.query(
      `insert into auth.users
        (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
       values ($1, 'authenticated', 'authenticated', $2, '', '{}'::jsonb, '{}'::jsonb)`,
      [userId, email]
    );
    await client.query(
      `insert into public.profiles (id, email, full_name)
       values ($1, $2, 'Temporary Trip RPC Audit') on conflict (id) do nothing`,
      [userId, email]
    );
  }
  const [ownerId, activeId, inactiveId, outsiderId] = users;

  const tripResult = await client.query(
    `insert into public.trips (owner_id, name, destination, start_date, end_date)
     values ($1, 'ZZ_TEST trip rpc audit', 'Audit fixture', current_date, current_date + 1)
     returning id`,
    [ownerId]
  );
  const tripId = tripResult.rows[0].id;
  await client.query(
    `insert into public.trip_members (trip_id, user_id, role, status)
     values ($1, $2, 'member', 'active'), ($1, $3, 'member', 'inactive'),
            ($1, $4, 'member', 'pending')`,
    [tripId, activeId, inactiveId, outsiderId]
  );

  const deletedTrip = await client.query(
    `insert into public.trips (owner_id, name, destination, start_date, end_date, deleted_at)
     values ($1, 'ZZ_TEST deleted trip rpc audit', 'Audit fixture', current_date,
             current_date + 1, now()) returning id`,
    [ownerId]
  );
  const deletedTripId = deletedTrip.rows[0].id;

  const balanceTransaction = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, is_shared, currency, trip_id)
     values ($1, $1, 100, 'ZZ_TEST_TRIP_BALANCE_SOFT_DELETE', current_date,
             date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL',
             false, 'BRL', $2)
     returning id`,
    [activeId, tripId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, name, percentage, amount, is_settled, deleted_at)
     values ($1, $2, 'Active audit split', 50, 50, false, null),
            ($1, $3, 'Deleted audit split', 90, 900, false, now())`,
    [balanceTransaction.rows[0].id, activeId, ownerId]
  );

  for (const [userId, allowed, label] of [
    [ownerId, true, "trip owner can read participant balances"],
    [activeId, true, "active trip member can read participant balances"],
    [inactiveId, false, "inactive trip member cannot read participant balances"],
    [outsiderId, false, "pending trip invitee cannot read participant balances"],
  ]) {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
    if (allowed) {
      const { rows } = await client.query(
        "SELECT * FROM public.get_trip_participant_balances_v2($1)",
        [tripId]
      );
      if (userId === ownerId) {
        const activeSplitBalance = rows.find((row) => row.user_id === activeId);
        assert(
          Number(activeSplitBalance?.owes) === 50 && !rows.some((row) => row.user_id === ownerId),
          "trip participant balances exclude soft-deleted transaction splits"
        );
      }
      assert(true, label);
    } else {
      await expectSqlState(
        `select * from public.get_trip_participant_balances_v2('${tripId}'::uuid)`,
        "42501",
        label
      );
    }
    await client.query("RESET ROLE");
  }

  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
  await expectSqlState(
    `select * from public.get_trip_participant_balances_v2('${deletedTripId}'::uuid)`,
    "42501",
    "deleted trip has no participant balance access"
  );
  await client.query("RESET ROLE");

  const invitation = await client.query(
    `insert into public.trip_invitations (trip_id, inviter_id, invitee_id)
     values ($1, $2, $3) returning id`,
    [tripId, ownerId, outsiderId]
  );
  const invitationId = invitation.rows[0].id;
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [outsiderId]);
  await expectSqlState(
    `select public.fn_respond_trip_invitation('${invitationId}'::uuid, 'cancelled')`,
    "22023",
    "unsupported invitation status is rejected"
  );
  await client.query(
    `select public.fn_respond_trip_invitation('${invitationId}'::uuid, 'rejected')`
  );
  await expectSqlState(
    `select public.fn_respond_trip_invitation('${invitationId}'::uuid, 'accepted')`,
    "55000",
    "already answered invitation cannot be answered again"
  );
  await client.query("RESET ROLE");

  const storedInvitation = await client.query(
    `select status, responded_at from public.trip_invitations where id = $1`,
    [invitationId]
  );
  assert(
    storedInvitation.rows[0]?.status === "rejected" && storedInvitation.rows[0]?.responded_at,
    "valid invitation response updates one pending invite"
  );

  const acceptInvitation = await client.query(
    `insert into public.trip_invitations (trip_id, inviter_id, invitee_id)
     values ($1, $2, $3) returning id`,
    [tripId, ownerId, inactiveId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
  const currentInviteNotification = await client.query(
    `select public.create_notification_v2($1::jsonb) as id`,
    [
      JSON.stringify({
        user_id: inactiveId,
        type: "TRIP_INVITE",
        title: "ZZ_TEST trip rpc audit",
        message: "Synthetic trip invitation for audit",
        related_id: tripId,
        related_type: "trip",
        metadata: { trip_invitation_id: acceptInvitation.rows[0].id },
      }),
    ]
  );
  await client.query("RESET ROLE");
  const legacyInviteNotification = await client.query(
    `insert into public.notifications
       (user_id, type, title, message, related_id, related_type, metadata)
     values ($1, 'TRIP_INVITE', 'ZZ_TEST trip rpc audit', 'Legacy synthetic invitation',
             $2, 'trip', '{}'::jsonb)
     returning id`,
    [inactiveId, tripId]
  );
  const mismatchedInviteNotification = await client.query(
    `insert into public.notifications
       (user_id, type, title, message, related_id, related_type, metadata)
     values ($1, 'TRIP_INVITE', 'ZZ_TEST trip rpc audit', 'Different invitation metadata',
             $2, 'trip', jsonb_build_object('trip_invitation_id', $3::uuid))
     returning id`,
    [inactiveId, tripId, uuid()]
  );
  const legacyInvitationIdNotification = await client.query(
    `insert into public.notifications
       (user_id, type, title, message, related_id, related_type, metadata)
     values ($1, 'TRIP_INVITE', 'ZZ_TEST trip rpc audit', 'Legacy invitation-id notification',
             $2, 'trip_invitation', '{}'::jsonb)
     returning id`,
    [inactiveId, acceptInvitation.rows[0].id]
  );
  const unrelatedInviteNotification = await client.query(
    `insert into public.notifications
       (user_id, type, title, message, related_id, related_type, metadata)
     values ($1, 'TRIP_INVITE', 'ZZ_TEST trip rpc audit', 'Unrelated synthetic invitation',
             $2, 'trip', '{}'::jsonb)
     returning id`,
    [outsiderId, tripId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
  await expectSqlState(
    `select public.fn_respond_trip_invitation('${acceptInvitation.rows[0].id}'::uuid, 'accepted')`,
    "42501",
    "a user other than the invitee cannot respond"
  );
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [inactiveId]);
  await client.query(
    `select public.fn_respond_trip_invitation('${acceptInvitation.rows[0].id}'::uuid, 'accepted')`
  );
  await client.query("RESET ROLE");

  const acceptedMembership = await client.query(
    `select status from public.trip_members where trip_id = $1 and user_id = $2`,
    [tripId, inactiveId]
  );
  const acceptedInvitation = await client.query(
    `select status from public.trip_invitations where id = $1`,
    [acceptInvitation.rows[0].id]
  );
  assert(
    acceptedInvitation.rows[0]?.status === "accepted" &&
      acceptedMembership.rows[0]?.status === "active",
    "valid acceptance activates the member and updates the invitation"
  );
  const invitationNotifications = await client.query(
    `select id, user_id, is_read, is_dismissed
     from public.notifications where id = any($1::uuid[])`,
    [
      [
        currentInviteNotification.rows[0].id,
        legacyInviteNotification.rows[0].id,
        mismatchedInviteNotification.rows[0].id,
        legacyInvitationIdNotification.rows[0].id,
        unrelatedInviteNotification.rows[0].id,
      ],
    ]
  );
  const dismissedNotificationIds = new Set(
    invitationNotifications.rows
      .filter((row) => row.is_read && row.is_dismissed)
      .map((row) => row.id)
  );
  assert(
    dismissedNotificationIds.has(currentInviteNotification.rows[0].id) &&
      dismissedNotificationIds.has(legacyInviteNotification.rows[0].id) &&
      dismissedNotificationIds.has(legacyInvitationIdNotification.rows[0].id),
    "responding to an invitation dismisses current and legacy notification formats"
  );
  assert(
    !dismissedNotificationIds.has(mismatchedInviteNotification.rows[0].id) &&
      !dismissedNotificationIds.has(unrelatedInviteNotification.rows[0].id),
    "responding to an invitation preserves mismatched and another user's notifications"
  );

  const deletedTripInvitation = await client.query(
    `insert into public.trip_invitations (trip_id, inviter_id, invitee_id)
     values ($1, $2, $3) returning id`,
    [deletedTripId, ownerId, outsiderId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [outsiderId]);
  await expectSqlState(
    `select public.fn_respond_trip_invitation('${deletedTripInvitation.rows[0].id}'::uuid, 'accepted')`,
    "55000",
    "deleted trip invitation cannot be accepted"
  );
  await client.query("RESET ROLE");
  const deletedTripInviteState = await client.query(
    `select invitation.status,
            exists (select 1 from public.trip_members member
                    where member.trip_id = invitation.trip_id
                      and member.user_id = invitation.invitee_id) as has_membership
     from public.trip_invitations invitation where invitation.id = $1`,
    [deletedTripInvitation.rows[0].id]
  );
  assert(
    deletedTripInviteState.rows[0]?.status === "pending" &&
      deletedTripInviteState.rows[0]?.has_membership === false,
    "failed deleted-trip acceptance leaves invitation pending and creates no membership"
  );

  await client.query("ROLLBACK");
  testDataRestored = true;
} catch (error) {
  if (!testDataRestored) await client.query("ROLLBACK").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(JSON.stringify({ checks, failures, testDataRestored }, null, 2));
if (failures.length || !testDataRestored) process.exitCode = 1;
