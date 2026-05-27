-- Migration: 20260527134500_add_missing_income_categories.sql

-- Adiciona as novas categorias de receita para todos os usuários existentes que não as possuem.
DO $$
DECLARE
    user_record RECORD;
    cat RECORD;
    new_categories jsonb := '[
        {"name": "Salário", "icon": "💰", "type": "income"},
        {"name": "Freelance", "icon": "💻", "type": "income"},
        {"name": "Vendas", "icon": "🏷️", "type": "income"},
        {"name": "Investimentos", "icon": "📈", "type": "income"},
        {"name": "Reembolso", "icon": "💳", "type": "income"},
        {"name": "Cashback", "icon": "💸", "type": "income"},
        {"name": "Benefícios", "icon": "🎁", "type": "income"},
        {"name": "Presente", "icon": "🎉", "type": "income"},
        {"name": "Transferência Recebida", "icon": "📥", "type": "income"},
        {"name": "Outros", "icon": "💵", "type": "income"}
    ]'::jsonb;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        FOR cat IN SELECT * FROM jsonb_array_elements(new_categories) LOOP
            -- Verifica se o usuário já tem essa categoria
            IF NOT EXISTS (
                SELECT 1 FROM public.categories 
                WHERE user_id = user_record.id 
                  AND name = cat.value->>'name'
                  AND type = 'income'
            ) THEN
                INSERT INTO public.categories (user_id, name, icon, type, color)
                VALUES (
                    user_record.id, 
                    cat.value->>'name', 
                    cat.value->>'icon', 
                    'income', 
                    '#10B981' -- Emerald 500
                );
            END IF;
        END LOOP;
        
        -- Opcional: Se eles tinham a categoria "Receita" antiga e genérica, podemos mantê-la ou deixá-la pra lá.
    END LOOP;
END;
$$;
