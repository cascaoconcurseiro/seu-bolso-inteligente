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

    // Fetch ALL assets for this user
    const { data: assets, error: fetchError } = await supabaseAdmin
      .from('assets')
      .select('id, ticker, type, quantity, purchase_price, purchase_date, notes')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;
    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ updated: 0, message: 'Nenhum ativo encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = Deno.env.get('BRAPI_TOKEN');
    if (!token) throw new Error('Secret BRAPI_TOKEN não configurado no Supabase.');

    let updatedCount = 0;

    // --- 1. STOCKs / FIIs / ETFs ---
    const stockAssets = assets.filter(a => a.ticker && a.type !== 'CRYPTO' && a.type !== 'BOND');
    const stockTickers = Array.from(new Set(stockAssets.map(a => a.ticker!.trim().toUpperCase())));
    
    if (stockTickers.length > 0) {
      const response = await fetch(`https://brapi.dev/api/quote/${stockTickers.join(',')}?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        for (const result of (data.results || [])) {
          const symbol = result.symbol.toUpperCase();
          const price = result.regularMarketPrice;
          if (price) {
            const matchingIds = stockAssets.filter(a => a.ticker?.trim().toUpperCase() === symbol).map(a => a.id);
            if (matchingIds.length > 0) {
              const { error } = await supabaseAdmin.from('assets').update({ current_price: price }).in('id', matchingIds);
              if (!error) updatedCount += matchingIds.length;
            }
          }
        }
      }
    }

    // --- 2. CRYPTO ---
    const cryptoAssets = assets.filter(a => a.ticker && a.type === 'CRYPTO');
    const cryptoTickers = Array.from(new Set(cryptoAssets.map(a => a.ticker!.trim().toUpperCase())));
    
    if (cryptoTickers.length > 0) {
      const response = await fetch(`https://brapi.dev/api/v2/crypto?coin=${cryptoTickers.join(',')}&currency=BRL&token=${token}`);
      if (response.ok) {
        const data = await response.json();
        for (const coin of (data.coins || [])) {
          const symbol = coin.coin.toUpperCase();
          const price = coin.regularMarketPrice;
          if (price) {
            const matchingIds = cryptoAssets.filter(a => a.ticker?.trim().toUpperCase() === symbol).map(a => a.id);
            if (matchingIds.length > 0) {
              const { error } = await supabaseAdmin.from('assets').update({ current_price: price }).in('id', matchingIds);
              if (!error) updatedCount += matchingIds.length;
            }
          }
        }
      }
    }

    // --- 3. BONDS (Renda Fixa CDI) ---
    const bondAssets = assets.filter(a => a.type === 'BOND' && a.notes?.includes('% CDI'));
    if (bondAssets.length > 0) {
      // Fetch prime rate
      const response = await fetch(`https://brapi.dev/api/v2/prime-rate?country=brazil&token=${token}`);
      if (response.ok) {
        const data = await response.json();
        const primeRates = data['prime-rate'] || [];
        const cdiData = primeRates.find((r: any) => r.name === 'CDI');
        
        if (cdiData) {
          const cdiAnnualValue = parseFloat(cdiData.value); // e.g. "10.4"
          
          for (const bond of bondAssets) {
            // parse % CDI from notes, e.g. "CDI: 110%"
            const cdiMatch = bond.notes?.match(/(\d+(?:\.\d+)?)%\s*CDI/i);
            if (cdiMatch && bond.purchase_date && bond.purchase_price) {
              const percentCdi = parseFloat(cdiMatch[1]) / 100; // 1.10
              
              // Calculate days since purchase
              const purchaseDate = new Date(bond.purchase_date);
              const today = new Date();
              const diffTime = Math.abs(today.getTime() - purchaseDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays > 0) {
                // Approximate compound interest calculation for daily CDI
                const cdiDaily = Math.pow(1 + (cdiAnnualValue / 100), 1 / 252) - 1;
                const bondDailyYield = cdiDaily * percentCdi;
                const businessDays = diffDays * (252 / 365); // rough approximation of business days
                const newPrice = bond.purchase_price * Math.pow(1 + bondDailyYield, businessDays);
                
                const { error } = await supabaseAdmin.from('assets').update({ current_price: newPrice }).eq('id', bond.id);
                if (!error) updatedCount++;
              }
            }
          }
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
