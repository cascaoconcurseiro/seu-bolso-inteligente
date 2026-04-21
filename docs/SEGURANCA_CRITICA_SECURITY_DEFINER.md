# 🔴 VULNERABILIDADE CRÍTICA DE SEGURANÇA - SECURITY DEFINER

## ⚠️ SEVERIDADE: CRÍTICA

**Data**: 20/04/2026  
**Status**: 🔴 **ATIVO - REQUER CORREÇÃO IMEDIATA**

---

## 🚨 PROBLEMA IDENTIFICADO

Três views estão definidas com `SECURITY DEFINER`, o que representa um **risco crítico de segurança**:

1. `public.shared_transactions_for_current_user`
2. `public.trip_budget_summary`
3. `public.shared_transactions_view`

---

## 🔍 O QUE É SECURITY DEFINER?

### Definição
`SECURITY DEFINER` faz com que a view execute com as **permissões do usuário que a criou** (geralmente o superusuário), não do usuário que a consulta.

### Por Que É Perigoso?

```sql
-- ❌ PERIGOSO: View com SECURITY DEFINER
CREATE VIEW shared_transactions_view 
WITH (security_invoker = false)  -- ou SECURITY DEFINER
AS SELECT * FROM transactions;

-- Problema: QUALQUER usuário pode ver TODAS as transações
-- porque a view executa com permissões de superusuário
```

### Comportamento Correto

```sql
-- ✅ SEGURO: View com SECURITY INVOKER (padrão)
CREATE VIEW shared_transactions_view 
WITH (security_invoker = true)  -- ou sem especificar
AS SELECT * FROM transactions;

-- Correto: View respeita RLS e permissões do usuário atual
```

---

## 🎯 IMPACTO

### Risco de Segurança
- 🔴 **Bypass de RLS**: Views ignoram Row Level Security
- 🔴 **Acesso não autorizado**: Usuários podem ver dados de outros
- 🔴 **Escalação de privilégios**: Execução com permissões elevadas
- 🔴 **Vazamento de dados**: Informações sensíveis expostas

### Dados em Risco
- Transações de todos os usuários
- Orçamentos de viagens
- Transações compartilhadas
- Informações financeiras sensíveis

---

## 🔬 ANÁLISE DAS VIEWS AFETADAS

### 1. shared_transactions_for_current_user
**Risco**: 🔴 CRÍTICO

```sql
-- Provavelmente definida como:
CREATE VIEW shared_transactions_for_current_user
WITH (security_invoker = false)  -- ❌ PERIGOSO
AS 
SELECT t.* 
FROM transactions t
WHERE t.is_shared = true;
```

**Problema**: 
- Qualquer usuário pode ver TODAS as transações compartilhadas
- Ignora verificação de family_members
- Bypass completo de RLS

---

### 2. trip_budget_summary
**Risco**: 🔴 CRÍTICO

```sql
-- Provavelmente definida como:
CREATE VIEW trip_budget_summary
WITH (security_invoker = false)  -- ❌ PERIGOSO
AS 
SELECT 
  trip_id,
  SUM(amount) as total_spent
FROM transactions
WHERE trip_id IS NOT NULL
GROUP BY trip_id;
```

**Problema**:
- Qualquer usuário pode ver orçamentos de TODAS as viagens
- Ignora verificação de trip_members
- Exposição de dados financeiros de viagens privadas

---

### 3. shared_transactions_view
**Risco**: 🔴 CRÍTICO

```sql
-- Provavelmente definida como:
CREATE VIEW shared_transactions_view
WITH (security_invoker = false)  -- ❌ PERIGOSO
AS 
SELECT 
  t.*,
  ts.member_id,
  ts.percentage
FROM transactions t
JOIN transaction_splits ts ON t.id = ts.transaction_id;
```

**Problema**:
- Exposição de todas as divisões de transações
- Qualquer usuário vê quem deve para quem
- Bypass de RLS em transaction_splits

---

## 🛠️ CORREÇÃO IMEDIATA

### Migration de Correção

