const { Pool } = require("pg");
const p = new Pool({host:"aws-1-us-east-1.pooler.supabase.com",port:6543,user:"postgres.vrrcagukyfnlhxuvnssp",password:"QvEds5x3KcdnQhi2",database:"postgres",ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000,max:1});

async function main() {
  const c = await p.connect();
  try {
    const fns = ["search_transactions","get_user_budgets_progress_with_rollover","settle_split","get_credit_card_invoice","soft_delete_transaction","restore_transaction"];
    for (const fn of fns) {
      let r = await c.query("SELECT pg_get_function_arguments(oid) as a, pg_get_function_result(oid) as r FROM pg_proc WHERE proname=$1", [fn]);
      if (r.rows.length > 0) {
        console.log(fn + "(" + r.rows[0].a + ") -> " + r.rows[0].r);
      } else {
        console.log(fn + ": NOT FOUND");
      }
    }
    
    // Check transaction_splits POST
    console.log("\n=== TRANSACTION_SPLITS INSERT TEST ===");
    try {
      let r = await c.query("INSERT INTO transaction_splits (transaction_id, member_id, user_id, percentage, amount, name, is_settled) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        ["00000000-0000-0000-0000-000000000000", "00000000-0000-0000-0000-000000000000", "56ccd60b-641f-4265-bc17-7b8705a2f8c9", 50, 100, "Test", false]);
      console.log("Insert direct OK");
    } catch(e) {
      console.log("Insert direct FAILED:", e.message);
    }

    // Check auto-share trigger_type constraint
    console.log("\n=== AUTO-SHARE CONSTRAINTS ===");
    let r = await c.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='transaction_auto_share_rules'::regclass");
    r.rows.forEach(rr => console.log(rr.conname + ": " + rr.pg_get_constraintdef));
    
  } finally { c.release(); await p.end(); }
}
main().catch(e => console.error(e.message));
