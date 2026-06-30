const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp",
  password: "QvEds5x3KcdnQhi2",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 1,
});

async function main() {
  const c = await pool.connect();
  try {
    // Get full source of create_ledger_entries_for_transaction
    let r = await c.query(
      "SELECT prosrc FROM pg_proc WHERE proname='create_ledger_entries_for_transaction'"
    );
    console.log("=== create_ledger_entries_for_transaction ===");
    console.log(r.rows[0]?.prosrc || "NOT FOUND");

    // Get full source of create_ledger_entries_for_split
    r = await c.query("SELECT prosrc FROM pg_proc WHERE proname='create_ledger_entries_for_split'");
    console.log("\n=== create_ledger_entries_for_split ===");
    console.log(r.rows[0]?.prosrc || "NOT FOUND");

    // Check current financial_ledger columns
    r = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='financial_ledger' AND table_schema='public' ORDER BY ordinal_position"
    );
    console.log("\n=== financial_ledger columns ===");
    r.rows.forEach((c) => console.log("  " + c.column_name + " (" + c.data_type + ")"));

    // Check triggers on transaction_splits
    r = await c.query(
      "SELECT tgname, pg_get_triggerdef(oid) as def FROM pg_trigger WHERE tgrelid='transaction_splits'::regclass AND NOT tgisinternal"
    );
    console.log("\n=== transaction_splits TRIGGERS ===");
    r.rows.forEach((t) => console.log("  " + t.tgname + ": " + t.def.substring(0, 200)));
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => console.error(e.message));
