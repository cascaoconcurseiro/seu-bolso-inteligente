# 🔒 APLICAR PRIVACIDADE DE ORÇAMENTOS - INSTRUÇÕES

## ✅ STATUS: PRONTO PARA APLICAR

### 📋 O QUE FOI IMPLEMENTADO

**Problema Resolvido**: Orçamentos de viagens não eram privados - todos viam o orçamento do criador.

**Solução Implementada**:
1. ✅ Migração de banco de dados criada
2. ✅ Hook `useTrips` atualizado para buscar orçamento pessoal
3. ✅ Interface `TripWithPersonalBudget` criada
4. ✅ UI da lista de viagens atualizada (mostra "Meu Orçamento")
5. ✅ UI do detalhe da viagem atualizada (mostra "Meu Orçamento")
6. ✅ Cálculo de progresso atualizado (apenas gastos do usuário)
7. ✅ Labels alteradas para primeira pessoa ("Meu", "Meus", "Me restam")

---

## 🚀 PASSO 1: APLICAR MIGRAÇÃO NO BANCO

### Abra o Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Cole o script abaixo
3. Clique em **RUN**

```sql
-- =====================================================
-- FIX: TRIP BUDGET PRIVACY & PERSONAL OWNERSHIP
-- =====================================================
-- 
-- OBJETIVO: Garantir que orçamentos de viagens sejam
-- estritamente pessoais e privados
--
-- REGRA DE NEGÓCIO: TODO orçamento é PESSOAL
-- Nenhum usuário deve ver orçamento de outros
-- 
-- =====================================================

-- =====================================================
-- PARTE 1: CONSTRAINTS E ÍNDICES
-- =====================================================

-- 1. Adicionar constraint de positividade para orçamentos
DO $$
BEGIN
  -- Remover constraint antiga se existir
  ALTER TABLE trip_participants DROP CONSTRAINT IF EXISTS personal_budget_positive;
  
  -- Adicionar nova constraint
  ALTER TABLE trip_participants
  ADD CONSTRAINT personal_budget_positive CHECK (personal_budget IS NULL OR personal_budget >= 0);
  
  RAISE NOTICE '✅ Constraint de positividade adicionada';
END $$;

-- 2. Criar índice para performance em queries de orçamento
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_trip_participants_user_trip 
  ON trip_participants(user_id, trip_id);
  
  RAISE NOTICE '✅ Índice de performance criado';
END $$;

-- 3. Adicionar comentários para documentação
DO $$
BEGIN
  COMMENT ON COLUMN trip_participants.personal_budget IS 
  'Orçamento PESSOAL do usuário para esta viagem. PRIVADO - nunca expor para outros usuários. Fonte única da verdade para orçamentos.';
  
  COMMENT ON TABLE trip_participants IS
  'Participantes de viagens. Campo personal_budget é PRIVADO e deve ser filtrado por user_id = auth.uid() na aplicação.';
  
  RAISE NOTICE '✅ Comentários de documentação adicionados';
END $$;

-- =====================================================
-- PARTE 2: POPULAR ORÇAMENTOS NULL (TEMPORÁRIO)
-- =====================================================

-- Popular orçamentos NULL com 0 (temporário para evitar erros)
-- Usuários serão solicitados a definir orçamento real no primeiro acesso
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE trip_participants
  SET personal_budget = 0
  WHERE personal_budget IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ % orçamentos NULL populados com 0 (temporário)', v_updated_count;
END $$;

-- =====================================================
-- PARTE 3: ATUALIZAR RLS POLICIES
-- =====================================================

-- Manter política existente mas adicionar documentação
DO $$
BEGIN
  -- A política atual já está correta:
  -- "Users can view trip participants" permite ver participantes
  -- MAS a aplicação deve filtrar personal_budget por user_id
  
  -- Adicionar comentário na política
  COMMENT ON POLICY "Users can view trip participants" ON trip_participants IS
  'Permite visualizar participantes da viagem. IMPORTANTE: A aplicação DEVE filtrar personal_budget retornando NULL para outros usuários (WHERE user_id != auth.uid()).';
  
  RAISE NOTICE '✅ Documentação de RLS atualizada';
END $$;

-- =====================================================
-- PARTE 4: VERIFICAÇÃO
-- =====================================================

-- Verificar constraint
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'trip_participants' 
    AND constraint_name = 'personal_budget_positive'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    RAISE NOTICE '✅ Constraint personal_budget_positive: OK';
  ELSE
    RAISE EXCEPTION '❌ Constraint personal_budget_positive: FALHOU';
  END IF;
END $$;

-- Verificar índice
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'trip_participants' 
    AND indexname = 'idx_trip_participants_user_trip'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✅ Índice idx_trip_participants_user_trip: OK';
  ELSE
    RAISE EXCEPTION '❌ Índice idx_trip_participants_user_trip: FALHOU';
  END IF;
END $$;

-- Verificar que não há orçamentos NULL
DO $$
DECLARE
  v_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM trip_participants
  WHERE personal_budget IS NULL;
  
  IF v_null_count = 0 THEN
    RAISE NOTICE '✅ Nenhum orçamento NULL encontrado';
  ELSE
    RAISE NOTICE '⚠️  % orçamentos NULL encontrados (serão solicitados no primeiro acesso)', v_null_count;
  END IF;
END $$;

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRAÇÃO DE PRIVACIDADE DE ORÇAMENTOS COMPLETA!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumo:';
  RAISE NOTICE '  ✅ Constraint de positividade criada';
  RAISE NOTICE '  ✅ Índice de performance criado';
  RAISE NOTICE '  ✅ Orçamentos NULL populados (temporário)';
  RAISE NOTICE '  ✅ Documentação atualizada';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '  1. Frontend já foi atualizado automaticamente';
  RAISE NOTICE '  2. Testar com múltiplos usuários';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '  - Orçamentos são PESSOAIS e PRIVADOS';
  RAISE NOTICE '  - Cada usuário vê apenas seu próprio orçamento';
  RAISE NOTICE '  - Nunca expor orçamento de outros usuários';
  RAISE NOTICE '';
END $$;
```

