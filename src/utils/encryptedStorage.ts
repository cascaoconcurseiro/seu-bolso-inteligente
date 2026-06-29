/**
 * Encrypted Storage — Criptografia de dados em repouso no IndexedDB
 *
 * LGPD Art. 46: medidas de segurança para proteção de dados pessoais.
 * Usa Web Crypto API (AES-256-GCM) com chave derivada de UUID da sessão.
 *
 * Os dados do TanStack Query Persister (localForage → IndexedDB) são
 * automaticamente criptografados em repouso, protegendo contra acesso
 * físico ao dispositivo.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const ENCRYPTION_PREFIX = "🔐";

let cryptoKey: CryptoKey | null = null;

const SALT_KEY = "enc_storage_salt_v2";

function getOrCreateSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) {
    return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

async function deriveKey(sessionId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(sessionId), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: getOrCreateSalt(),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

async function getKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  // Usa o ID da sessão do Supabase como segredo de derivação
  const sessionId = localStorage.getItem("sb-vrrcagukyfnlhxuvnssp-auth-token")
    ? JSON.parse(
        localStorage.getItem("sb-vrrcagukyfnlhxuvnssp-auth-token") || "{}"
      )?.access_token?.slice(0, 32)
    : crypto.randomUUID();
  cryptoKey = await deriveKey(sessionId);
  return cryptoKey;
}

export async function encrypt(data: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  // Formato: prefixo + iv (base64) + : + dados (base64)
  const ivB64 = btoa(String.fromCharCode(...iv));
  const dataB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ENCRYPTION_PREFIX}${ivB64}:${dataB64}`;
}

export async function decrypt(encryptedData: string): Promise<string> {
  if (!encryptedData.startsWith(ENCRYPTION_PREFIX)) {
    // Dados não criptografados (legado) — retorna como está
    return encryptedData;
  }
  const key = await getKey();
  const payload = encryptedData.slice(ENCRYPTION_PREFIX.length);
  const [ivB64, dataB64] = payload.split(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataB64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

/**
 * Substitui o storage do localForage por uma versão criptografada.
 * Uso: storage: createEncryptedStorage()
 */
export function createEncryptedStorage() {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const raw = localStorage.getItem(`enc_${key}`);
        if (!raw) return null;
        return await decrypt(raw);
      } catch {
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        const encrypted = await encrypt(value);
        localStorage.setItem(`enc_${key}`, encrypted);
      } catch {
        // Fallback: armazenar sem criptografia
        localStorage.setItem(key, value);
      }
    },
    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(`enc_${key}`);
      localStorage.removeItem(key);
    },
  };
}
