# Problema: Transações Compartilhadas Sem Splits

**Data**: 31/12/2025  
**Status**: 🔍 Diagnosticado - Aguardando Correção

## Problema Identificado

Transações compartilhadas criadas na viagem "Férias" não aparecem na aba "Viagens" porque **não têm splits criados**.

### Transações Afetadas

1. **uber** - $20 USD (criada por Fran)
2. **almoço** - $30 USD (criada por Fran)
3. **dez** - $10 USD (criada por Fran)
4. **maria** - $10 USD (criada por Fran) ❌ SEM SPLIT

### Transação que Funciona

- **maria** - $5 USD (criada por Wesley) ✅ TEM SPLIT

## Causa Raiz

Quando uma transação compartilhada é criada, ela deve ter:
1. ✅ `is_shared = true` (todas têm)
2. ✅ `trip_id` definido (todas têm)
3. ❌ **Splits criados** (faltando!)

O hook `useSharedFinances` processa apenas transações que TÊM splits, porque:
- **CASO 1A**: EU PAGUEI → Splits são CRÉDITOS (me devem)
- **CASO 1B**: OUTRO PAGOU → Meu split é DÉBITO (eu devo)

**Sem splits = transação não aparece!**

## Diagnóstico Completo

### Debug Output

```
📝 Raw Shared Transactions (8):
• uber - $20 USD ✅ trip_id: 0bb8daa3... ❌ Sem splits
• almoço - $30 USD ✅ trip_id: 0bb8daa3... ❌ Sem splits
• dez - $10 USD ✅ trip_id: 0bb8daa3... ❌ Sem splits
• maria - $10 USD ✅ trip_id: 0bb8daa3... ❌ Sem splits
• maria - $5 USD ✅ trip_id: 0bb8daa3... ✅ TEM split

🔀 Raw Splits (3):
• Split de $5 para maria ✅ (por isso aparece)
• Splits de mercado (não são de viagem)

📊 Processed Invoices:
• Fran: 1 Travel Item (apenas maria de $5)
• Wesley: 0 Travel Items
```

### Por que Aconteceu?

Possíveis causas:
1. **Interface não criou splits**: Ao criar a transação compartilhada, o formulário não criou os splits
2. **Erro no backend**: Trigger ou função que deveria criar splits falhou
3. **Criação manual**: Transações foram criadas manualmente sem splits

## Solução

### Opção 1: Corrigir no Banco de Dados (Recomendado)

Execute o script `fix-missing-splits-simple.sql` no Supabase SQL Editor:

1. Abra o Supabase SQL Editor
2. Execute o PASSO 2 para buscar os IDs dos membros
3. Substitua os IDs no script
4. Execute os INSERTs para criar os splits
5. Verifique com o PASSO 4

### Opção 2: Recriar as Transações

1. Deletar as transações sem splits
2. Criar novamente usando a interface
3. Verificar se os splits são criados corretamente

### Opção 3: Criar Splits Manualmente na Interface

1. Editar cada transação
2. Adicionar os participantes
3. Salvar

## Prevenção Futura

### Verificar Criação de Splits

Adicionar validação no frontend:
```typescript
// Após criar transação compartilhada
if (isShared && selectedMembers.length > 0) {
  // Verificar se splits foram criados
  const { data: splits } = await supabase
    .from('transaction_splits')
    .select('id')
    .eq('transaction_id', newTransaction.id);
  
  if (!splits || splits.length === 0) {
    console.error('❌ Splits não foram criados!');
    toast.error('Erro ao criar divisão da despesa');
  }
}
```

### Trigger no Banco de Dados

Criar trigger para garantir que transações compartilhadas tenham splits:
```sql
CREATE OR REPLACE FUNCTION check_shared_transaction_has_splits()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é compartilhada, deve ter splits
  IF NEW.is_shared = true THEN
    -- Aguardar 1 segundo e verificar
    PERFORM pg_sleep(1);
    
    IF NOT EXISTS (
      SELECT 1 FROM transaction_splits 
      WHERE transaction_id = NEW.id
    ) THEN
      RAISE WARNING 'Transação compartilhada % sem splits!', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_shared_has_splits
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION check_shared_transaction_has_splits();
```

## Impacto

### Atual
- ❌ 4 transações não aparecem na aba Viagens
- ❌ Totais incorretos
- ❌ Usuário não vê despesas compartilhadas

### Após Correção
- ✅ Todas as 5 transações aparecem
- ✅ Totais corretos
- ✅ Experiência completa

## Próximos Passos

1. ✅ Diagnosticar problema (CONCLUÍDO)
2. ⏳ Executar script de correção no banco
3. ⏳ Verificar se transações aparecem
4. ⏳ Implementar prevenção futura
5. ⏳ Testar criação de novas transações compartilhadas

## Notas Técnicas

### Como o Hook Funciona

```typescript
// useSharedFinances.ts

// CASO 1A: EU PAGUEI
if (tx.user_id === user?.id) {
  splits.forEach((split: any) => {
    // Criar CRÉDITO (me devem)
    invoiceMap[memberId].push({
      type: 'CREDIT',
      amount: split.amount,
      // ...
    });
  });
}

// CASO 1B: OUTRO PAGOU
else {
  const mySplit = splits.find((s: any) => s.user_id === user?.id);
  if (mySplit) {
    // Criar DÉBITO (eu devo)
    invoiceMap[creatorMember.id].push({
      type: 'DEBIT',
      amount: mySplit.amount,
      // ...
    });
  }
}
```

**Sem splits = nenhum item criado!**

### Estrutura Correta

```
Transaction (is_shared=true, trip_id=xxx)
  └─ Split 1 (member_id=A, amount=50%)
  └─ Split 2 (member_id=B, amount=50%)
```

## Conclusão

O problema não é no código do hook ou no filtro, mas sim na **ausência de splits** nas transações compartilhadas. Após criar os splits, todas as transações devem aparecer corretamente na aba Viagens.

**Status**: Aguardando execução do script de correção no banco de dados.