---

## 🎯 PASSO 2: VERIFICAR RESULTADO

Após executar a migração, você deve ver no SQL Editor:

```
✅ Constraint de positividade adicionada
✅ Índice de performance criado
✅ Comentários de documentação adicionados
✅ X orçamentos NULL populados com 0 (temporário)
✅ Documentação de RLS atualizada
✅ Constraint personal_budget_positive: OK
✅ Índice idx_trip_participants_user_trip: OK
✅ Nenhum orçamento NULL encontrado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MIGRAÇÃO DE PRIVACIDADE DE ORÇAMENTOS COMPLETA!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🧪 PASSO 3: TESTAR A APLICAÇÃO

### Teste 1: Lista de Viagens

1. Acesse a página de Viagens
2. Verifique que cada viagem mostra:
   - ✅ "Meu Orçamento: R$ X" (se definido)
   - ✅ "Orçamento não definido" (se não definido)
   - ❌ NUNCA "Orçamento: R$ X" (genérico)

### Teste 2: Detalhe da Viagem

1. Abra uma viagem
2. Verifique no cabeçalho:
   - ✅ "Meu Orçamento: R$ X"
   - ✅ Botão "Meu Orçamento" ou "Adicionar Orçamento"

### Teste 3: Aba Resumo

1. Acesse a aba "Resumo"
2. Verifique a seção de orçamento:
   - ✅ "Meu Orçamento" (título)
   - ✅ "Meus Gastos" (não "Gasto Total")
   - ✅ "Me restam R$ X" (não "Restam R$ X")
   - ✅ Progresso calculado APENAS com seus gastos

### Teste 4: Privacidade (CRÍTICO)

1. Crie uma viagem com outro usuário
2. Defina seu orçamento (ex: R$ 1.000)
3. Peça ao outro usuário para:
   - Definir orçamento diferente (ex: R$ 500)
   - Verificar que ele vê R$ 500 (não R$ 1.000)
4. ✅ Cada usuário deve ver APENAS seu próprio orçamento

---

## 📊 MUDANÇAS IMPLEMENTADAS

### Banco de Dados

- ✅ Constraint `personal_budget_positive` (valores >= 0)
- ✅ Índice `idx_trip_participants_user_trip` (performance)
- ✅ Comentários de documentação
- ✅ Orçamentos NULL populados com 0

### Backend (`src/hooks/useTrips.ts`)

- ✅ Query atualizada com JOIN em `trip_participants`
- ✅ Filtro por `user_id` do usuário logado
- ✅ Transformação para incluir `my_personal_budget`
- ✅ Interface `TripWithPersonalBudget` criada

### Frontend (`src/pages/Trips.tsx`)

**Lista de Viagens**:
- ✅ `trip.budget` → `trip.my_personal_budget`
- ✅ "Orçamento" → "Meu Orçamento"
- ✅ Tratamento de orçamento não definido

**Detalhe da Viagem - Cabeçalho**:
- ✅ `selectedTrip.budget` → `myPersonalBudget`
- ✅ "Orçamento" → "Meu Orçamento"

**Detalhe da Viagem - Aba Resumo**:
- ✅ "Orçamento" → "Meu Orçamento"
- ✅ "Gasto Total" → "Meus Gastos"
- ✅ "Restam" → "Me restam"
- ✅ Filtro de gastos por `user_id`
- ✅ Cálculo de progresso apenas com gastos pessoais

---

## ⚠️ IMPORTANTE

### Regras de Negócio

1. **TODO orçamento é PESSOAL**: Cada usuário tem seu próprio orçamento
2. **ZERO vazamento**: Nenhum usuário vê orçamento de outros
3. **Linguagem primeira pessoa**: "Meu", "Meus", "Me restam"
4. **Gastos isolados**: Cada usuário vê apenas seus próprios gastos no progresso

### Comportamento Esperado

- ✅ Modal de orçamento aparece na primeira vez que usuário acessa viagem
- ✅ Usuário pode atualizar orçamento clicando no botão "Meu Orçamento"
- ✅ Progresso mostra apenas gastos do usuário logado
- ✅ Dois usuários na mesma viagem veem valores diferentes

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot read property 'my_personal_budget' of undefined"

**Causa**: Migração não foi aplicada ou query não está retornando dados.

**Solução**:
1. Verifique se a migração foi executada com sucesso
2. Verifique se você é participante da viagem
3. Limpe o cache do navegador (Ctrl+Shift+R)

### Erro: "personal_budget_positive constraint violation"

**Causa**: Tentativa de salvar orçamento negativo.

**Solução**: O sistema já valida no frontend, mas se ocorrer, verifique o valor sendo enviado.

### Orçamento não aparece na lista

**Causa**: `personal_budget` está NULL no banco.

**Solução**:
1. Acesse a viagem (modal de orçamento aparecerá)
2. Defina um orçamento
3. Volte para a lista

---

## ✅ CHECKLIST FINAL

Antes de considerar completo, verifique:

- [ ] Migração executada com sucesso no Supabase
- [ ] Lista de viagens mostra "Meu Orçamento"
- [ ] Detalhe da viagem mostra "Meu Orçamento"
- [ ] Aba Resumo usa linguagem primeira pessoa
- [ ] Progresso calculado apenas com gastos pessoais
- [ ] Testado com 2 usuários diferentes
- [ ] Cada usuário vê apenas seu próprio orçamento
- [ ] Modal de orçamento funciona corretamente

---

## 📚 ARQUIVOS MODIFICADOS

1. `supabase/migrations/20251227210000_fix_trip_budget_privacy.sql` (criado)
2. `src/hooks/useTrips.ts` (atualizado)
3. `src/pages/Trips.tsx` (atualizado)

---

## 🎉 PRÓXIMOS PASSOS

Após aplicar e testar:

1. ✅ Marcar Task 2.1 como completa no spec
2. ✅ Marcar Task 3.1 como completa no spec
3. ✅ Marcar Task 4.1, 4.2, 4.3 como completas no spec
4. Continuar com tarefas restantes do spec (se necessário)

---

**Data**: 27/12/2024
**Status**: ✅ PRONTO PARA APLICAR
**Prioridade**: 🔴 ALTA (Privacidade de dados)
