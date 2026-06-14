import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { currency } = await req.json();

    if (!currency || currency === 'BRL') {
      return new Response(JSON.stringify({ rate: 1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('BRAPI_TOKEN');
    if (!token) throw new Error('Secret BRAPI_TOKEN não configurado no Supabase.');

    // Currency pair for BRAPI: e.g. "USD-BRL"
    const pair = `${currency}-BRL`;
    
    const response = await fetch(`https://brapi.dev/api/v2/currency?currency=${pair}&token=${token}`);
    if (!response.ok) {
      throw new Error(`Falha na API da BRAPI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let rate = null;
    
    if (data.currency && data.currency.length > 0) {
      rate = parseFloat(data.currency[0].bidPrice);
    }

    return new Response(JSON.stringify({ rate }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro na cotação de moedas:', error);
    return new Response(`Error: ${error.message}`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
