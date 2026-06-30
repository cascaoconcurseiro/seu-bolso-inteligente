import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const ALLOWED_ORIGINS = [
  "https://pedemeia.vercel.app",
  "https://meupedemeia.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin: string | null) {
  const isAllowed =
    origin && (ALLOWED_ORIGINS.some((o) => origin.startsWith(o)) || origin.endsWith(".vercel.app"));
  const allowed = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

const CRON_SECRET = Deno.env.get("CRON_SECRET");

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  // [SEC] Verify CRON_SECRET to prevent unauthorized invocation
  if (CRON_SECRET) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Verificar autenticação/autorização
    // Como será rodado via cron (Supabase Scheduler), não precisaria de auth estrita,
    // mas vamos manter o padrão de pegar o client autenticado.
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Usar o service_role para contornar RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = Deno.env.get("BRAPI_TOKEN");
    if (!token) throw new Error("Secret BRAPI_TOKEN não configurado no Supabase.");

    console.log("Iniciando sincronização de tickers da B3 com BRAPI...");

    // 1. Fetch data from BRAPI /quote/list
    const response = await fetch(`https://brapi.dev/api/quote/list?token=${token}`);
    if (!response.ok) {
      throw new Error(`Falha na API da BRAPI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const stocks = data.stocks || [];

    if (stocks.length === 0) {
      throw new Error("Nenhum ativo retornado pela BRAPI.");
    }

    console.log(`Recebidos ${stocks.length} ativos da BRAPI. Preparando Upsert...`);

    // 2. Format data for Upsert
    // O retorno da BRAPI tem: { stock, name, close, change, logo, sector, type }
    const batchSize = 1000;
    let totalUpserted = 0;

    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize).map((s: any) => ({
        ticker: s.stock,
        name: s.name,
        sector: s.sector || null,
        type: s.type || null,
        logo_url: s.logo || null,
        updated_at: new Date().toISOString(),
      }));

      // 3. Upsert into Supabase
      const { error } = await supabase
        .from("b3_tickers_cache")
        .upsert(batch, { onConflict: "ticker" });

      if (error) {
        console.error("Erro no upsert do lote:", error);
        throw new Error(`Erro no upsert: ${error.message}`);
      }

      totalUpserted += batch.length;
    }

    console.log(`Sincronização finalizada com sucesso! ${totalUpserted} ativos atualizados.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalUpserted} ativos atualizados com sucesso.`,
        updated: totalUpserted,
      }),
      {
        headers: { ...corsHeaders(null), "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro na sincronização de tickers:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(null), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
