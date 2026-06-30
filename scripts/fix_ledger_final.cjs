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
    // Add missing columns to financial_ledger
    console.log("Adding missing columns...");

    await c.query(
      "ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL"
    );
    console.log("1. related_user_id added");

    await c.query(
      "ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS related_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL"
    );
    console.log("2. related_member_id added");

    await c.query(
      "CREATE INDEX IF NOT EXISTS idx_fl_related_user ON financial_ledger(related_user_id)"
    );
    await c.query(
      "CREATE INDEX IF NOT EXISTS idx_fl_related_member ON financial_ledger(related_member_id)"
    );
    console.log("3. Indexes created");

    // Check profiles.full_name
    let r = await c.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND table_schema='public' AND column_name='full_name'"
    );
    if (r.rows.length === 0) {
      console.log("profiles.full_name MISSING - fixing...");
      await c.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT");
      // Populate with name or email
      await c.query(
        "UPDATE profiles SET full_name = COALESCE(name, 'Usuário') WHERE full_name IS NULL"
      );
      console.log("profiles.full_name added and populated");
    } else {
      console.log("profiles.full_name: EXISTS");
    }

    // Verify final schema
    r = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='financial_ledger' AND table_schema='public' ORDER BY ordinal_position"
    );
    console.log("\nFinal financial_ledger columns:");
    r.rows.forEach((c) => console.log("  " + c.column_name + " (" + c.data_type + ")"));

    console.log("\nALL FIXES APPLIED");
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => console.error(e.message));
