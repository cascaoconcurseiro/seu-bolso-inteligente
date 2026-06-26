import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BCB SGS series codes
const BCB_SERIES: Record<string, number> = {
  ipca: 13522,
  selic: 432,
  cdi: 4389,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Missing Authorization header', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 401,
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(`Auth error: ${userError?.message || 'User not found'}`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 401,
      });
    }

    const body = await req.json();

    // --- BCB indicators endpoint ---
    if (body.indicator) {
      const seriesCode = BCB_SERIES[body.indicator as string];
      if (!seriesCode) {
        return new Response(JSON.stringify({ error: 'Indicador desconhecido' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const bcbRes = await fetch(
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`
      );
      if (!bcbRes.ok) throw new Error(`BCB API error: ${bcbRes.status}`);

      const bcbData = await bcbRes.json();
      const entry = bcbData?.[0];
      return new Response(
        JSON.stringify({ date: entry?.data ?? null, value: entry ? parseFloat(entry.valor.replace(',', '.')) : null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Currency quote endpoint ---
    const { currency, target = 'BRL' } = body;

    if (!currency || currency === target) {
      return new Response(JSON.stringify({ rate: 1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pair = `${currency}-${target}`;
    const pairKey = `${currency}${target}`;

    // Frankfurter API — free, reliable, no token required
    const frankfurterRes = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=${target}`
    );
    if (frankfurterRes.ok) {
      const frankfurterData = await frankfurterRes.json();
      const rate = frankfurterData?.rates?.[target];
      if (rate) {
        return new Response(JSON.stringify({ rate }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: fawazahmed0 currency API via jsDelivr CDN
    const base = currency.toLowerCase();
    const cdnRes = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base}.json`
    );
    if (!cdnRes.ok) throw new Error(`CDN currency API error: ${cdnRes.status}`);
    const cdnData = await cdnRes.json();
    const rate = cdnData?.[base]?.[target.toLowerCase()];
    if (!rate) throw new Error(`Par ${currency}/${target} não encontrado`);

    return new Response(JSON.stringify({ rate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
