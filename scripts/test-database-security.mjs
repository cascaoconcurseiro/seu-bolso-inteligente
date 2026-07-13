import pg from "pg";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL (or DATABASE_URL) is required");
}

const { Client } = pg;
const databaseUrl = new URL(connectionString);
databaseUrl.searchParams.delete("sslmode");
const client = new Client({
  connectionString: databaseUrl.toString(),
  ssl: { rejectUnauthorized: false },
});

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
];

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

  const { rows: users } = await client.query(
    "select id from auth.users order by created_at asc limit 2"
  );

  if (users.length >= 2) {
    const ownerId = users[0].id;
    const attackerId = users[1].id;
    const { rows: accounts } = await client.query(
      "select id from public.accounts where user_id = $1 and deleted_at is null limit 1",
      [ownerId]
    );

    if (accounts.length > 0) {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [attackerId]);
      await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
      await expectSqlState(
        `select public.get_account_balance_at_date_v2('${accounts[0].id}'::uuid, current_date)`,
        "42501",
        "cross-user account isolation"
      );
      await client.query("rollback");
    }

    const { rows: nonAdmins } = await client.query(
      "select id from auth.users where id <> all(select user_id from public.admin_users) limit 1"
    );
    if (nonAdmins.length > 0) {
      await client.query("begin");
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [nonAdmins[0].id]);
      await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
      await expectSqlState(
        "select public.get_admin_error_logs()",
        "42501",
        "admin error log isolation"
      );
      await client.query("rollback");
    }
  }

  console.log(`Database security checks passed (${v2Signatures.length} v2 RPCs)`);
} finally {
  await client.end();
}
