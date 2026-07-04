const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = "SHA-256";
const SEPARATOR = ":";

/**
 * Hash a PIN using PBKDF2 with a random salt.
 * Returns "base64salt:base64hash" — the salt is embedded so verifyPin() can re-derive.
 * PBKDF2 with 200k iterations is orders of magnitude harder to brute-force than plain SHA-256.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(key)));
  return `${saltB64}${SEPARATOR}${hashB64}`;
}

/**
 * Verify a PIN against a stored PBKDF2 hash produced by hashPin().
 * Also accepts legacy plain SHA-256 hex hashes (64 chars, no separator) for migration.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  // Legacy SHA-256 hex (64 hex chars, no separator) — migrate on next login
  if (!stored.includes(SEPARATOR) && stored.length === 64) {
    const legacyHash = await legacySHA256(pin);
    return legacyHash === stored;
  }

  const [saltB64, hashB64] = stored.split(SEPARATOR);
  if (!saltB64 || !hashB64) return false;

  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0));
  const derived = new Uint8Array(await deriveKey(pin, salt));

  // Constant-time comparison to prevent timing attacks
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    256
  );
}

async function legacySHA256(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
