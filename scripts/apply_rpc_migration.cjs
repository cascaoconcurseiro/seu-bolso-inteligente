const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const DB_HOST = "aws-1-us-east-1.pooler.supabase.com";
const DB_PASSWORD = "QvEds5x3KcdnQhi2";
const DB_USER = "postgres.vrrcagukyfnlhxuvnssp";
const DB_NAME = "postgres";
const DB_PORT = 6543;

async function main() {
  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test connection
    const { rows: version } = await pool.query("SELECT version()");
    console.log("Connected:", version[0].version.substring(0, 60));

    // Check if RPC function exists
    const { rows: existing } = await pool.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'create_transaction_with_splits'
    `);

    if (existing.length > 0) {
      console.log("RPC create_transaction_with_splits EXISTS already.");
      console.log("Source preview:", existing[0].prosrc.substring(0, 200));
    } else {
      console.log("RPC create_transaction_with_splits NOT FOUND.");
    }

    // Apply the migration
    const migrationPath = path.join(
      __dirname,
      "supabase",
      "migrations",
      "20260626000000_fix_rpc_recurrence_fields.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");
    console.log("Applying migration:", path.basename(migrationPath));
    console.log("SQL length:", sql.length);

    await pool.query(sql);
    console.log("Migration applied successfully.");

    // Verify
    const { rows: verify } = await pool.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname = 'create_transaction_with_splits'
    `);
    console.log("RPC exists after migration:", verify.length > 0 ? "YES" : "NO");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
