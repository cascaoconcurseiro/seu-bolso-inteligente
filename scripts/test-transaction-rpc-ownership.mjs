import crypto from "node:crypto";
import fs from "node:fs/promises";
import pg from "pg";
import { getVerifiedDbConnectionConfig } from "./lib/verified-db-connection.mjs";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required");
const migrationPath = new URL(
  "../supabase/migrations/20261020224406_validate_transaction_rpc_relationship_ownership.sql",
  import.meta.url
);
const migrationSql = await fs.readFile(migrationPath, "utf8");
const integrityMigrationPath = new URL(
  "../supabase/migrations/20261024212531_harden_installment_split_integrity_and_delete.sql",
  import.meta.url
);
const integrityMigrationSql = await fs.readFile(integrityMigrationPath, "utf8");
const sharedSummaryMigrationPath = new URL(
  "../supabase/migrations/20261024222000_harden_family_membership_admin_and_shared_summary.sql",
  import.meta.url
);
const sharedSummaryMigrationSql = await fs.readFile(sharedSummaryMigrationPath, "utf8");
const projectionMigrationPath = new URL(
  "../supabase/migrations/20261024223500_fix_monthly_projection_inactive_accounts_and_deleted_splits.sql",
  import.meta.url
);
const projectionMigrationSql = await fs.readFile(projectionMigrationPath, "utf8");
const client = new pg.Client(getVerifiedDbConnectionConfig(connectionString));
const checks = [];
const failures = [];
const assert = (condition, message) => {
  checks.push({ passed: Boolean(condition), message });
  if (!condition) failures.push(message);
};
const uuid = () => crypto.randomUUID();

