-- Somente leitura: compras de cartão feitas NO dia do fechamento (modo FIXED_DAY) que
-- ainda estão na fatura do mês da compra, mas pela regra nova (>=) deveriam estar na próxima.
-- Revisar a lista antes de qualquer correção; faturas pagas não devem ser alteradas.
SELECT t.id, t.date, t.description, t.amount, a.name AS cartao, a.closing_day,
       t.competence_date AS fatura_atual,
       (date_trunc('month', t.date::date) + interval '1 month')::date AS fatura_pela_regra_nova
FROM public.transactions t
JOIN public.accounts a ON a.id = t.account_id
WHERE a.type = 'CREDIT_CARD'
  AND t.deleted_at IS NULL
  AND COALESCE(a.closing_day_mode, 'FIXED_DAY') = 'FIXED_DAY'
  AND t.is_installment IS NOT TRUE
  AND EXTRACT(day FROM t.date::date) = a.closing_day
  AND t.competence_date = date_trunc('month', t.date::date)::date
ORDER BY a.name, t.date;
