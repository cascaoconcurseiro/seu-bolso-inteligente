/**
 * Load test: insert 500 transactions for a test user and measure
 * the /transacoes page render time via Playwright.
 *
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_KEY=<key> TEST_USER_ID=<uuid> \
 *     node scripts/load-test-transactions.mjs [--count 500] [--cleanup]
 *
 * The script:
 *   1. Inserts N transactions in batches of 50 via the Supabase REST API
 *   2. Launches a Chromium browser via Playwright
 *   3. Navigates to /transacoes with a mocked auth session
 *   4. Measures time-to-interactive (TTI) via PerformanceObserver / LCP
 *   5. Reports p50/p95 render times across 5 page loads
 *   6. Optionally cleans up the inserted rows (--cleanup flag)
 */

import { chromium } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID;
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

const args = process.argv.slice(2);
const COUNT = parseInt(args[args.indexOf("--count") + 1] || "500", 10);
const CLEANUP = args.includes("--cleanup");
const RUNS = 5;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !TEST_USER_ID) {
  console.error(
    "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, TEST_USER_ID"
  );
  process.exit(1);
}

// ─── 1. Seed data ───────────────────────────────────────────────────────────

const CATEGORIES = [
  "alimentacao",
  "transporte",
  "saude",
  "lazer",
  "educacao",
];

function randomTransaction(i) {
  const type = i % 5 === 0 ? "INCOME" : "EXPENSE";
  const date = new Date();
  date.setDate(date.getDate() - (i % 180));
  return {
    user_id: TEST_USER_ID,
    creator_user_id: TEST_USER_ID,
    type,
    amount: parseFloat((Math.random() * 500 + 10).toFixed(2)),
    description: `Load test tx ${i}`,
    date: date.toISOString().split("T")[0],
    category_id: null,
    domain: "PERSONAL",
    deleted_at: null,
  };
}

async function insertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Insert failed (${res.status}): ${body}`);
  }
}

async function seedTransactions() {
  console.log(`\n▶ Inserting ${COUNT} transactions for user ${TEST_USER_ID}…`);
  const batchSize = 50;
  const rows = Array.from({ length: COUNT }, (_, i) => randomTransaction(i));
  for (let i = 0; i < rows.length; i += batchSize) {
    await insertBatch(rows.slice(i, i + batchSize));
    process.stdout.write(`  ${Math.min(i + batchSize, COUNT)}/${COUNT}\r`);
  }
  console.log(`\n✅ Inserted ${COUNT} transactions`);
}

async function cleanupTransactions() {
  console.log("\n🧹 Cleaning up load-test transactions…");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/transactions?description=like.Load+test+tx+*&user_id=eq.${TEST_USER_ID}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  console.log(res.ok ? "✅ Cleanup done" : `⚠️  Cleanup status: ${res.status}`);
}

// ─── 2. Browser measurement ──────────────────────────────────────────────────

const STORAGE_KEY = `sb-${SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")}-auth-token`;

function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 86400 * 365;
  const payload = btoa(
    JSON.stringify({ sub: TEST_USER_ID, role: "authenticated", aud: "authenticated", exp })
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return {
    access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.fake`,
    token_type: "bearer",
    expires_in: 86400 * 365,
    expires_at: exp,
    refresh_token: "fake",
    user: {
      id: TEST_USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "loadtest@example.com",
      app_metadata: {},
      user_metadata: {},
    },
  };
}

async function measureRenderTime(page) {
  const t0 = Date.now();

  await page.goto("/transacoes", { waitUntil: "networkidle" });

  // Wait for transaction rows or empty-state to appear
  await page
    .locator('[data-testid="transaction-row"], [data-testid="empty-state"], table tbody tr, .transaction-item')
    .first()
    .waitFor({ timeout: 30000 })
    .catch(() => {});

  const t1 = Date.now();

  // Also capture LCP from the browser's PerformanceObserver if available
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      let lcpTime = 0;
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) lcpTime = entries[entries.length - 1].startTime;
        });
        obs.observe({ type: "largest-contentful-paint", buffered: true });
        // Give it a tick to collect buffered entries
        setTimeout(() => { obs.disconnect(); resolve(lcpTime); }, 200);
      } catch {
        resolve(0);
      }
    });
  });

  return { wall: t1 - t0, lcp: Math.round(lcp) };
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runBenchmark() {
  console.log(`\n▶ Measuring /transacoes render time (${RUNS} runs)…`);
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const session = fakeSession();

  const wallTimes = [];
  const lcpTimes = [];

  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Pre-seed auth session
    await page.addInitScript(
      ({ key, s }) => localStorage.setItem(key, JSON.stringify(s)),
      { key: STORAGE_KEY, s: session }
    );

    // Stub auth token refresh
    await page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(session) })
    );

    // Stub profiles to avoid 404
    await page.route(`${SUPABASE_URL}/rest/v1/profiles*`, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([{ id: TEST_USER_ID, full_name: "Load Tester", currency: "BRL" }]),
          })
        : route.continue()
    );

    page.on("console", () => {});
    page.on("pageerror", () => {});

    const { wall, lcp } = await measureRenderTime(page);
    wallTimes.push(wall);
    if (lcp) lcpTimes.push(lcp);

    console.log(`  run ${i + 1}/${RUNS}: wall=${wall}ms lcp=${lcp || "n/a"}ms`);
    await context.close();
  }

  await browser.close();

  console.log("\n📊 Results");
  console.log("──────────────────────────────");
  console.log(`  Wall time  p50: ${percentile(wallTimes, 50)}ms`);
  console.log(`  Wall time  p95: ${percentile(wallTimes, 95)}ms`);
  if (lcpTimes.length) {
    console.log(`  LCP        p50: ${percentile(lcpTimes, 50)}ms`);
    console.log(`  LCP        p95: ${percentile(lcpTimes, 95)}ms`);
  }
  console.log("──────────────────────────────");

  const p95 = percentile(wallTimes, 95);
  if (p95 > 3000) {
    console.warn(`\n⚠️  p95 render time ${p95}ms exceeds 3 s threshold — investigate virtualization.`);
    process.exitCode = 1;
  } else {
    console.log(`\n✅ p95 render time ${p95}ms is within the 3 s threshold.`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

try {
  await seedTransactions();
  await runBenchmark();
  if (CLEANUP) await cleanupTransactions();
} catch (err) {
  console.error("\n❌ Load test failed:", err.message);
  if (CLEANUP) await cleanupTransactions().catch(() => {});
  process.exit(1);
}
