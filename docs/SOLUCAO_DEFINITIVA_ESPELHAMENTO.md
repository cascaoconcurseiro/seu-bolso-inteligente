# 🔧 Solução Definitiva: Espelhamento de Transações Compartilhadas

**Data:** 27/12/2024  
**Status:** Pronto para aplicar

## 📋 Resumo Executivo

Este documento apresenta a solução completa para o problema de **transações espelhadas que não aparecem** no sistema de compartilhamento. A solução corrige os **7 problemas clássicos** identificados em sistemas Supabase/Postgres com RLS.

## 🎯 Problemas Identificados

### 1️⃣ Trigger Não Está Disparando

**Sintomas:**
- Trigger criada como `BEFORE` quando deveria ser `AFTER`
- Trigger apenas para `INSERT`, mas compartilhamento acontece via `UPDATE`
- Trigger na tabela errada ou desabilitada

**Solução:**
```sql
CREATE TRIGGER trg_transaction_mirroring
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION handle_transaction_mirroring();
```

### 2️⃣ Função SEM SECURITY DEFINER

**Sintoma:**
- INSERT original funciona
- INSERT da sombra "falha silenciosamente" (bloqueado por RLS)

**Solução:**
```sql
CREATE OR REPLACE FUNCTION handle_transaction_mirroring()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ CRÍTICO
SET search_path = public  -- ✅ CRÍTICO
```

### 3️⃣ RLS Bloqueando INSERT no Usuário B

**Problema:**
- Mesmo com `SECURITY DEFINER`, se usar `auth.uid()` dentro da função, o INSERT pode ir para o lugar errado

**Solução:**
- NUNCA usar `auth.uid()` dentro da função
- Usar sempre `NEW.user_id` e campos explícitos

### 4️⃣ Guard Clause Bloqueando Tudo

**Problema:**
```sql
IF NEW.source_transaction_id IS NOT NULL THEN
  RETURN NEW;  -- Retorna antes de espelhar
END IF;
```

**Solução:**
- Guard clause APENAS para evitar recursão em espelhos
- Verificar no início da função

### 5️⃣ Campo de Ativação Nunca Fica Verdadeiro

**Problemas:**
- `is_shared = true` mas `user_id` do membro vazio
- Front usa outro campo (ex: array)
- Update parcial não passa pela trigger

**Solução:**
```sql
IF NEW.is_shared IS DISTINCT FROM TRUE THEN
  RETURN NEW;  -- Não é compartilhada
END IF;
```

### 6️⃣ Falha em FK Causando Rollback

**Problema:**
- Copiar `trip_id`, `category_id`, `account_id` sem sanitização
- FK ERROR → rollback → sombra não nasce
- Erro nem sobe pro front

**Solução:**
```sql
INSERT INTO transactions (
  account_id,
  category_id,
  trip_id,
  ...
) VALUES (
  NULL,  -- ✅ Sanitizado
  NULL,  -- ✅ Sanitizado
  NULL,  -- ✅ Sanitizado
  ...
);
```

### 7️⃣ UPDATE em Vez de INSERT

**Problema:**
- Usuário cria despesa não compartilhada
- Depois marca como compartilhada (UPDATE)
- Trigger só trata INSERT → nunca espelha

**Solução:**
```sql
CREATE TRIGGER trg_transaction_mirroring
AFTER INSERT OR UPDATE OR DELETE ON transactions  -- ✅ Cobre UPDATE
```

## 🚀 Como Aplicar a Correção

### Passo 1: Diagnóstico

Execute o script de diagnóstico para identificar problemas:

```bash
# No Supabase SQL Editor
scripts/DIAGNOSTICO_ESPELHAMENTO_COMPLETO.sql
```

Este script verifica:
- ✅ Triggers instalados e habilitados
- ✅ Funções com SECURITY DEFINER
- ✅ Políticas RLS
- ✅ Guard clauses problemáticas
- ✅ Campos de ativação
- ✅ Foreign keys
- ✅ Cobertura de UPDATE

### Passo 2: Aplicar Correção

Execute o script de correção definitiva:

```bash
# No Supabase SQL Editor
scripts/FIX_ESPELHAMENTO_DEFINITIVO.sql
```

Este script:
1. ✅ Remove triggers e funções antigas
2. ✅ Cria função profissional com SECURITY DEFINER
3. ✅ Cria triggers corretos (INSERT/UPDATE/DELETE)
4. ✅ Cria índices obrigatórios
5. ✅ Cria trigger de auto-conexão
6. ✅ Migra transações existentes
7. ✅ Executa verificação final

### Passo 3: Verificação

Após aplicar, verifique:

```sql
-- Verificar triggers
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'transactions'::regclass;

-- Verificar SECURITY DEFINER
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'handle_transaction_mirroring';

-- Verificar espelhos criados
SELECT 
  COUNT(*) FILTER (WHERE source_transaction_id IS NULL) as originais,
  COUNT(*) FILTER (WHERE source_transaction_id IS NOT NULL) as espelhos
FROM transactions
WHERE is_shared = true;
```

## 📊 Arquitetura da Solução

### Fluxo de Espelhamento

