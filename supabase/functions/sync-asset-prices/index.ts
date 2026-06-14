import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
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
    
    // Fetch user context
    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(`Auth error: ${userError?.message || 'User not found'}`, {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 401,
      });
    }

    // Fetch assets for this user that have a ticker
    const { data: assets, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, ticker')
      .eq('user_id', user.id)
      .not('ticker', 'is', null)
      .neq('ticker', '');

    if (fetchError) {
      throw fetchError;
    }

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: 'Nenhum ativo com ticker encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique tickers
    const uniqueTickers = Array.from(new Set(assets.map((a: any) => a.ticker.trim().toUpperCase())));
    
    if (uniqueTickers.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from BRAPI
    const token = Deno.env.get('BRAPI_TOKEN');
    if (!token) {
      throw new Error('Secret BRAPI_TOKEN não configurado no Supabase.');
    }

    const tickersParam = uniqueTickers.join(',');
    const response = await fetch(`https://brapi.dev/api/quote/${tickersParam}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha na API da BRAPI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let updatedCount = 0;
    
    // Process results
    for (const result of data.results) {
      const symbol = result.symbol.toUpperCase();
      const price = result.regularMarketPrice;
      
      const matchingAssets = assets.filter((a: any) => a.ticker?.trim().toUpperCase() === symbol);
      
      if (matchingAssets.length > 0 && price) {
        const idsToUpdate = matchingAssets.map((a: any) => a.id);
        
        const { error: updateError } = await supabaseAdmin
          .from('assets')
          .update({ current_price: price })
          .in('id', idsToUpdate);
          
        if (!updateError) {
          updatedCount += idsToUpdate.length;
        } else {
          console.error(`Erro ao atualizar preço de ${symbol}:`, updateError);
        }
      }
    }

    return new Response(JSON.stringify({ updated: updatedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erro na sincronização:', error);
    return new Response(`Error: ${error.message}`, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
});
