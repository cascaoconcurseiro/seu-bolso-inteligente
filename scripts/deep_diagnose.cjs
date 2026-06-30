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
  idleTimeoutMillis: 10000,
});

async function main() {
  const c = await pool.connect();
  try {
    // Check triggers on transactions
    let r = await c.query(
      "SELECT tgname, pg_get_triggerdef(oid) as def FROM pg_trigger WHERE tgrelid='transactions'::regclass AND NOT tgisinternal"
    );
    console.log("=== TRANSACTIONS TRIGGERS ===");
    r.rows.forEach((rr) => console.log(rr.tgname + ": " + rr.def.substring(0, 250)));

    // Notifications constraints
    r = await c.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid='notifications'::regclass"
    );
    console.log("\n=== NOTIFICATIONS CONSTRAINTS ===");
    r.rows.forEach((rr) => console.log(rr.conname + ": " + rr.def));

    // All RPCs
    r = await c.query(
      "SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND prokind='f' ORDER BY proname"
    );
    console.log("\n=== ALL RPCs (" + r.rows.length + ") ===");
    r.rows.forEach((rr) => console.log("  " + rr.proname));

    // Check specific migration files for missing RPCs
    r = await c.query(
      "SELECT id, name FROM supabase_migrations.schema_migrations WHERE name LIKE '%invoice%' OR name LIKE '%budget%progress%' OR name LIKE '%delete_user%' OR name LIKE '%settle%' OR name LIKE '%unsettle%' ORDER BY name"
    );
    console.log("\n=== RELEVANT MIGRATIONS ===");
    r.rows.forEach((rr) => console.log("  " + rr.id + " " + rr.name));

    // Check if notifications type has constraint
    console.log("\n=== NOTIFICATIONS TYPE CHECK ===");
    r = await c.query("SELECT enum_range(NULL::notification_type) as vals");
    console.log("notification_type enum:", r.rows[0]?.vals || "NOT FOUND");

    // Check what caused the trigger error for shared transactions
    console.log("\n=== TRIGGER FUNCTION BODIES (looking for financial) ===");
    r = await c.query(
      "SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%financial%' OR prosrc LIKE '%financial_entities%' LIMIT 5"
    );
    r.rows.forEach((rr) => {
      const match = rr.prosrc.match(/financial_entities/gi);
      if (match)
        console.log(rr.proname + " references financial_entities (" + match.length + " times)");
    });

    // Check if financial_entities table exists anywhere
    r = await c.query(
      "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%financial%'"
    );
    console.log(
      "\nFinancial tables:",
      r.rows.map((rr) => rr.schemaname + "." + rr.tablename).join(", ") || "NONE"
    );
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => console.error("ERR:", e.message));
