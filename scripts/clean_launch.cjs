const { Pool } = require("pg");
const p = new Pool({
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
  const c = await p.connect();
  try {
    const tx = "0d646b3a-30ca-4957-b100-f3253953730b";
    await c.query("ALTER TABLE transaction_splits DISABLE TRIGGER USER");
    await c.query("ALTER TABLE transactions DISABLE TRIGGER USER");

    await c.query("DELETE FROM financial_ledger WHERE transaction_id = $1", [tx]);
    console.log("Ledger cleaned");
    await c.query("DELETE FROM transaction_splits WHERE transaction_id = $1", [tx]);
    console.log("Splits deleted");
    await c.query("DELETE FROM transactions WHERE id = $1", [tx]);
    console.log("Transaction deleted");

    await c.query("ALTER TABLE transactions ENABLE TRIGGER USER");
    await c.query("ALTER TABLE transaction_splits ENABLE TRIGGER USER");

    let r = await c.query(
      "SELECT id, description FROM transactions WHERE description ILIKE $1 AND user_id = $2",
      ["%launch%", "56ccd60b-641f-4265-bc17-7b8705a2f8c9"]
    );
    console.log("Remaining LAUNCH txs:", r.rows.length);
    for (let tx of r.rows) {
      await c.query("DELETE FROM financial_ledger WHERE transaction_id = $1", [tx.id]);
      await c.query("DELETE FROM transaction_splits WHERE transaction_id = $1", [tx.id]);
      await c.query("ALTER TABLE transactions DISABLE TRIGGER USER");
      await c.query("DELETE FROM transactions WHERE id = $1", [tx.id]);
      await c.query("ALTER TABLE transactions ENABLE TRIGGER USER");
      console.log("Deleted:", tx.description);
    }
  } finally {
    c.release();
    await p.end();
  }
}
main().catch((e) => console.error(e.message));
