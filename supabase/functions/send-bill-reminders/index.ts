import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── VAPID / Web Push helpers ────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + (4 - (str.length % 4)) % 4, "=");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getVapidAuthHeader(audience: string): Promise<string> {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT })));
  const signingInput = `${header}.${payload}`;

  const privateKeyBytes = base64UrlDecode(VAPID_PRIVATE_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cryptoKey, new TextEncoder().encode(signingInput));
  return `vapid t=${header}.${payload}.${base64UrlEncode(sig)},k=${VAPID_PUBLIC_KEY}`;
}

async function encryptPayload(subscription: { keys: { p256dh: string; auth: string } }, payload: string): Promise<{ body: ArrayBuffer; headers: Record<string, string> }> {
  const p256dh = base64UrlDecode(subscription.keys.p256dh);
  const auth = base64UrlDecode(subscription.keys.auth);

  const clientPublicKey = await crypto.subtle.importKey("raw", p256dh, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const serverKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);

  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: clientPublicKey }, serverKeyPair.privateKey, 256);
  const serverPublicKeyRaw = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF PRK
  const ikm = new Uint8Array(sharedBits);
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const hkdfKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const prk = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: auth, info: authInfo }, hkdfKey, 256);

  // CEK
  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"]);
  const cekInfo = buildInfo("aesgcm", p256dh, new Uint8Array(serverPublicKeyRaw));
  const cek = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, prkKey, 128);

  // Nonce
  const nonceInfo = buildInfo("nonce", p256dh, new Uint8Array(serverPublicKeyRaw));
  const nonce = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96);

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encoded = new TextEncoder().encode(payload);
  const padded = new Uint8Array(2 + encoded.length);
  padded.set(encoded, 2);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);

  const dh = base64UrlEncode(serverPublicKeyRaw);
  const saltB64 = base64UrlEncode(salt.buffer);

  return {
    body: encrypted,
    headers: {
      "Content-Encoding": "aesgcm",
      "Encryption": `salt=${saltB64}`,
      "Crypto-Key": `dh=${dh}`,
      "Content-Type": "application/octet-stream",
    },
  };
}

function buildInfo(type: string, clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode(`Content-Encoding: ${type}\0P-256\0`);
  const buf = new Uint8Array(label.length + 2 + clientKey.length + 2 + serverKey.length);
  let offset = 0;
  buf.set(label, offset); offset += label.length;
  new DataView(buf.buffer).setUint16(offset, clientKey.length, false); offset += 2;
  buf.set(clientKey, offset); offset += clientKey.length;
  new DataView(buf.buffer).setUint16(offset, serverKey.length, false); offset += 2;
  buf.set(serverKey, offset);
  return buf;
}

async function sendPush(endpoint: string, keys: { p256dh: string; auth: string }, payload: object): Promise<number> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const vapidAuth = await getVapidAuthHeader(audience);
  const { body, headers } = await encryptPayload({ keys }, JSON.stringify(payload));
  const resp = await fetch(endpoint, { method: "POST", headers: { ...headers, "Authorization": vapidAuth, "TTL": "86400" }, body });
  return resp.status;
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // [SEC] Verify CRON_SECRET to prevent unauthorized invocation
  if (CRON_SECRET) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);
  const todayStr = today.toISOString().split("T")[0];
  const in3Str = in3Days.toISOString().split("T")[0];

  // 1. Contas a pagar nos próximos 3 dias
  const { data: bills } = await supabase
    .from("transactions")
    .select("user_id, description, amount, date")
    .eq("enable_notification", true)
    .gte("date", todayStr)
    .lte("date", in3Str)
    .is("deleted_at", null);

  // 2. Metas com prazo nos próximos 7 dias que ainda não foram concluídas
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);
  const in7Str = in7Days.toISOString().split("T")[0];

  const { data: goals } = await supabase
    .from("goals")
    .select("creator_user_id, name, target_date, current_amount, target_amount")
    .neq("status", "COMPLETED")
    .eq("deleted", false)
    .gte("target_date", todayStr)
    .lte("target_date", in7Str);

  // Agrupa mensagens por user_id
  const messagesByUser = new Map<string, { title: string; body: string; url: string }[]>();

  (bills || []).forEach(b => {
    const msgs = messagesByUser.get(b.user_id) || [];
    msgs.push({ title: "💳 Conta a vencer", body: `${b.description} — R$ ${Number(b.amount).toFixed(2)} em ${b.date}`, url: "/transacoes" });
    messagesByUser.set(b.user_id, msgs);
  });

  (goals || []).forEach(g => {
    const uid = g.creator_user_id;
    const pct = g.target_amount > 0 ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) : 0;
    const msgs = messagesByUser.get(uid) || [];
    msgs.push({ title: "🎯 Meta próxima do prazo", body: `${g.name} — ${pct}% concluída, prazo em ${g.target_date}`, url: "/metas" });
    messagesByUser.set(uid, msgs);
  });

  if (messagesByUser.size === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  // Busca subscriptions
  const userIds = Array.from(messagesByUser.keys());
  const { data: subs } = await supabase.from("push_subscriptions").select("*").in("user_id", userIds);

  let sent = 0;
  const toDelete: string[] = [];

  for (const sub of subs || []) {
    const msgs = messagesByUser.get(sub.user_id);
    if (!msgs) continue;

    // Envia a primeira mensagem (ou agrega se houver muitas)
    const msg = msgs.length === 1
      ? msgs[0]
      : { title: `📬 ${msgs.length} lembretes financeiros`, body: msgs.map(m => m.body).join(" · ").slice(0, 120), url: "/" };

    const status = await sendPush(sub.endpoint, { p256dh: sub.p256dh, auth: sub.auth }, { ...msg });
    if (status === 410 || status === 404) {
      toDelete.push(sub.id);
    } else if (status < 300) {
      sent++;
    }
  }

  if (toDelete.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", toDelete);
  }

  return new Response(JSON.stringify({ sent, removed: toDelete.length }), { headers: { "Content-Type": "application/json" } });
});
