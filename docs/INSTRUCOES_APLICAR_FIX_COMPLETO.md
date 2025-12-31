# 🚀 INSTRUÇÕES: Aplicar Correção Completa

## ✅ O QUE FOI CORRIGIDO NO CÓDIGO

### 1. Viagens Sumiram ✅
**Problema**: JOIN muito restritivo fazia viagens desaparecerem  
**Solução**: Alterado para LEFT JOIN + filtro manual

### 2. Modal de Transação ✅
**Problema**: Só abria em viagens/compartilhados  
**Solução**: Agora aceita contexto de qualquer página

### 3. Código já está atualizado ✅
- `src/hooks/useTrips.ts` - Corrigido
- `src/components/modals/TransactionModal.tsx` - Corrigido
- `src/components/transactions/TransactionForm.tsx` - Corrigido

---

## 🗄️ APLICAR MIGRAÇÃO NO BANCO DE DADOS

### Passo 1: Abrir Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**

### Passo 2: Copiar e Colar o Script

Copie TODO o conteúdo do arquivo: **`APLICAR_FIX_FINAL_SIMPLES.sql`**

Ou copie daqui:

```sql
-- =====================================================
-- FIX FINAL SIMPLES - COPIE E COLE NO SUPABASE
-- =====================================================

-- 1. Adicionar campo competence_date
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS competence_date DATE;

-- 2. Popular competence_date
UPDATE transactions
SET competence_date = DATE_TRUNC('month', date)::DATE
WHERE competence_date IS NULL;

-- 3. Criar função de normalização
CREATE OR REPLACE FUNCTION normalize_competence_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger
DROP TRIGGER IF EXISTS trigger_normalize_competence_date ON transactions;
CREATE TRIGGER trigger_normalize_competence_date
  BEFORE INSERT OR UPDATE OF date ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION normalize_competence_date();

-- 5. Remover duplicatas de parcelas
DELETE FROM transactions t1
WHERE t1.series_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM transactions t2
  WHERE t2.series_id = t1.series_id
  AND t2.competence_date = t1.competence_date
  AND t2.created_at < t1.created_at
);

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_competence_date 
ON transactions(competence_date);

CREATE INDEX IF NOT EXISTS idx_transactions_series_competence 
ON transactions(series_id, competence_date) 
WHERE series_id IS NOT NULL;

-- 7. Atualizar função de espelhamento
CREATE OR REPLACE FUNCTION mirror_shared_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_split RECORD;
  v_member_user_id UUID;
  v_payer_user_id UUID;
  v_split_amount NUMERIC;
BEGIN
  IF NEW.is_shared = TRUE THEN
    IF NEW.payer_id IS NOT NULL THEN
      SELECT user_id INTO v_payer_user_id
      FROM family_members
      WHERE id = NEW.payer_id;
    END IF;
    
    FOR v_split IN 
      SELECT * FROM transaction_splits 
      WHERE transaction_id = NEW.id
    LOOP
      SELECT user_id INTO v_member_user_id
      FROM family_members
      WHERE id = v_split.member_id;
      
      IF v_member_user_id IS NOT NULL AND v_member_user_id != COALESCE(v_payer_user_id, NEW.user_id) THEN
        v_split_amount := (NEW.amount * v_split.percentage / 100);
        
        INSERT INTO transactions (
          user_id,
          account_id,
          category_id,
          trip_id,
          amount,
          description,
          date,
          competence_date,
          type,
          domain,
          is_shared,
          source_transaction_id,
          notes,
          created_at,
          updated_at
        ) VALUES (
          v_member_user_id,
          NEW.account_id,
          NEW.category_id,
          NEW.trip_id,
          v_split_amount,
          NEW.description || ' (compartilhado)',
          NEW.date,
          NEW.competence_date,
          NEW.type,
          NEW.domain,
          TRUE,
          NEW.id,
          'Transação compartilhada - ' || v_split.percentage || '% do total',
          NOW(),
          NOW()
        )
        ON CONFLICT (source_transaction_id, user_id) 
        DO UPDATE SET
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          date = EXCLUDED.date,
          competence_date = EXCLUDED.competence_date,
          updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRAÇÃO APLICADA COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE 'Resultado:';
  RAISE NOTICE '  ✅ Campo competence_date criado';
  RAISE NOTICE '  ✅ Trigger de normalização ativo';
  RAISE NOTICE '  ✅ Duplicatas removidas';
  RAISE NOTICE '  ✅ Índices criados';
  RAISE NOTICE '  ✅ Função de espelhamento atualizada';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '  2. Teste navegando entre meses';
  RAISE NOTICE '  3. Verifique que parcelas não acumulam';
END $$;
```

