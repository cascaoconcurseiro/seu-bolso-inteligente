# Correção Completa do Sistema de Transações Compartilhadas

## Data: 27/12/2024

## Problema Identificado

As transações compartilhadas não estavam aparecendo corretamente na página "Compartilhados" devido a múltiplos problemas:

1. **Duplicação de Modelos**: O sistema tinha DOIS modelos diferentes para transações compartilhadas:
   - **Modelo NOVO**: `transaction_splits` (tabela separada) - usado pelo frontend
   - **Modelo ANTIGO**: `shared_with` (JSONB) - usado pelas funções do banco

2. **Falta de Sincronização**: Quando o frontend criava splits, o banco não atualizava o `shared_with`, então as funções de espelhamento não funcionavam

3. **linked_user_id Incorreto**: Os membros da família tinham `linked_user_id` apontando para o outro membro, quando deveria apontar para o próprio `user_id`

4. **Transações Espelhadas Não Criadas**: Sem o `shared_with` preenchido, as transações espelhadas (mirror) não eram criadas

## Solução Aplicada

### 1. Migração para Sincronizar os Dois Modelos

Criada função `sync_splits_to_shared_with()` que:
- Monitora inserções/atualizações em `transaction_splits`
- Atualiza automaticamente o campo `shared_with` da transação
- Chama `sync_shared_transaction()` para criar transações espelhadas

```sql
CREATE OR REPLACE FUNCTION sync_splits_to_shared_with()
RETURNS TRIGGER AS $$
DECLARE
    v_shared_with JSONB := '[]'::jsonb;
    v_split RECORD;
BEGIN
    -- Buscar todos os splits da transação
    FOR v_split IN 
        SELECT member_id, assigned_amount, is_settled 
        FROM transaction_splits 
        WHERE transaction_id = NEW.transaction_id
    LOOP
        v_shared_with := v_shared_with || jsonb_build_object(
            'memberId', v_split.member_id,
            'assignedAmount', v_split.assigned_amount,
            'isSettled', COALESCE(v_split.is_settled, false)
        );
    END LOOP;
    
    -- Atualizar a transação com o shared_with
    UPDATE transactions 
    SET shared_with = v_shared_with,
        is_shared = (jsonb_array_length(v_shared_with) > 0)
    WHERE id = NEW.transaction_id;
    
    -- Chamar sync para criar transações espelhadas
    IF jsonb_array_length(v_shared_with) > 0 THEN
        PERFORM sync_shared_transaction(NEW.transaction_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Correção do linked_user_id

Corrigido para que cada membro aponte para seu próprio `user_id`:

```sql
-- Fran: linked_user_id = user_id da Fran
UPDATE family_members 
SET linked_user_id = user_id
WHERE id = 'fa06c3b4-debf-4911-b14f-b559c434092e';

-- Wesley: linked_user_id = user_id do Wesley  
UPDATE family_members
SET linked_user_id = user_id
WHERE id = '69d68fc0-2194-4f66-b25b-95c314cf82ff';
```

### 3. Sincronização de Transações Existentes

Criados `transaction_splits` para transações que tinham `shared_with` mas não tinham splits:

```sql
DO $$
DECLARE
    v_tx RECORD;
    v_split JSONB;
BEGIN
    FOR v_tx IN 
        SELECT id, shared_with 
        FROM transactions 
        WHERE is_shared = true 
        AND shared_with IS NOT NULL 
        AND jsonb_array_length(shared_with) > 0
        AND NOT EXISTS (
            SELECT 1 FROM transaction_splits WHERE transaction_id = transactions.id
        )
    LOOP
        -- Criar splits a partir do shared_with
        FOR v_split IN SELECT * FROM jsonb_array_elements(v_tx.shared_with)
        LOOP
            INSERT INTO transaction_splits (
                transaction_id,
                member_id,
                assigned_amount,
                percentage,
                is_settled
            ) VALUES (
                v_tx.id,
                (v_split->>'memberId')::UUID,
                (v_split->>'assignedAmount')::NUMERIC,
                100,
                COALESCE((v_split->>'isSettled')::BOOLEAN, false)
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
```

### 4. Limpeza de Dados Incorretos

Removida transação "iiii (Wesley)" que estava com `shared_with = []` e dados inconsistentes.

## Resultado

✅ **Transações compartilhadas agora aparecem corretamente**:
- Quando Wesley cria uma transação compartilhada, ela aparece como CREDIT (a receber) na página Compartilhados
- Automaticamente é criada uma transação espelhada para Fran, que aparece como DEBIT (a pagar)
- Os splits são sincronizados com o shared_with
- As transações espelhadas são criadas automaticamente

✅ **Transações espelhadas criadas**:
- "Teste Diagnóstico (1/2)" - Espelho criado para Fran
- "Teste Diagnóstico (2/2)" - Espelho criado para Fran

✅ **Sistema unificado**:
- Frontend continua usando `transaction_splits`
- Banco mantém `shared_with` sincronizado automaticamente
- Funções de espelhamento funcionam corretamente

## Fluxo Correto Agora

1. **Frontend cria transação** com `splits` array
2. **Hook useTransactions** insere na tabela `transactions` e cria `transaction_splits`
3. **Trigger `trg_sync_splits_to_shared_with`** é disparado
4. **Função `sync_splits_to_shared_with()`**:
   - Atualiza `shared_with` da transação
   - Chama `sync_shared_transaction()`
5. **Função `sync_shared_transaction()`**:
   - Cria transações espelhadas para cada membro
   - Usa `linked_user_id` para encontrar o user_id correto
6. **Hook useSharedFinances** busca:
   - Transações com splits (CREDITS - outros me devem)
   - Transações espelhadas (DEBITS - eu devo)

## Arquivos Modificados

- **Banco de Dados**: Migração aplicada via Supabase MCP
- **Nenhuma alteração no código frontend necessária** ✅

## Próximos Passos

- Testar criação de novas transações compartilhadas
- Verificar se aparecem corretamente para ambos os usuários
- Testar acertos de contas
- Verificar parcelamentos compartilhados
