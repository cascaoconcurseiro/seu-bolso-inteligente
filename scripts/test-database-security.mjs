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
  }

  console.log(`Database security checks passed (${v2Signatures.length} v2 RPCs)`);
} finally {
  await client.end();
}