async function expectSqlState(callback, expectedState, label) {
  const savepoint = `expected_error_${checks.length}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    await callback();
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
  await client.query(integrityMigrationSql);
  await client.query(sharedSummaryMigrationSql);
  await client.query(projectionMigrationSql);
  const [callerId, otherUserId, familyMemberId, nonTripMemberId] = [uuid(), uuid(), uuid(), uuid()];
  for (const userId of [callerId, otherUserId, familyMemberId, nonTripMemberId]) {
    const email = `transaction-rpc-audit-${userId}@example.invalid`;
    await client.query(
      `insert into auth.users
        (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
       values ($1, 'authenticated', 'authenticated', $2, '', '{}'::jsonb, '{}'::jsonb)`,
      [userId, email]
    );
    await client.query(
      `insert into public.profiles (id, email, full_name)
       values ($1, $2, 'Temporary Transaction RPC Audit') on conflict (id) do nothing`,
      [userId, email]
    );
  }

  await client.query(
    "update public.profiles set app_pin_hash = 'synthetic-pin-hash-for-rpc-test' where id = $1",
    [callerId]
  );
  await client.query("insert into public.admin_users (user_id) values ($1)", [callerId]);
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  const dossier = await client.query("select public.get_admin_user_dossier($1) as dossier", [
    callerId,
  ]);
  assert(
    dossier.rows[0].dossier.profile && !("app_pin_hash" in dossier.rows[0].dossier.profile),
    "admin dossier omits private PIN hash from profile payload"
  );
  await client.query("RESET ROLE");

  const ownAccountId = uuid();
  const foreignAccountId = uuid();
  await client.query(
    `insert into public.accounts (id, user_id, name, type, balance)
     values ($1, $2, 'ZZ_TEST RPC own account', 'CHECKING', 0),
            ($3, $4, 'ZZ_TEST RPC foreign account', 'CHECKING', 0)`,
    [ownAccountId, callerId, foreignAccountId, otherUserId]
  );

  const ownFamily = await client.query(
    `insert into public.families (owner_id, name) values ($1, 'ZZ_TEST RPC family') returning id`,
    [callerId]
  );
  const ownMember = await client.query(
    `insert into public.family_members (family_id, linked_user_id, user_id, name, status, role)
     values ($1, $2, $2, 'ZZ_TEST RPC member', 'active', 'viewer') returning id`,
    [ownFamily.rows[0].id, familyMemberId]
  );
  const nonTripMember = await client.query(
    `insert into public.family_members (family_id, linked_user_id, user_id, name, status, role)
     values ($1, $2, $2, 'ZZ_TEST RPC non-trip member', 'active', 'viewer') returning id`,
    [ownFamily.rows[0].id, nonTripMemberId]
  );
  const otherFamily = await client.query(
    `insert into public.families (owner_id, name) values ($1, 'ZZ_TEST RPC other family') returning id`,
    [otherUserId]
  );
  const foreignMember = await client.query(
    `insert into public.family_members (family_id, linked_user_id, user_id, name, status, role)
     values ($1, $2, $2, 'ZZ_TEST RPC foreign member', 'active', 'viewer') returning id`,
    [otherFamily.rows[0].id, familyMemberId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [familyMemberId]);
  const activeFamilyProbe = await client.query(
    "select public.is_family_member_v2($1, $2) as is_member",
    [ownFamily.rows[0].id, familyMemberId]
  );
  assert(activeFamilyProbe.rows[0].is_member, "active family membership remains visible to RLS");
  await client.query("RESET ROLE");
  await client.query(
    "update public.family_members set status = 'inactive', removed_at = now() where id = $1",
    [ownMember.rows[0].id]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [familyMemberId]);
  const inactiveFamilyProbe = await client.query(
    "select public.is_family_member_v2($1, $2) as is_member",
    [ownFamily.rows[0].id, familyMemberId]
  );
  assert(
    !inactiveFamilyProbe.rows[0].is_member,
    "inactive/removed family membership is denied by RLS probe"
  );
  await client.query("RESET ROLE");
  await client.query(
    "update public.family_members set status = 'active', removed_at = null where id = $1",
    [ownMember.rows[0].id]
  );
  await client.query("update public.families set deleted_at = now() where id = $1", [
    ownFamily.rows[0].id,
  ]);
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [familyMemberId]);
  const deletedFamilyProbe = await client.query(
    "select public.is_family_member_v2($1, $2) as is_member",
    [ownFamily.rows[0].id, familyMemberId]
  );
  assert(
    !deletedFamilyProbe.rows[0].is_member,
    "membership in a soft-deleted family is denied by RLS probe"
  );
  await client.query("RESET ROLE");
  await client.query("update public.families set deleted_at = null where id = $1", [
    ownFamily.rows[0].id,
  ]);
  const trip = await client.query(
    `insert into public.trips (owner_id, name, destination, start_date, end_date)
     values ($1, 'ZZ_TEST transaction RPC trip', 'Audit fixture', current_date, current_date + 1)
     returning id`,
    [callerId]
  );
  await client.query(
    `insert into public.trip_members (trip_id, user_id, role, status)
     values ($1, $2, 'member', 'active'), ($1, $3, 'member', 'inactive')`,
    [trip.rows[0].id, familyMemberId, nonTripMemberId]
  );
  const foreignSeriesId = uuid();
  await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, currency, is_installment, series_id, current_installment,
        total_installments)
     values ($1, $1, 10, 'ZZ_TEST RPC foreign series', current_date,
             date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL',
             'BRL', true, $2, 1, 3)`,
    [otherUserId, foreignSeriesId]
  );

  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);

  const historicalProjectionDate = await client.query(
    "select (date_trunc('month', current_date)::date - 1) as end_date"
  );
  const historicalBaseline = await client.query(
    "select * from public.get_monthly_projection_v2($1, 'BRL')",
    [historicalProjectionDate.rows[0].end_date]
  );
  const currentBaseline = await client.query(
    "select * from public.get_monthly_projection_v2(current_date, 'BRL')"
  );
  const inactiveProjectionAccountId = uuid();
  await client.query("RESET ROLE");
  await client.query(
    `insert into public.accounts (id, user_id, name, type, balance, is_active)
     values ($1, $2, 'ZZ_TEST inactive projection account', 'CHECKING', 0, false)`,
    [inactiveProjectionAccountId, callerId]
  );
  await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, account_id, amount, description, date,
        competence_date, type, domain, currency)
     values
       ($1, $1, $2, 11, 'ZZ_TEST posted active income', current_date,
        date_trunc('month', current_date)::date, 'INCOME', 'PERSONAL', 'BRL'),
       ($1, $1, $2, 4, 'ZZ_TEST posted active expense', current_date,
        date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL', 'BRL'),
       ($1, $1, $3, 1000, 'ZZ_TEST posted inactive income', current_date,
        date_trunc('month', current_date)::date, 'INCOME', 'PERSONAL', 'BRL'),
       ($1, $1, $3, 500, 'ZZ_TEST posted inactive expense', current_date,
        date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL', 'BRL'),
       ($1, $1, $2, 7, 'ZZ_TEST future active income', current_date + 1,
        date_trunc('month', current_date)::date, 'INCOME', 'PERSONAL', 'BRL'),
       ($1, $1, $2, 3, 'ZZ_TEST future active expense', current_date + 1,
        date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL', 'BRL'),
       ($1, $1, $3, 100, 'ZZ_TEST future inactive income', current_date + 1,
        date_trunc('month', current_date)::date, 'INCOME', 'PERSONAL', 'BRL'),
       ($1, $1, $3, 50, 'ZZ_TEST future inactive expense', current_date + 1,
        date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL', 'BRL')`,
    [callerId, ownAccountId, inactiveProjectionAccountId]
  );
  await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, account_id, destination_account_id, amount,
        description, date, competence_date, type, domain, currency)
     values
       ($1, $1, $2, $3, 5, 'ZZ_TEST active to inactive transfer', current_date,
        date_trunc('month', current_date)::date, 'TRANSFER', 'PERSONAL', 'BRL'),
       ($1, $1, $3, $2, 2, 'ZZ_TEST inactive to active transfer', current_date,
        date_trunc('month', current_date)::date, 'TRANSFER', 'PERSONAL', 'BRL')`,
    [callerId, ownAccountId, inactiveProjectionAccountId]
  );
  const softDeletedProjectionTransaction = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, account_id, amount, description, date,
        competence_date, type, domain, currency, is_shared, payer_id)
     values ($1, $1, $2, 100, 'ZZ_TEST shared projection soft-delete',
             current_date, date_trunc('month', current_date)::date,
             'EXPENSE', 'PERSONAL', 'BRL', true, null)
     returning id`,
    [callerId, ownAccountId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, member_id, name, percentage, amount,
        is_settled, settled_by_creditor, deleted_at)
     values ($1, $2, $3, 'ZZ_TEST deleted projection split', 100, 1000,
             false, false, now())`,
    [softDeletedProjectionTransaction.rows[0].id, callerId, foreignMember.rows[0].id]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  const historicalAfterFixtures = await client.query(
    "select * from public.get_monthly_projection_v2($1, 'BRL')",
    [historicalProjectionDate.rows[0].end_date]
  );
  const currentAfterFixtures = await client.query(
    "select * from public.get_monthly_projection_v2(current_date, 'BRL')"
  );
  assert(
    Number(historicalAfterFixtures.rows[0].current_balance) ===
      Number(historicalBaseline.rows[0].current_balance),
    "historical projection reverses only posted movements in active accounts"
  );
  assert(
    Number(currentAfterFixtures.rows[0].future_income) === 7 &&
      Number(currentAfterFixtures.rows[0].future_expenses) === 3,
    "monthly projection ignores future income and expenses in inactive accounts"
  );
  assert(
    Number(currentAfterFixtures.rows[0].shared_debts) ===
      Number(currentBaseline.rows[0].shared_debts),
    "monthly projection excludes a soft-deleted shared split"
  );

  await client.query("RESET ROLE");
  const activeSharedExpense = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, account_id, amount, description, date,
        competence_date, type, domain, currency, is_shared, payer_id)
     values ($1, $1, $2, 20, 'ZZ_TEST summary active expense', current_date,
             date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL',
             'BRL', true, null)
     returning id`,
    [callerId, ownAccountId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, member_id, name, percentage, amount, is_settled)
     values ($1, $2, $3, 'ZZ_TEST summary active split', 100, 20, false)`,
    [activeSharedExpense.rows[0].id, callerId, ownMember.rows[0].id]
  );
  const sharedIncome = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, account_id, amount, description, date,
        competence_date, type, domain, currency, is_shared, payer_id)
     values ($1, $1, $2, 40, 'ZZ_TEST summary shared income', current_date,
             date_trunc('month', current_date)::date, 'INCOME', 'PERSONAL',
             'BRL', true, null)
     returning id`,
    [callerId, ownAccountId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, member_id, name, percentage, amount, is_settled)
     values ($1, $2, $3, 'ZZ_TEST summary income split', 100, 40, false)`,
    [sharedIncome.rows[0].id, callerId, ownMember.rows[0].id]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  const sharedSummary = await client.query(
    "select public.get_shared_expense_summary_by_person_v2(current_date - 1, current_date + 1) as summary"
  );
  assert(
    sharedSummary.rows[0].summary.length === 1 &&
      Number(sharedSummary.rows[0].summary[0].owes) === 20 &&
      Number(sharedSummary.rows[0].summary[0].tx_count) === 1,
    "shared expense summary excludes deleted splits and shared income"
  );
  await expectSqlState(
    () =>
      client.query("select public.migrate_transactions_to_account($1, $2, $3)", [
        ownAccountId,
        inactiveProjectionAccountId,
        callerId,
      ]),
    "P0001",
    "transaction migration rejects an inactive destination account"
  );
  await expectSqlState(
    () =>
      client.query("select public.assign_default_account_to_orphans($1, $2)", [
        inactiveProjectionAccountId,
        callerId,
      ]),
    "P0001",
    "orphan assignment rejects an inactive destination account"
  );

  const transaction = (accountId, extra = {}) => ({
    amount: 10,
    description: "ZZ_TEST RPC transaction",
    date: new Date().toISOString().slice(0, 10),
    competence_date: `${new Date().toISOString().slice(0, 7)}-01`,
    type: "EXPENSE",
    account_id: accountId,
    domain: "PERSONAL",
    idempotency_key: uuid(),
    ...extra,
  });
  const create = (payload, splits = []) =>
    client.query(
      `select public.create_transaction_with_splits_v2($1::jsonb, $2::jsonb) as result`,
      [JSON.stringify(payload), JSON.stringify(splits)]
    );

  const validTransaction = await create(transaction(ownAccountId));
  assert(Boolean(validTransaction.rows[0]?.result?.id), "own account transaction can be created");

  await expectSqlState(
    () => create(transaction(foreignAccountId)),
    "42501",
    "transaction cannot reference another user's account"
  );
  await expectSqlState(
    () => create(transaction(ownAccountId, { destination_account_id: foreignAccountId })),
    "42501",
    "transaction cannot transfer to another user's account"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: foreignMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 100,
          amount: 10,
          name: "ZZ_TEST foreign member",
        },
      ]),
    "42501",
    "split cannot reference a member from another family"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: otherUserId,
          percentage: 100,
          amount: 10,
          name: "ZZ_TEST own member",
        },
      ]),
    "42501",
    "split user_id must match its family member"
  );
  const validSplitTransaction = await create(transaction(ownAccountId), [
    {
      member_id: ownMember.rows[0].id,
      user_id: familyMemberId,
      percentage: 100,
      amount: 10,
      name: "ZZ_TEST own member",
    },
  ]);
  assert(
    Boolean(validSplitTransaction.rows[0]?.result?.id),
    "active family member split can be created"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 100,
          amount: 9.99,
          name: "ZZ_TEST amount mismatch",
        },
      ]),
    "22023",
    "split amounts must sum exactly to the transaction total in cents"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 100,
          amount: 10.005,
          name: "ZZ_TEST fractional cent",
        },
      ]),
    "22023",
    "each split amount must use whole cents before database rounding"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 99,
          amount: 10,
          name: "ZZ_TEST percentage mismatch",
        },
      ]),
    "22023",
    "split percentages must total 100"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 100,
          amount: 10,
          is_settled: true,
          name: "ZZ_TEST forged settlement",
        },
      ]),
    "22023",
    "a new split cannot be created as already settled"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId), [
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 50,
          amount: 5,
          name: "ZZ_TEST duplicate member first half",
        },
        {
          member_id: ownMember.rows[0].id,
          user_id: familyMemberId,
          percentage: 50,
          amount: 5,
          name: "ZZ_TEST duplicate member second half",
        },
      ]),
    "22023",
    "a family member cannot occur twice in one split"
  );

  const validTripTransaction = await create(
    transaction(ownAccountId, {
      trip_id: trip.rows[0].id,
      payer_id: ownMember.rows[0].id,
      domain: "TRAVEL",
    }),
    [
      {
        member_id: ownMember.rows[0].id,
        user_id: familyMemberId,
        percentage: 100,
        amount: 10,
        name: "ZZ_TEST active trip family member",
      },
    ]
  );
  assert(
    Boolean(validTripTransaction.rows[0]?.result?.id),
    "active trip family member can be payer and split participant"
  );
  await expectSqlState(
    () =>
      create(
        transaction(ownAccountId, {
          trip_id: trip.rows[0].id,
          payer_id: nonTripMember.rows[0].id,
          domain: "TRAVEL",
        })
      ),
    "42501",
    "trip payer must be an active participant in the trip"
  );
  await expectSqlState(
    () =>
      create(transaction(ownAccountId, { trip_id: trip.rows[0].id, domain: "TRAVEL" }), [
        {
          member_id: nonTripMember.rows[0].id,
          user_id: nonTripMemberId,
          percentage: 100,
          amount: 10,
          name: "ZZ_TEST non-trip family member",
        },
      ]),
    "42501",
    "trip split member must be an active participant in the trip"
  );

  const installmentPayload = [
    {
      ...transaction(ownAccountId, {
        is_installment: true,
        series_id: uuid(),
        current_installment: 1,
        total_installments: 2,
        splits: [],
      }),
    },
  ];
  const installmentResult = await client.query(
    `select public.create_installment_series_v2($1::jsonb) as result`,
    [JSON.stringify(installmentPayload)]
  );
  assert(
    Array.isArray(installmentResult.rows[0]?.result),
    "own account installment can be created"
  );

  const splitSeriesId = uuid();
  const splitInstallments = [1, 2].map((installmentNumber) => ({
    ...installmentPayload[0],
    idempotency_key: uuid(),
    series_id: splitSeriesId,
    current_installment: installmentNumber,
    splits: [
      {
        member_id: ownMember.rows[0].id,
        user_id: familyMemberId,
        percentage: 100,
        amount: 10,
        name: "ZZ_TEST valid installment split",
      },
    ],
  }));
  const splitSeriesResult = await client.query(
    `select public.create_installment_series_v2($1::jsonb) as result`,
    [JSON.stringify(splitInstallments)]
  );
  assert(
    splitSeriesResult.rows[0]?.result?.length === 2,
    "valid split amounts and percentages are checked for every installment"
  );
  const invalidSplitSeriesId = uuid();
  const invalidSplitSeriesWithOneId = splitInstallments.map((installment, index) => ({
    ...installment,
    series_id: invalidSplitSeriesId,
    current_installment: index + 1,
    idempotency_key: uuid(),
    splits: [
      {
        ...installment.splits[0],
        amount: index === 1 ? 9.99 : 10,
      },
    ],
  }));
  await expectSqlState(
    () =>
      client.query(`select public.create_installment_series_v2($1::jsonb)`, [
        JSON.stringify(invalidSplitSeriesWithOneId),
      ]),
    "22023",
    "one installment with an inconsistent split prevents the whole series"
  );

  await expectSqlState(
    () =>
      client.query(`select public.create_installment_series_v2($1::jsonb)`, [
        JSON.stringify([
          {
            ...installmentPayload[0],
            series_id: foreignSeriesId,
            current_installment: 2,
          },
        ]),
      ]),
    "42501",
    "an authenticated user cannot attach installments to another user's series"
  );

  await expectSqlState(
    () =>
      client.query(`select public.create_installment_series_v2($1::jsonb)`, [
        JSON.stringify([
          { ...installmentPayload[0], trip_id: trip.rows[0].id, domain: "TRAVEL" },
          { ...installmentPayload[0], trip_id: null, domain: "PERSONAL" },
        ]),
      ]),
    "22023",
    "installment series cannot mix travel and non-travel transactions"
  );

  await expectSqlState(
    () =>
      client.query(`select public.create_installment_series_v2($1::jsonb)`, [
        JSON.stringify([{ ...installmentPayload[0], account_id: foreignAccountId }]),
      ]),
    "42501",
    "installment series cannot reference another user's account"
  );
  await expectSqlState(
    () =>
      client.query(`select public.create_installment_series_v2($1::jsonb)`, [
        JSON.stringify([
          {
            ...installmentPayload[0],
            splits: [{ member_id: foreignMember.rows[0].id, user_id: familyMemberId }],
          },
        ]),
      ]),
    "42501",
    "installment split cannot reference a member from another family"
  );

  await client.query("RESET ROLE");
  const deletableSeriesId = uuid();
  const dateForSeriesRow = async (dateSql, installmentNumber, settled = false) => {
    const { rows } = await client.query(
      `insert into public.transactions
         (user_id, creator_user_id, amount, description, date, competence_date,
          type, domain, currency, is_installment, series_id, current_installment,
          total_installments, is_settled)
       values ($1, $1, 10, 'ZZ_TEST delete installment series', ${dateSql},
               date_trunc('month', (${dateSql})::date)::date, 'EXPENSE', 'PERSONAL',
               'BRL', true, $2, $3, 2, $4)
       returning id`,
      [callerId, deletableSeriesId, installmentNumber, settled]
    );
    return rows[0].id;
  };
  const pastSeriesTransactionId = await dateForSeriesRow("current_date - 7", 1);
  const futureSeriesTransactionId = await dateForSeriesRow("current_date + 7", 2);
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  const deletedSeriesResult = await client.query(
    "select * from public.delete_installment_series($1)",
    [deletableSeriesId]
  );
  assert(
    Number(deletedSeriesResult.rows[0]?.deleted_count) === 1,
    "series deletion reports only future original installments"
  );
  await client.query("RESET ROLE");
  const deletedSeriesState = await client.query(
    `select id, deleted_at from public.transactions where id = any($1::uuid[])`,
    [[pastSeriesTransactionId, futureSeriesTransactionId]]
  );
  assert(
    deletedSeriesState.rows.find((row) => row.id === pastSeriesTransactionId)?.deleted_at ===
      null &&
      deletedSeriesState.rows.find((row) => row.id === futureSeriesTransactionId)?.deleted_at !==
        null,
    "series deletion soft-deletes future installments and preserves past installments"
  );

  const settledSeriesId = uuid();
  await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, currency, is_installment, series_id, current_installment,
        total_installments, is_settled)
     values ($1, $1, 10, 'ZZ_TEST settled installment series', current_date + 3,
             date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL',
             'BRL', true, $2, 1, 2, true)`,
    [callerId, settledSeriesId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  await expectSqlState(
    () => client.query("select * from public.delete_installment_series($1)", [settledSeriesId]),
    "55000",
    "series deletion rejects a settled installment"
  );
  await client.query("RESET ROLE");

  const partiallySettledSeriesId = uuid();
  const partiallySettledTransaction = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, currency, is_installment, series_id, current_installment,
        total_installments)
     values ($1, $1, 10, 'ZZ_TEST partially settled installment series',
             current_date + 3, date_trunc('month', current_date)::date,
             'EXPENSE', 'PERSONAL', 'BRL', true, $2, 1, 2)
     returning id`,
    [callerId, partiallySettledSeriesId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, name, percentage, amount, is_settled, settled_by_debtor,
        settled_at)
     values ($1, $2, 'ZZ_TEST partially settled split', 100, 10, false, true, now())`,
    [partiallySettledTransaction.rows[0].id, callerId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  await expectSqlState(
    () =>
      client.query("select * from public.delete_installment_series($1)", [
        partiallySettledSeriesId,
      ]),
    "55000",
    "series deletion rejects a partially settled split"
  );
  await client.query("RESET ROLE");

  const timestampSettledSeriesId = uuid();
  const timestampSettledTransaction = await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, currency, is_installment, series_id, current_installment,
        total_installments)
     values ($1, $1, 10, 'ZZ_TEST timestamp-settled installment series',
             current_date + 3, date_trunc('month', current_date)::date,
             'EXPENSE', 'PERSONAL', 'BRL', true, $2, 1, 2)
     returning id`,
    [callerId, timestampSettledSeriesId]
  );
  await client.query(
    `insert into public.transaction_splits
       (transaction_id, user_id, name, percentage, amount, is_settled, settled_at)
     values ($1, $2, 'ZZ_TEST timestamp-only settled split', 100, 10, false, now())`,
    [timestampSettledTransaction.rows[0].id, callerId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  await expectSqlState(
    () =>
      client.query("select * from public.delete_installment_series($1)", [
        timestampSettledSeriesId,
      ]),
    "55000",
    "series deletion rejects a settlement timestamp even if flags are inconsistent"
  );
  await client.query("RESET ROLE");

  await client.query(
    `insert into public.transactions
       (user_id, creator_user_id, amount, description, date, competence_date,
        type, domain, currency, is_installment, series_id, current_installment,
        total_installments)
     values ($1, $1, 10, 'ZZ_TEST colliding caller series', current_date + 3,
             date_trunc('month', current_date)::date, 'EXPENSE', 'PERSONAL',
             'BRL', true, $2, 2, 3)`,
    [callerId, foreignSeriesId]
  );
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [callerId]);
  await expectSqlState(
    () => client.query("select * from public.delete_installment_series($1)", [foreignSeriesId]),
    "42501",
    "series deletion rejects a series shared across owners"
  );
  await client.query("RESET ROLE");
  const foreignSeriesRows = await client.query(
    `select user_id, deleted_at from public.transactions where series_id = $1 and source_transaction_id is null`,
    [foreignSeriesId]
  );
  assert(
    foreignSeriesRows.rows.length === 2 &&
      foreignSeriesRows.rows.every((row) => row.deleted_at === null),
    "cross-owner series rejection preserves both users' installments"
  );

  await client.query("RESET ROLE");
  await client.query("ROLLBACK");
  testDataRestored = true;
} catch (error) {
  if (!testDataRestored) {
    await client.query("ROLLBACK").catch(() => {});
    testDataRestored = true;
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(JSON.stringify({ checks, failures, testDataRestored }, null, 2));
if (failures.length || !testDataRestored) process.exitCode = 1;
