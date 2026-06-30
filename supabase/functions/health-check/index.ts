import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const ALLOWED_ORIGINS = [
  "https://pedemeia.vercel.app",
  "https://meupedemeia.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function corsHeaders(origin: string | null) {
  const isAllowed =
    origin &&
    (ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || origin?.endsWith(".vercel.app"));
  const allowed = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ status: "error", message: "Missing env vars" }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check DB connectivity
    const { error: dbError } = await supabase
      .from("profiles")
      .select("count", { count: "exact", head: true });
    if (dbError) {
      return new Response(
        JSON.stringify({ status: "degraded", db: false, error: dbError.message }),
        {
          status: 503,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    // Check Auth service
    const { error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (authError) {
      return new Response(
        JSON.stringify({ status: "degraded", auth: false, error: authError.message }),
        {
          status: 503,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: "healthy",
        db: true,
        auth: true,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
});