```
1. Usuário A cria transação compartilhada
   ↓
2. Trigger AFTER INSERT dispara
   ↓
3. Função handle_transaction_mirroring() executa com SECURITY DEFINER
   ↓
4. Para cada split com member que tem user_id:
   ↓
5. Cria transação espelho para o member
   - user_id = member.user_id
   - amount = split.amount
   - source_transaction_id = transação original
   - FKs sanitizados (NULL)
   ↓
6. Registra em shared_transaction_mirrors
   ↓
7. Usuário B vê a transação espelhada
```

### Tabelas Envolvidas

```
transactions
├── id (PK)
├── user_id (quem vê a transação)
├── is_shared (flag de compartilhamento)
├── source_transaction_id (NULL = original, UUID = espelho)
└── payer_id (quem pagou)

transaction_splits
├── transaction_id (FK → transactions)
├── member_id (FK → family_members)
└── amount (valor do split)

family_members
├── id (PK)
├── user_id (usuário vinculado)
├── linked_user_id (usuário vinculado alternativo)
└── name

shared_transaction_mirrors (controle)
├── original_transaction_id
├── mirror_transaction_id
├── mirror_user_id
└── sync_status
```

## 🔒 Segurança e RLS

### SECURITY DEFINER

A função usa `SECURITY DEFINER` para:
- ✅ Bypass de RLS ao criar espelhos
- ✅ Permitir INSERT em `transactions` de outro usuário
- ✅ Executar com privilégios do owner da função

### RLS Policies

As políticas RLS continuam ativas:
- ✅ Usuários só veem suas próprias transações
- ✅ Espelhos aparecem porque `user_id = auth.uid()`
- ✅ SECURITY DEFINER não afeta queries SELECT

## 🧪 Testes

### Teste 1: Criar Transação Compartilhada

```sql
-- Como Usuário A
INSERT INTO transactions (
  user_id,
  amount,
  description,
  date,
  type,
  is_shared
) VALUES (
  auth.uid(),
  100.00,
  'Jantar compartilhado',
  NOW(),
  'EXPENSE',
  true
) RETURNING id;

-- Criar split para Usuário B
INSERT INTO transaction_splits (
  transaction_id,
  member_id,
  amount
) VALUES (
  '<transaction_id>',
  '<member_id_do_usuario_b>',
  50.00
);

-- Verificar espelho criado
SELECT * FROM transactions
WHERE source_transaction_id = '<transaction_id>';
```

### Teste 2: Atualizar Transação Compartilhada

```sql
-- Como Usuário A
UPDATE transactions
SET description = 'Jantar compartilhado (atualizado)'
WHERE id = '<transaction_id>';

-- Verificar espelho atualizado
SELECT description FROM transactions
WHERE source_transaction_id = '<transaction_id>';
-- Deve mostrar: "Jantar compartilhado (atualizado)"
```

### Teste 3: Deletar Transação Compartilhada

```sql
-- Como Usuário A
DELETE FROM transactions
WHERE id = '<transaction_id>';

-- Verificar espelho deletado
SELECT COUNT(*) FROM transactions
WHERE source_transaction_id = '<transaction_id>';
-- Deve retornar: 0
```

## 📈 Monitoramento

### Queries Úteis

```sql
-- Transações sem espelhos (problemáticas)
SELECT 
  t.id,
  t.description,
  COUNT(ts.id) as splits,
  COUNT(m.id) as espelhos
FROM transactions t
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
LEFT JOIN transactions m ON m.source_transaction_id = t.id
WHERE t.is_shared = true
AND t.source_transaction_id IS NULL
GROUP BY t.id, t.description
HAVING COUNT(m.id) = 0;

-- Status de sincronização
SELECT 
  sync_status,
  COUNT(*) as total
FROM shared_transaction_mirrors
GROUP BY sync_status;

-- Espelhos por usuário
SELECT 
  p.email,
  COUNT(*) as total_espelhos
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.source_transaction_id IS NOT NULL
GROUP BY p.email
ORDER BY total_espelhos DESC;
```

## 🎯 Próximos Passos

1. ✅ Executar `DIAGNOSTICO_ESPELHAMENTO_COMPLETO.sql`
2. ✅ Revisar resultados do diagnóstico
3. ✅ Executar `FIX_ESPELHAMENTO_DEFINITIVO.sql`
4. ✅ Verificar espelhos criados
5. ✅ Testar criação de nova transação compartilhada
6. ✅ Testar atualização e deleção
7. ✅ Monitorar logs de erro

## 📞 Suporte

Se após aplicar a correção ainda houver problemas:

1. Execute o diagnóstico novamente
2. Verifique os logs do Supabase
3. Confirme que RLS está habilitado
4. Verifique se `family_members` tem `user_id` ou `linked_user_id` preenchidos

## ✅ Checklist de Validação

- [ ] Triggers instalados e habilitados
- [ ] Função com SECURITY DEFINER
- [ ] Índices criados
- [ ] Transações existentes migradas
- [ ] Novo compartilhamento funciona
- [ ] Update sincroniza espelhos
- [ ] Delete remove espelhos
- [ ] RLS continua funcionando
- [ ] Sem erros de FK
- [ ] Membros com user_id vinculado

---

**Resultado Esperado:** Todas as transações compartilhadas devem aparecer automaticamente para os membros vinculados, sem necessidade de intervenção manual.
