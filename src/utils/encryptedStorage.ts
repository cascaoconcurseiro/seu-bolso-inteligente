/**
 * Encrypted Storage — Criptografia de dados em repouso no IndexedDB
 *
 * LGPD Art. 46: medidas de segurança para proteção de dados pessoais.
 * Usa Web Crypto API (AES-256-GCM) com chave derivada de UUID da sessão.
 *
 * Os dados do TanStack Query Persister (localForage → IndexedDB) são
 * automaticamente cifrados em repouso. Como a chave é derivada de dados da
 * própria sessão, isso reduz exposição casual no IndexedDB, mas não substitui
 * a proteção do dispositivo nem constitui um cofre local contra um invasor.
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

function findSupabaseAuthToken(): Record<string, unknown> | null {
  // A chave do token no localStorage inclui o ref do projeto (sb-<ref>-auth-token);
  // localizar dinamicamente evita hardcode do ref
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      try {
        return JSON.parse(localStorage.getItem(key) || "{}");
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function getKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  // Deriva do user.id (estável entre sessões) — usar access_token quebraria a
  // descriptografia do cache a cada refresh de token
  const token = findSupabaseAuthToken();
  const user = token?.user as { id?: string } | undefined;
  const secret =
    user?.id ??
    (typeof token?.access_token === "string"
      ? (token.access_token as string).slice(0, 32)
      : crypto.randomUUID());
  cryptoKey = await deriveKey(secret);
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

interface AsyncStringStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<void>;
}

/**
 * Camada de criptografia AES-256-GCM sobre um storage assíncrono (localForage/
 * IndexedDB). Dados legados não criptografados são lidos normalmente (decrypt
 * passa adiante valores sem o prefixo) e passam a ser gravados criptografados.
 */
export function createEncryptedForageStorage(forage: AsyncStringStorage): AsyncStringStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        const raw = await forage.getItem(key);
        if (!raw) return null;
        return await decrypt(raw);
      } catch {
        // Chave de derivação mudou ou dado corrompido — trata como cache miss
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        const encrypted = await encrypt(value);
        await forage.setItem(key, encrypted);
      } catch {
        // Falha fechada: cache é dispensável e nunca deve degradar para texto puro.
        await forage.removeItem(key);
      }
    },
    async removeItem(key: string): Promise<void> {
      await forage.removeItem(key);
    },
  };
}
