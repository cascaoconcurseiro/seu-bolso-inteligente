import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Validar token simples (opcional, para segurança)
    const token = new URL(request.url).searchParams.get('token');
    const expectedToken = import.meta.env.KEEP_ALIVE_TOKEN || 'keep-alive-secret';
    
    if (token !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar ao Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fazer uma query simples para manter Supabase acordado
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive error:', error);
      return new Response(JSON.stringify({ 
        status: 'error',
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Keep-alive ping successful'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return new Response(JSON.stringify({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
