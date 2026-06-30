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
    "20260630230000_fix_production_issues.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  const c = await pool.connect();
  try {
    console.log("Applying migration...");
    await c.query(sql);
    console.log("Migration applied successfully!");

    // Verify
    let r = await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='financial_ledger'"
    );
    console.log("financial_ledger exists:", r.rows.length > 0);

    r = await c.query(
      "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='notifications_type_check'"
    );
    console.log(
      "notifications_type_check:",
      r.rows[0]?.pg_get_constraintdef?.includes("SYSTEM") ? "Includes SYSTEM" : "Missing SYSTEM"
    );
  } catch (e) {
    console.error("Migration failed:", e.message);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
