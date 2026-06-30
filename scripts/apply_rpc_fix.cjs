const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp",
  password: "QvEds5x3KcdnQhi2",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  max: 1,
});

async function main() {
  const sqlPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20260630230002_fix_rpc_ledger_complete.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  const c = await pool.connect();
  try {
    console.log("Applying migration...");
    await c.query(sql);
    console.log("Migration applied!");

    // Verify new signatures
    let r = await c.query(
      "SELECT oid::regprocedure::text FROM pg_proc WHERE proname IN ('create_transaction_with_splits', 'create_installment_series') AND pronamespace='public'::regnamespace"
    );
    console.log("New signatures:");
    r.rows.forEach((rr) => console.log("  " + rr.oid));

    // Test RPC with p_user_id
    console.log("\nTesting RPC with p_user_id...");
    r = await c.query("SELECT create_transaction_with_splits($1::jsonb, $2::jsonb, $3::uuid)", [
      JSON.stringify({
        amount: 1,
        description: "RPC-TEST",
        date: "2026-06-30",
        competence_date: "2026-06-01",
        type: "EXPENSE",
        domain: "PERSONAL",
        is_shared: false,
        is_recurring: false,
        is_installment: false,
      }),
      JSON.stringify([]),
      "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
    ]);
    console.log(
      "RPC result:",
      JSON.stringify(r.rows[0]?.create_transaction_with_splits).substring(0, 100)
    );

    // Cleanup test
    if (r.rows[0]?.create_transaction_with_splits?.id) {
      await c.query("DELETE FROM transactions WHERE id = $1", [
        r.rows[0].create_transaction_with_splits.id,
      ]);
      console.log("Test cleaned up");
    }
  } catch (e) {
    console.error("FAILED:", e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
