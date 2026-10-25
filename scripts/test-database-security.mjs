import pg from "pg";
import { getVerifiedDbConnectionConfig } from "./lib/verified-db-connection.mjs";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required");
}

const { Client } = pg;
const client = new Client(getVerifiedDbConnectionConfig(connectionString));

const v2Signatures = [
  "create_installment_series_v2(jsonb)",
  "create_transaction_with_splits_v2(jsonb,jsonb)",
  "get_current_shared_debts_v2(date,date)",
  "get_dashboard_summary_v2(date,date)",
  "get_monthly_evolution_report_v2(integer)",
  "get_monthly_financial_summary_v2(date,date)",
  "get_monthly_projection_v2(date,character varying)",
  "get_net_worth_v2()",
  "get_shared_expense_summary_by_person_v2(date,date)",
  "get_shared_invoice_data_v2()",
  "get_user_budgets_progress_v2(date,date)",
  "get_user_budgets_progress_with_rollover_v2(date,date)",
  "get_wealth_evolution_v2(integer,character varying)",
  "request_settlement_v2(uuid[],uuid,boolean,numeric)",
  "undo_settlement_v2(uuid)",
  "get_account_balance_at_date_v2(uuid,date)",
  "get_trip_participant_balances_v2(uuid)",
];

const legacySignatures = [
  "create_installment_series(jsonb,uuid)",
  "create_transaction_with_splits(jsonb,jsonb,uuid)",
  "get_current_shared_debts(uuid,date,date)",
  "get_dashboard_summary(uuid,date,date)",
  "get_monthly_evolution_report(uuid,integer)",
  "get_monthly_financial_summary(uuid,date,date)",
  "get_monthly_projection(uuid,date,character varying)",
  "get_net_worth(uuid)",
  "get_shared_expense_summary_by_person(uuid,date,date)",
  "get_shared_invoice_data(uuid)",
  "get_user_budgets_progress(uuid,date,date)",
  "get_user_budgets_progress_with_rollover(uuid,date,date)",
  "get_wealth_evolution(uuid,integer,character varying)",
  "request_settlement(uuid[],uuid,uuid,boolean,numeric)",
  "undo_settlement(uuid,uuid)",
  "get_account_balance_at_date(uuid,date)",
  "get_trip_participant_balances(uuid)",
  "undo_shared_settlements(uuid[])",
];

const disabledAdminSignatures = ["admin_reset_all_data()", "admin_reset_single_user(uuid)"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function canExecute(role, signature) {
  const { rows } = await client.query(
    "select has_function_privilege($1, ('public.' || $2)::regprocedure, 'execute') as allowed",
    [role, signature]
  );
  return rows[0].allowed;
}

async function expectSqlState(sql, expectedState, label) {
  try {
    await client.query(sql);
  } catch (error) {
    assert(
      error.code === expectedState,
      `${label}: expected ${expectedState}, received ${error.code}`
    );
    return;
  }
  throw new Error(`${label}: call unexpectedly succeeded`);
}

try {
  await client.connect();

  const { rows: anonymousFunctions } = await client.query(`
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'execute')
  `);
  assert(
    anonymousFunctions.length === 0,
    `public functions exposed to anon: ${anonymousFunctions.map((row) => row.signature).join(", ")}`
  );

  const { rows: extensionSchemas } = await client.query(`
    select n.nspname as schema_name
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
  `);
  assert(extensionSchemas[0]?.schema_name === "extensions", "pg_trgm is not in extensions schema");

  assert(
    !(await client
      .query(
        "select has_table_privilege('authenticated', 'public.admin_users', 'select') as allowed"
      )
      .then(({ rows }) => rows[0].allowed)),
    "admin_users is directly readable by authenticated"
  );

  const { rows: duplicatePolicies } = await client.query(`
    with expanded as (
      select schemaname, tablename, cmd, policyname,
             unnest(roles) as policy_role
      from pg_policies
      where permissive = 'PERMISSIVE'
        and schemaname = 'public'
        and tablename = any(array[
          'error_logs', 'shared_credit_cards', 'transaction_splits',
          'transactions', 'trip_invitations'
        ])
    )
    select tablename, cmd, policy_role, count(*)
    from expanded
    group by tablename, cmd, policy_role
    having count(*) > 1
  `);
  assert(duplicatePolicies.length === 0, "consolidated tables have overlapping policies");

  const { rows: errorLogContract } = await client.query(`
    select
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'error_logs'
          and column_name = 'updated_at' and is_nullable = 'NO'
      ) as has_updated_at,
      exists (
        select 1 from pg_trigger
        where tgrelid = 'public.error_logs'::regclass
          and tgname = 'trg_error_logs_updated_at' and not tgisinternal
      ) as has_update_trigger
  `);
  assert(errorLogContract[0].has_updated_at, "error_logs.updated_at contract is missing");
  assert(errorLogContract[0].has_update_trigger, "error_logs updated_at trigger is missing");

  for (const signature of v2Signatures) {
    assert(
      await canExecute("authenticated", signature),
      `${signature} is not granted to authenticated`
    );
    assert(!(await canExecute("anon", signature)), `${signature} is exposed to anon`);
  }

  for (const signature of legacySignatures) {
    assert(
      !(await canExecute("authenticated", signature)),
      `${signature} is still exposed to authenticated`
    );
    assert(!(await canExecute("anon", signature)), `${signature} is exposed to anon`);
  }

  assert(
    await canExecute("service_role", "undo_shared_settlements(uuid[])"),
    "undo_shared_settlements(uuid[]) must remain available to service_role"
  );

  for (const signature of disabledAdminSignatures) {
    for (const role of ["anon", "authenticated", "service_role"]) {
      assert(
        !(await canExecute(role, signature)),
        `${signature} must remain disabled for ${role}`
      );
    }
  }

  const { rows: crossUserFixtures } = await client.query(`
    select account.id as account_id, attacker.id as attacker_id
    from public.accounts account
    join auth.users attacker on attacker.id <> account.user_id
    where account.deleted_at is null
      and attacker.id not in (select user_id from public.admin_users)
    order by account.created_at asc, attacker.created_at asc
    limit 1
  `);
  assert(
    crossUserFixtures.length > 0,
    "cross-user isolation requires an active account and a different provisioned non-admin user"
  );

  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      crossUserFixtures[0].attacker_id,
    ]);
    await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
    await expectSqlState(
      `select public.get_account_balance_at_date_v2('${crossUserFixtures[0].account_id}'::uuid, current_date)`,
      "42501",
      "cross-user account isolation"
    );
  } finally {
    await client.query("rollback");
  }

  const { rows: nonAdmins } = await client.query(
    "select id from auth.users where id <> all(select user_id from public.admin_users) limit 1"
  );
  assert(nonAdmins.length > 0, "admin isolation requires at least one provisioned non-admin user");

  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [nonAdmins[0].id]);
    await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
    await expectSqlState(
      "select public.get_admin_error_logs()",
      "42501",
      "admin error log isolation"
    );
  } finally {
    await client.query("rollback");
  }

  console.log(`Database security checks passed (${v2Signatures.length} v2 RPCs)`);
} finally {
  await client.end();
}
