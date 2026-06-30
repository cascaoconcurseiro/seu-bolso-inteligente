import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const ALLOWED_ORIGINS = [
  "https://pedemeia.vercel.app",
  "https://meupedemeia.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin: string | null) {
  // [B-26] Permitir Vercel Preview URLs (*.vercel.app) além dos origins fixos
  const isAllowed =
    origin && (ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || origin.endsWith(".vercel.app"));
  const allowed = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }

  // Verify the caller is an authenticated Supabase user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) {
    return new Response("AI service unavailable", {
      status: 503,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  // [SEC] Validate payload structure and size (max 100KB to prevent abuse)
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 100_000) {
    return new Response("Payload too large", {
      status: 413,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  // [SEC] Basic validation: must have messages array
  const payload = body as Record<string, unknown>;
  if (!payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
    return new Response("Invalid payload: messages array required", {
      status: 400,
      headers: corsHeaders(req.headers.get("origin")),
    });
  }

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await groqRes.text();
  return new Response(data, {
    status: groqRes.status,
    headers: { ...corsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
  });
});