```sql
-- supabase/migrations/20260420000002_fix_security_definer_views.sql

-- ============================================
-- CORREÇÃO CRÍTICA: Remover SECURITY DEFINER
-- ============================================

-- 1. Recriar shared_transactions_for_current_user
DROP VIEW IF EXISTS public.shared_transactions_for_current_user;

CREATE VIEW public.shared_transactions_for_current_user
WITH (security_invoker = true)  -- ✅ SEGURO
AS 
SELECT t.* 
FROM transactions t
WHERE t.is_shared = true
  AND t.user_id = auth.uid();  -- ✅ Filtrar por usuário atual

-- 2. Recriar trip_budget_summary
DROP VIEW IF EXISTS public.trip_budget_summary;

CREATE VIEW public.trip_budget_summary
WITH (security_invoker = true)  -- ✅ SEGURO
AS 
SELECT 
  t.trip_id,
  SUM(t.amount) as total_spent,
  COUNT(*) as transaction_count
FROM transactions t
WHERE t.trip_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = t.trip_id
      AND tm.user_id = auth.uid()  -- ✅ Apenas viagens do usuário
  )
GROUP BY t.trip_id;

-- 3. Recriar shared_transactions_view
DROP VIEW IF EXISTS public.shared_transactions_view;

CREATE VIEW public.shared_transactions_view
WITH (security_invoker = true)  -- ✅ SEGURO
AS 
SELECT 
  t.*,
  ts.member_id,
  ts.percentage,
  ts.amount as split_amount,
  ts.is_settled
FROM transactions t
JOIN transaction_splits ts ON t.id = ts.transaction_id
WHERE t.user_id = auth.uid()  -- ✅ Apenas transações do usuário
   OR ts.user_id = auth.uid(); -- ✅ Ou splits do usuário

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar que views agora usam security_invoker
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE viewname IN (
  'shared_transactions_for_current_user',
  'trip_budget_summary',
  'shared_transactions_view'
);

-- Testar que RLS está funcionando
-- (executar como usuário não-admin)
SELECT COUNT(*) FROM shared_transactions_for_current_user;
SELECT COUNT(*) FROM trip_budget_summary;
SELECT COUNT(*) FROM shared_transactions_view;
```

---

## 🧪 TESTE DE SEGURANÇA

### Antes da Correção (VULNERÁVEL)
```sql
-- Como usuário A
SELECT COUNT(*) FROM shared_transactions_view;
-- Resultado: 1000 transações (TODAS do sistema) ❌

-- Como usuário B
SELECT COUNT(*) FROM trip_budget_summary;
-- Resultado: 50 viagens (TODAS do sistema) ❌
```

### Depois da Correção (SEGURO)
```sql
-- Como usuário A
SELECT COUNT(*) FROM shared_transactions_view;
-- Resultado: 10 transações (apenas do usuário A) ✅

-- Como usuário B
SELECT COUNT(*) FROM trip_budget_summary;
-- Resultado: 2 viagens (apenas do usuário B) ✅
```

---

## 📋 CHECKLIST DE CORREÇÃO

### Pré-Correção
- [ ] Backup do banco de dados criado
- [ ] Migration de correção criada
- [ ] Código revisado

### Aplicação
- [ ] Migration aplicada em desenvolvimento
- [ ] Testes de segurança executados
- [ ] Verificação de RLS funcionando
- [ ] Migration aplicada em produção

### Pós-Correção
- [ ] Verificar que views usam security_invoker
- [ ] Testar com múltiplos usuários
- [ ] Confirmar que RLS está ativo
- [ ] Monitorar logs por 24h

---

## 🚨 AÇÃO IMEDIATA REQUERIDA

### Prioridade: 🔴 CRÍTICA
### Tempo Estimado: 15 minutos
### Risco se Não Corrigir: **VAZAMENTO DE DADOS**

### Passos:
1. ✅ Fazer backup (já instruído)
2. ⏳ Criar migration de correção
3. ⏳ Testar em desenvolvimento
4. ⏳ Aplicar em produção
5. ⏳ Verificar funcionamento

---

## 📊 IMPACTO DA CORREÇÃO

### Positivo
- ✅ Segurança restaurada
- ✅ RLS funcionando corretamente
- ✅ Dados protegidos
- ✅ Conformidade com LGPD

### Possíveis Efeitos Colaterais
- ⚠️ Queries podem retornar menos dados (correto!)
- ⚠️ Código que dependia do bug pode quebrar
- ⚠️ Necessário testar todas as features

---

## 🔍 COMO ISSO PASSOU DESPERCEBIDO?

### Possíveis Causas
1. Views criadas antes de implementar RLS
2. Migração de sistema legado
3. Falta de auditoria de segurança
4. Testes não verificaram isolamento de dados

### Prevenção Futura
1. ✅ Sempre usar `security_invoker = true`
2. ✅ Nunca usar `SECURITY DEFINER` sem necessidade
3. ✅ Auditar todas as views periodicamente
4. ✅ Testes de segurança automatizados

---

## 📝 DOCUMENTAÇÃO ADICIONAL

### Referências
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

### Artigos Relacionados
- "Why SECURITY DEFINER is Dangerous"
- "PostgreSQL View Security Best Practices"
- "Supabase RLS Bypass Vulnerabilities"

---

## 🆘 SE HOUVER VAZAMENTO DE DADOS

### Ações Imediatas
1. 🚨 Aplicar correção IMEDIATAMENTE
2. 🚨 Notificar usuários afetados
3. 🚨 Auditar logs de acesso
4. 🚨 Verificar se houve acesso não autorizado
5. 🚨 Documentar incidente

### Conformidade LGPD
- Notificar ANPD se houver vazamento
- Notificar usuários em até 72h
- Documentar medidas corretivas
- Implementar melhorias de segurança

---

**ESTA É UMA VULNERABILIDADE CRÍTICA QUE REQUER CORREÇÃO IMEDIATA!**

**Data**: 20/04/2026  
**Descoberto por**: Auditoria de Segurança  
**Status**: 🔴 ATIVO - Aguardando Correção
