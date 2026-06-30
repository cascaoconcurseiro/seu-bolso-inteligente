const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp",
  password: "QvEds5x3KcdnQhi2",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function main() {
  try {
    // Check if is_active column exists in transactions
    const { rows: cols } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.log("transactions columns:");
    cols.forEach((c) => console.log(`  ${c.column_name} (${c.data_type})`));

    // Check is_active specifically
    const hasIsActive = cols.some((c) => c.column_name === "is_active");
    console.log("\nis_active column exists:", hasIsActive);

    // Check if there's a deleted_at or similar soft-delete column
    const softDeleteCols = cols.filter((c) =>
      ["deleted_at", "is_active", "is_deleted", "deleted"].includes(c.column_name)
    );
    console.log(
      "Soft delete columns:",
      softDeleteCols.map((c) => c.column_name).join(", ") || "NONE"
    );

    // Check the soft delete migration
    const { rows: migrations } = await pool.query(`
      SELECT id, name
      FROM supabase_migrations.schema_migrations
      WHERE name LIKE '%soft_delete%'
    `);
    console.log("\nSoft delete migrations applied:");
    migrations.forEach((m) => console.log(`  ${m.name}`));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
