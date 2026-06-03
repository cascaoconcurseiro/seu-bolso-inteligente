CREATE OR REPLACE FUNCTION public.process_daily_yields()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account RECORD;
  v_profile RECORD;
  v_daily_rate NUMERIC;
  v_yield_amount NUMERIC;
  v_category_id UUID;
  v_target_date DATE;
  v_dow INTEGER;
BEGIN
  -- We process yields for yesterday
  v_target_date := CURRENT_DATE - INTERVAL '1 day';
  
  -- Check day of week (0=Sunday, 6=Saturday)
  v_dow := EXTRACT(DOW FROM v_target_date);
  
  -- Se ontem foi fim de semana, não tem rendimento
  IF v_dow = 0 OR v_dow = 6 THEN
    RETURN;
  END IF;

  FOR v_account IN 
    SELECT * FROM accounts 
    WHERE is_active = true 
      AND yield_type = 'CDI' 
      AND yield_rate > 0 
      AND balance > 0
  LOOP
    -- Get profile for global_cdi_rate
    SELECT * INTO v_profile FROM profiles WHERE id = v_account.user_id;
    
    IF v_profile.global_cdi_rate IS NOT NULL AND v_profile.global_cdi_rate > 0 THEN
      -- Calculate daily CDI rate based on 252 business days
      -- Formula: (1 + annual_rate/100)^(1/252) - 1
      v_daily_rate := POWER(1 + (v_profile.global_cdi_rate / 100.0), 1.0 / 252.0) - 1;
      
      -- Calculate yield
      v_yield_amount := v_account.balance * v_daily_rate * (v_account.yield_rate / 100.0);
      
      -- Arredondar para 2 casas
      v_yield_amount := ROUND(v_yield_amount, 2);
      
      IF v_yield_amount > 0 THEN
        -- Find or create a 'Rendimentos' category for this user
        SELECT id INTO v_category_id 
        FROM categories 
        WHERE user_id = v_account.user_id 
          AND type = 'income' 
          AND name ILIKE '%rendimento%'
        LIMIT 1;
        
        IF v_category_id IS NULL THEN
          INSERT INTO categories (user_id, name, type, icon, color)
          VALUES (v_account.user_id, 'Rendimentos', 'income', '📈', '#10b981')
          RETURNING id INTO v_category_id;
        END IF;

        -- Insert the transaction
        INSERT INTO transactions (
          user_id, 
          account_id, 
          category_id, 
          amount, 
          date, 
          description, 
          type, 
          is_paid, 
          competence_date
        ) VALUES (
          v_account.user_id,
          v_account.id,
          v_category_id,
          v_yield_amount,
          v_target_date,
          'Rendimento Automático (CDI)',
          'income',
          true,
          DATE_TRUNC('month', v_target_date)::date
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Nota: Para agendar esta função via pg_cron no Supabase, rode isso no editor SQL (requer habilitar extensão pg_cron):
-- SELECT cron.schedule('daily_yields', '0 1 * * 2-6', 'SELECT public.process_daily_yields()');
