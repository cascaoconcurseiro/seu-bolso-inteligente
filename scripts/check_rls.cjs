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
  idleTimeoutMillis: 5000,
});

async function main() {
  const c = await pool.connect();
  try {
    // RLS policies on transactions
    let r = await c.query(
      "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='transactions' AND schemaname='public'"
    );
    console.log("=== RLS on transactions ===");
    r.rows.forEach((rr) =>
      console.log(
        "  " + rr.policyname + " [" + rr.cmd + "] qual=" + (rr.qual || "—").substring(0, 120)
      )
    );

    // Check if table has RLS enabled
    r = await c.query(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relname='transactions' AND relnamespace='public'::regnamespace"
    );
    console.log("RLS enabled on transactions:", r.rows[0]?.relrowsecurity);

    // Check grants
    r = await c.query(
      "SELECT privilege_type FROM information_schema.table_privileges WHERE table_name='transactions' AND table_schema='public' AND grantee='authenticated'"
    );
    console.log("Grants to authenticated:", r.rows.map((rr) => rr.privilege_type).join(", "));

    // Check schema usage
    r = await c.query("SELECT has_schema_privilege('authenticated', 'public', 'usage') as usage");
    console.log("authenticated USAGE on public:", r.rows[0]?.usage);

    // Check INSERT specifically
    r = await c.query(
      "SELECT has_table_privilege('authenticated', 'public.transactions', 'insert') as can_insert"
    );
    console.log("authenticated INSERT on transactions:", r.rows[0]?.can_insert);

    // Check auth.uid() for a random user to see if roles work
    console.log("\nDone.");
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
