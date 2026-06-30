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
    // Get test user
    let r = await c.query(
      "SELECT id, email, role FROM auth.users WHERE id='56ccd60b-641f-4265-bc17-7b8705a2f8c9'"
    );
    if (r.rows.length > 0) {
      console.log("User:", r.rows[0].email, "role:", r.rows[0].role);
    }

    // Check PostgREST schema exposure
    r = await c.query("SELECT setting FROM pg_settings WHERE name = 'pgrst.db_schemas'");
    console.log("PostgREST db_schemas:", r.rows[0]?.setting || "(default: public)");

    // Check if there are multiple versions of the function
    r = await c.query(
      "SELECT oid::regprocedure::text, pronamespace::regnamespace::text FROM pg_proc WHERE proname='create_transaction_with_splits'"
    );
    console.log("Function locations:", r.rows.map((rr) => rr.oid).join(", "));

    // Check if the function has any SECURITY INVOKER version in another schema
    r = await c.query(
      "SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname='create_transaction_with_splits'"
    );
    console.log("All function schemas:", r.rows.map((rr) => rr.nspname + "." + rr.proname + "(" + rr.pg_get_function_arguments + ")").join(" | "));

  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => console.error(e.message));
