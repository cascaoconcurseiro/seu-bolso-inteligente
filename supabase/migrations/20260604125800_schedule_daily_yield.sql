-- Habilitar a extensão pg_cron se não existir
-- (Nota: Dependendo do plano do Supabase, o pg_cron só pode ser habilitado via Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Remover qualquer agendamento anterior para garantir que não haja duplicação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.unschedule('daily_yields_schedule');
    
    -- Agendar o rendimento diário para rodar de Terça a Sábado (2-6) à 01:00 da manhã
    -- (O cálculo sempre avalia se o dia anterior foi útil, logo roda de terça a sábado)
    PERFORM cron.schedule(
      'daily_yields_schedule', 
      '0 1 * * 2-6', 
      'SELECT public.process_daily_yields()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa caso o usuário não tenha permissão de admin para usar pg_cron.
  -- Neste caso ele precisará rodar a query manualmente ou via interface gráfica.
END $$;
