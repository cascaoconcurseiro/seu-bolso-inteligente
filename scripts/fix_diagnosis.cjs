const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-us-east-1.pooler.supabase.com", port: 6543,
  user: "postgres.vrrcagukyfnlhxuvnssp", password: "QvEds5x3KcdnQhi2",
  database: "postgres", ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000, max: 1,
});

async function main() {
  const c = await pool.connect();
  try {
    // Check financial_ledger
    let r = await c.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%financial%' OR table_name LIKE '%ledger%'"
    );
    console.log("Financial/Ledger tables:", r.rows.map(rr => rr.table_name).join(", ") || "NONE");

    // Check if financial_ledger exists
    r = await c.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='financial_ledger' AND table_schema='public'"
    );
    if (r.rows.length > 0) {
      console.log("financial_ledger columns:", r.rows.map(rr => rr.column_name).join(", "));
    } else {
      console.log("financial_ledger: NOT FOUND");
    }

    // Test creating a shared transaction with service_role
    console.log("\nTesting shared transaction insert...");
    const txBody = {
      user_id: "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
      creator_user_id: "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
      amount: 10,
      description: "TEST-SHARED-DIRECT",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      domain: "SHARED",
      is_shared: true,
      is_recurring: false,
      is_installment: false,
    };
    
    try {
      let ins = await c.query(
        `INSERT INTO transactions (user_id, creator_user_id, amount, description, date, competence_date, type, domain, is_shared, is_recurring, is_installment)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [txBody.user_id, txBody.creator_user_id, txBody.amount, txBody.description,
         txBody.date, txBody.competence_date, txBody.type, txBody.domain,
         txBody.is_shared, txBody.is_recurring, txBody.is_installment]
      );
      console.log("INSERT OK, id:", ins.rows[0].id);
      
      // Clean up
      await c.query("DELETE FROM transactions WHERE id = $1", [ins.rows[0].id]);
      console.log("Cleanup OK");
    } catch (e) {
      console.log("INSERT FAILED:", e.message);
    }

    // Check max_stack_depth
    r = await c.query("SHOW max_stack_depth");
    console.log("\nmax_stack_depth:", r.rows[0].max_stack_depth);

    // Check statement_timeout
    r = await c.query("SHOW statement_timeout");
    console.log("statement_timeout:", r.rows[0].statement_timeout);

  } finally {
    c.release();
    await pool.end();
  }
}

main().catch(e => console.error(e.message));