### Passo 3: Executar

1. Cole o script no SQL Editor
2. Clique em **RUN** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode levar alguns segundos)

### Passo 4: Verificar Resultado

Você deve ver mensagens como:

```
✅ MIGRAÇÃO APLICADA COM SUCESSO!

Resultado:
  ✅ Campo competence_date criado
  ✅ Trigger de normalização ativo
  ✅ Duplicatas removidas
  ✅ Índices criados
  ✅ Função de espelhamento atualizada

Próximos passos:
  1. Limpe o cache do navegador (Ctrl+Shift+R)
  2. Teste navegando entre meses
  3. Verifique que parcelas não acumulam
```

---

## 🧪 TESTAR A APLICAÇÃO

### Teste 1: Viagens Voltaram ✅

1. Acesse a página de **Viagens**
2. Verifique que suas viagens aparecem
3. ✅ Se aparecerem = SUCESSO

### Teste 2: Modal de Transação ✅

1. Vá para qualquer página (Início, Transações, Contas, etc.)
2. Clique no botão **"Nova transação"** no topo
3. ✅ Se o modal abrir = SUCESSO

### Teste 3: Parcelas Não Acumulam ✅

1. Crie uma despesa parcelada (ex: 3x)
2. Navegue para o mês atual - deve mostrar **1 parcela**
3. Navegue para o próximo mês - deve mostrar **1 parcela**
4. Navegue para o mês seguinte - deve mostrar **1 parcela**
5. ✅ Se cada mês mostrar apenas 1 parcela = SUCESSO
6. ❌ Se acumular (1, 2, 3...) = PROBLEMA

### Teste 4: Transações Compartilhadas ✅

1. Crie uma transação compartilhada
2. Você pagou R$ 100 e dividiu 50/50
3. Na sua lista deve aparecer: **R$ 100** (valor integral)
4. Na lista do outro membro deve aparecer: **R$ 50** (sua parte)
5. ✅ Se mostrar valores corretos = SUCESSO

---

## 🐛 TROUBLESHOOTING

### Problema: Viagens ainda não aparecem

**Solução**:
1. Limpe o cache: Ctrl+Shift+R
2. Faça logout e login novamente
3. Verifique no Supabase se você é participante da viagem:
   ```sql
   SELECT * FROM trip_participants WHERE user_id = 'SEU_USER_ID';
   ```

### Problema: Parcelas ainda acumulam

**Solução**:
1. Verifique se a migração foi aplicada:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'transactions' AND column_name = 'competence_date';
   ```
2. Se retornar vazio, a migração não foi aplicada
3. Execute o script novamente

### Problema: Modal não abre

**Solução**:
1. Abra o Console do navegador (F12)
2. Veja se há erros em vermelho
3. Limpe o cache: Ctrl+Shift+R
4. Recarregue a página

### Problema: Erro ao executar SQL

**Solução**:
1. Copie o script novamente (pode ter ficado incompleto)
2. Verifique se copiou TODO o conteúdo
3. Execute linha por linha se necessário

---

## ✅ CHECKLIST FINAL

Antes de considerar completo:

- [ ] Migração SQL executada com sucesso
- [ ] Viagens aparecem na lista
- [ ] Modal de transação abre em qualquer página
- [ ] Parcelas não acumulam ao trocar de mês
- [ ] Transações compartilhadas mostram valor correto
- [ ] Cache do navegador limpo
- [ ] Testado com múltiplos meses

---

## 📊 RESUMO DAS CORREÇÕES

### Banco de Dados
- ✅ Campo `competence_date` adicionado
- ✅ Trigger de normalização criado
- ✅ Duplicatas removidas
- ✅ Índices de performance criados
- ✅ Função de espelhamento atualizada

### Código Frontend
- ✅ `useTrips.ts` - Query corrigida
- ✅ `TransactionModal.tsx` - Contexto adicionado
- ✅ `TransactionForm.tsx` - Aceita contexto

### Problemas Resolvidos
1. ✅ Viagens sumiram
2. ✅ Modal só abria em viagens/compartilhados
3. ✅ Parcelas acumulavam mês a mês
4. ✅ Transações compartilhadas não mostravam valor correto

---

**Data**: 27/12/2024  
**Status**: ✅ PRONTO PARA APLICAR  
**Prioridade**: 🔴 CRÍTICA
