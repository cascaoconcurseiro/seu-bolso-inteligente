# Diagnóstico e Correções do Sistema - 29/12/2024

## Estado Atual do Banco de Dados

### Dados
- ✅ 2 usuários: Wesley (dono) e Fran (membro)
- ✅ 1 família: "Família de wesley.diaslima"
- ✅ 1 membro ativo: Fran
- ✅ 0 convites pendentes
- ✅ 6 contas
- ✅ 1 transação
- ✅ 0 viagens
- ✅ 0 orçamentos
- ✅ 2 notificações

### Políticas RLS Atuais

#### ✅ Families - OK
- SELECT: Permite dono OU membro (via função `is_family_member`)
- INSERT, UPDATE, DELETE: Apenas dono

#### ⚠️ Family_Members - PROBLEMA POTENCIAL
- SELECT: Dono vê todos OU membro vê próprio registro
- **PROBLEMA**: Membros não veem outros membros da mesma família

#### ✅ Profiles - OK
- SELECT: Qualquer usuário autenticado pode ver perfis

#### ⚠️ Accounts - PROBLEMA
- SELECT: Apenas próprias contas
- **PROBLEMA**: Membros da família não veem contas uns dos outros

#### ⚠️ Transactions - PROBLEMA CRÍTICO
- SELECT: Próprias transações OU transações de membros da família
- **PROBLEMA**: Query usa `family_members` que pode causar recursão

#### ⚠️ Trips - OK (usa função helper)
- SELECT: Dono OU membro da viagem (via `is_trip_member`)

## Problemas Identificados

### 1. Membros não veem outros membros
**Causa**: Política RLS de `family_members` não permite membros verem outros membros

**Impacto**:
- Wesley não aparece nos formulários para Fran
- Fran não aparece nos formulários para Wesley
- Viagens não mostram todos os participantes

**Solução**: Adicionar política que permite membros da mesma família se verem

### 2. Transações podem ter recursão
**Causa**: Política de `transactions` referencia `family_members` que referencia `families`

**Impacto**:
- Possíveis erros 500
- Performance ruim

**Solução**: Usar função SECURITY DEFINER

### 3. Contas não são compartilhadas
**Causa**: Política RLS de `accounts` não considera família

**Impacto**:
- Membros não veem contas uns dos outros
- Não podem criar transações em contas compartilhadas

**Solução**: Adicionar política para compartilhar contas na família

## Plano de Correção

### Fase 1: Corrigir Family_Members (CRÍTICO)
```sql
-- Permitir membros da mesma família se verem
CREATE POLICY "Members can view other members of same family"
ON family_members
FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT family_id FROM family_members
    WHERE linked_user_id = (SELECT auth.uid())
      AND status = 'active'
  )
);
```

### Fase 2: Corrigir Accounts (IMPORTANTE)
```sql
-- Permitir ver contas de membros da família
CREATE POLICY "Users can view family accounts"
ON accounts
FOR SELECT
TO authenticated
USING (
  user_id IN (
    -- Próprio usuário
    SELECT (SELECT auth.uid())
    UNION
    -- Dono da família onde sou membro
    SELECT f.owner_id FROM families f
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.linked_user_id = (SELECT auth.uid())
      AND fm.status = 'active'
    UNION
    -- Outros membros da família onde sou dono
    SELECT fm.linked_user_id FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE f.owner_id = (SELECT auth.uid())
      AND fm.status = 'active'
  )
);
```

### Fase 3: Otimizar Transactions (PERFORMANCE)
```sql
-- Criar função helper
CREATE OR REPLACE FUNCTION can_view_transaction(tx_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- É própria transação
  IF tx_user_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- É transação de membro da família
  RETURN EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE (
      -- Sou dono e tx é de membro
      (f.owner_id = current_user_id AND fm.linked_user_id = tx_user_id)
      OR
      -- Sou membro e tx é do dono
      (fm.linked_user_id = current_user_id AND f.owner_id = tx_user_id)
      OR
      -- Somos ambos membros da mesma família
      (fm.linked_user_id = current_user_id AND EXISTS (
        SELECT 1 FROM family_members fm2
        WHERE fm2.family_id = fm.family_id
          AND fm2.linked_user_id = tx_user_id
          AND fm2.status = 'active'
      ))
    )
    AND fm.status = 'active'
  );
END;
$$;

-- Usar função na política
DROP POLICY IF EXISTS "Users can view transactions" ON transactions;
CREATE POLICY "Users can view transactions"
ON transactions
FOR SELECT
TO authenticated
USING (can_view_transaction(user_id));
```

### Fase 4: Testar Cada Funcionalidade

#### Testes de Família
- [ ] Wesley vê Fran na lista de membros
- [ ] Fran vê Wesley na lista de membros
- [ ] Ambos aparecem em formulários

#### Testes de Contas
- [ ] Wesley vê suas contas
- [ ] Fran vê suas contas
- [ ] Wesley vê contas de Fran
- [ ] Fran vê contas de Wesley

#### Testes de Transações
- [ ] Criar transação como Wesley
- [ ] Fran vê transação de Wesley
- [ ] Criar transação como Fran
- [ ] Wesley vê transação de Fran
- [ ] Editar transação sincroniza
- [ ] Excluir transação sincroniza

#### Testes de Viagens
- [ ] Criar viagem
- [ ] Adicionar Wesley como participante
- [ ] Adicionar Fran como participante
- [ ] Ambos aparecem na lista

## Ordem de Execução

1. ✅ Diagnóstico completo
2. ⏭️ Corrigir family_members RLS
3. ⏭️ Corrigir accounts RLS
4. ⏭️ Otimizar transactions RLS
5. ⏭️ Testar frontend
6. ⏭️ Documentar resultados
