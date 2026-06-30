const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com", port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp", password: "QvEds5x3KcdnQhi2",
  database: "postgres", ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000, max: 1, idleTimeoutMillis: 10000,
});

async function main() {
  const c = await pool.connect();
  try {
    // Check all failing tables
    const tables = [
      "budgets", "goals", "trips", "notifications", 
      "transaction_auto_share_rules", "family_invitations",
      "credit_card_invoices", "financial_entities"
    ];
    
    for (const tbl of tables) {
      console.log(`\n=== ${tbl} ===`);
      const r = await c.query(
        `SELECT column_name, data_type, is_nullable, column_default 
         FROM information_schema.columns 
         WHERE table_name = $1 AND table_schema = 'public' 
         ORDER BY ordinal_position`,
        [tbl]
      );
      if (r.rows.length === 0) {
        console.log("  TABLE NOT FOUND or no columns");
      } else {
        r.rows.forEach(col => {
          console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} default=${col.column_default || 'none'}`);
        });
      }
    }

    // Check RPC functions that returned 404
    console.log("\n=== MISSING RPCs ===");
    const rpcs = [
      "process_credit_card_invoice", "search_transactions", "get_budget_progress",
      "delete_user_account_rpc", "settle_transaction_split", "unsettle_transaction_split"
    ];
    for (const rpc of rpcs) {
      const r = await c.query(
        `SELECT proname FROM pg_proc WHERE proname = $1 AND pronamespace = 'public'::regnamespace`,
        [rpc]
      );
      console.log(`  ${rpc}: ${r.rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    }

    // Check notifications check constraints
    console.log("\n=== NOTIFICATIONS CONSTRAINTS ===");
    const nr = await c.query(
      `SELECT conname, consrc FROM pg_constraint 
       WHERE conrelid = 'notifications'::regclass AND contype = 'c'`
    );
    nr.rows.forEach(c => console.log(`  ${c.conname}: ${c.consrc}`));

    // Check triggers on transactions (for shared domain issue)
    console.log("\n=== TRANSACTIONS TRIGGERS ===");
    const tr = await c.query(
      `SELECT tgname, pg_get_triggerdef(oid) as def FROM pg_trigger 
       WHERE tgrelid = 'transactions'::regclass AND NOT tgisinternal`
    );
    tr.rows.forEach(t => console.log(`  ${t.tgname}: ${t.def.substring(0, 150)}`));

  } finally {
    c.release();
    await pool.end();
  }
}

main().catch(e => console.error("ERR:", e.message));
