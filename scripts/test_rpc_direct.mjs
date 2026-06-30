// Test the RPC call directly
const SUPABASE_URL = "https://vrrcagukyfnlhxuvnssp.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDA4NDYsImV4cCI6MjA4MjI3Njg0Nn0.B398YG0L0TJqF5SIS06pJoXEpweYY84XdOG2DNQ21zQ";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycmNhZ3VreWZubGh4dXZuc3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjcwMDg0NiwiZXhwIjoyMDgyMjc2ODQ2fQ.FrCVUHQ_4x0RCzpnNBFRRAfJj6_uezKJb2pNQ26xfiE";

async function testRpc() {
  // Test with service_role key first (bypass RLS)
  const payload = {
    p_transaction: {
      amount: 100,
      description: "TEST-DIAGNOSTIC",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      is_shared: false,
      domain: "PERSONAL",
      is_recurring: false,
      recurrence_pattern: null,
      recurrence_day: null,
      is_installment: false,
    },
    p_splits: [],
  };

  console.log("Testing RPC with service_role key...");
  let res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_transaction_with_splits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  console.log("Service role status:", res.status, res.statusText);
  const text = await res.text();
  console.log("Response:", text.substring(0, 500));

  // Also test the direct insert approach (the fallback)
  console.log("\nTesting direct insert...");
  res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
      creator_user_id: "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
      amount: 101,
      description: "TEST-DIAGNOSTIC-DIRECT",
      date: "2026-06-30",
      competence_date: "2026-06-01",
      type: "EXPENSE",
      is_shared: false,
      domain: "PERSONAL",
    }),
  });
  console.log("Direct insert status:", res.status, res.statusText);
  const text2 = await res.text();
  console.log("Response:", text2.substring(0, 500));

  // Test the duplicate check query format
  console.log("\nTesting duplicate check query...");
  const recentWindow = new Date(Date.now() - 60000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const queryParams = new URLSearchParams({
    select: "id",
    user_id: "eq.56ccd60b-641f-4265-bc17-7b8705a2f8c9",
    amount: "eq.241",
    description: "eq.Gasolina",
    date: "eq.2026-06-30",
    is_active: "eq.true",
    created_at: `gte.${recentWindow}`,
  });
  const dupUrl = `${SUPABASE_URL}/rest/v1/transactions?${queryParams.toString()}`;
  console.log("Dup check URL:", dupUrl);

  res = await fetch(dupUrl, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  console.log("Dup check status:", res.status, res.statusText);
  const text3 = await res.text();
  console.log("Response:", text3.substring(0, 500));

  // Check if is_active column exists
  console.log("\nChecking transactions table columns...");
  // Use Postgres directly via pool (already tested)
}

testRpc().catch((e) => console.error("Test error:", e));
