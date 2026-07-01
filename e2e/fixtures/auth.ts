import { test as base, Page } from "@playwright/test";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://vrrcagukyfnlhxuvnssp.supabase.co";
const FAKE_USER_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_EMAIL = "test@example.com";

// A structurally valid (but fake) Supabase session object
const fakeSession = {
  access_token: [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    // payload: { sub: FAKE_USER_ID, role: "authenticated", exp: far future }
    btoa(
      JSON.stringify({
        sub: FAKE_USER_ID,
        email: FAKE_EMAIL,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 86400 * 365,
        iat: Math.floor(Date.now() / 1000),
      })
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    "fake_signature",
  ].join("."),
  token_type: "bearer",
  expires_in: 86400 * 365,
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 365,
  refresh_token: "fake_refresh_token",
  user: {
    id: FAKE_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: FAKE_EMAIL,
    email_confirmed_at: "2024-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Test User" },
    identities: [],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
};

async function mockAuthSession(page: Page) {
  const storageKey = `sb-${SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")}-auth-token`;

  await page.addInitScript(
    ({ key, session }: { key: string; session: object }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: storageKey, session: fakeSession }
  );

  // Intercept Supabase auth token refresh — return the fake session so the app
  // doesn't immediately redirect to /auth when it validates the session.
  await page.route(`${SUPABASE_URL}/auth/v1/token*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeSession),
    });
  });

  // Intercept profile query so the app doesn't crash on missing DB record
  await page.route(`${SUPABASE_URL}/rest/v1/profiles*`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: FAKE_USER_ID,
            full_name: "Test User",
            email: FAKE_EMAIL,
            avatar_url: null,
            theme: "system",
            language: "pt-BR",
            currency: "BRL",
            default_account_id: null,
            default_credit_card_id: null,
            app_pin_hash: null,
            created_at: "2024-01-01T00:00:00.000Z",
            updated_at: "2024-01-01T00:00:00.000Z",
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
}

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await mockAuthSession(page);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { mockAuthSession };
export { expect } from "@playwright/test";
