# Runbook de Operações — Seu Bolso Inteligente

## Rollback de Deploy (Vercel)

**Quando usar:** deploy broke produção, usuários reportando erro em branco ou crash.

**Passos:**
1. Acessar https://vercel.com/wesleys-projects-de111a83/pedemeia
2. Clicar em "Deployments" no menu lateral
3. Localizar o último deploy com status **Ready** antes do deploy atual
4. Clicar nos três pontos `...` → **"Promote to Production"**
5. Confirmar — rollback completo em < 30 segundos

**Verificar após rollback:**
- Acessar https://meupedemeia.vercel.app e confirmar que carrega
- Checar console do browser por erros críticos
- Verificar se login funciona

---

## Rollback de Migration (Supabase)

**Quando usar:** migration aplicada causou erro em queries ou quebrou funcionalidade.

> ⚠️ Migrations no Supabase são aplicadas direto em produção — não há rollback automático.

**Passos:**
1. Acessar https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/editor
2. Escrever SQL de reverso (DROP INDEX, ALTER TABLE, etc.)
3. Executar manualmente na aba SQL Editor
4. Commitar o SQL de reverso como nova migration no repositório com prefixo `rollback_`

**Exemplo de rollback de índice:**
```sql
DROP INDEX IF EXISTS public.idx_goal_milestones_user_id;
```

---

## Verificar Sentry (Monitoramento de Erros)

1. Confirmar que `VITE_SENTRY_DSN` está configurado:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Deve existir `VITE_SENTRY_DSN` com valor do DSN do Sentry
2. Para testar: abrir o app, abrir DevTools, executar `throw new Error('Sentry test')`
3. Verificar se o erro aparece em https://sentry.io no projeto correspondente

**Atenção:** Sem esta variável configurada, erros de produção não são monitorados.

---

## Verificar pg_cron (Tarefas Agendadas)

O pg_cron executa:
- `process_credit_card_invoices()` — fecha faturas do cartão automaticamente
- Alertas de metas (7 dias antes do vencimento)

**Verificar jobs ativos:**
```sql
SELECT jobname, schedule, command, active
FROM cron.job
ORDER BY jobname;
```

**Executar manualmente (se necessário):**
```sql
SELECT process_credit_card_invoices();
```

---

## Contatos e Recursos

| Serviço | URL |
|---------|-----|
| App em produção | https://meupedemeia.vercel.app |
| Vercel Dashboard | https://vercel.com/wesleys-projects-de111a83/pedemeia |
| Supabase Dashboard | https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp |
| Repositório | https://github.com/cascaoconcurseiro/seu-bolso-inteligente |
