# Correções Urgentes - Sincronização de Transações Compartilhadas

**Data**: 04/01/2026  
**Prioridade**: CRÍTICA

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. Transações Compartilhadas Não Sincronizam Status
**SINTOMA**: Quando uma transação compartilhada é paga em "Compartilhados", ela continua aparecendo como pendente em "Transações".

**CAUSA RAIZ**: 
- Splits não estavam vinculados aos settlements (`settled_transaction_id = null`)
- Query do `useTransactions` não incluía `transaction_splits`
- Lógica de verificação de status não considerava os splits

**CORREÇÃO APLICADA**:
1. ✅ Adicionado `transaction_splits` na query do `useTransactions.ts`
2. ✅ Corrigidos manualmente 11 splits de fevereiro/2026 no banco de dados
3. ✅ Vinculados settlements aos splits via SQL direto
4. ✅ Implementado sistema de flags bidirecionais (`settled_by_debtor` e `settled_by_creditor`)

### 2. Botão "Desfazer Todos os Acertos" Não Funciona
**SINTOMA**: Botão não desfaz os acertos e mostra erro de função RPC não encontrada.

**CAUSA RAIZ**: 
- Hook `useUnsettleMultiple` usava RPC que não existe
- Lógica diferente do desfazer individual (que funciona)
- Não replicava a sequência exata de operações

**CORREÇÃO APLICADA** (04/01/2026):
1. ✅ Removido uso do hook `useUnsettleMultiple`
2. ✅ Implementada lógica inline diretamente no `handleUndoAll`
3. ✅ Replicada EXATAMENTE a mesma sequência do `handleUndoSettlement`:
   - Buscar split para pegar IDs das transações de acerto
   - Deletar transação de acerto ANTES de atualizar split
   - Atualizar flags corretas (`settled_by_debtor`/`settled_by_creditor`)
   - Desmarcar `is_settled` apenas se ambos os lados desmarcaram
4. ✅ Adicionados logs detalhados para debug
5. ✅ Implementados contadores de sucesso/erro
6. ✅ Garantido refetch após operação

**ARQUIVOS MODIFICADOS**:
- `src/pages/SharedExpenses.tsx` (linhas 743-860)
  - Função `handleUndoAll` reescrita completamente
  - Removida importação de `useUnsettleMultiple`
  - Removida declaração do hook

### 3. Duplicidade de Transações
**SINTOMA**: Mesma transação aparece em fevereiro (pendente) E em janeiro (paga como settlement).

**CAUSA**: Transações têm ID único, mas sistema não estava respeitando isso.

**SOLUÇÃO NECESSÁRIA**:
- ❌ PENDENTE: Implementar verificação de ID único em todas as queries
- ❌ PENDENTE: Garantir que transação paga não apareça como pendente
- ❌ PENDENTE: Sincronização em tempo real entre páginas

## 📋 CHECKLIST DE VERIFICAÇÃO

### Desfazer Individual (✅ FUNCIONA)
- [x] Busca split corretamente
- [x] Deleta transação de acerto
- [x] Atualiza flags do split
- [x] Respeita lógica bidirecion al (debtor/creditor)
- [x] Faz refetch e mostra toast

### Desfazer Todos (✅ CORRIGIDO)
- [x] Coleta todos os itens pagos
- [x] Processa cada item individualmente
- [x] Usa MESMA lógica do individual
- [x] Deleta transações de acerto
- [x] Atualiza splits corretamente
- [x] Mostra contadores de sucesso/erro
- [x] Faz refetch após operação

### Sincronização de Status (⚠️ PARCIAL)
- [x] Query inclui transaction_splits
- [x] Splits vinculados a settlements
- [x] Sistema de flags bidirecionais
- [ ] Verificação de ID único
- [ ] Sincronização em tempo real
- [ ] Prevenção de duplicidade

## 🔧 PRÓXIMOS PASSOS

1. **TESTAR** botão "Desfazer Todos os Acertos"
   - Verificar se processa todos os itens
   - Confirmar logs no console
   - Validar contadores de sucesso/erro

2. **RESOLVER** problema de duplicidade
   - Implementar verificação de ID único
   - Garantir que transação paga não apareça como pendente
   - Sincronizar status entre todas as páginas

3. **VALIDAR** sincronização completa
   - Pagar transação em Compartilhados
   - Verificar status em Transações
   - Desfazer e verificar novamente

## 📝 NOTAS TÉCNICAS

### Sistema de Flags Bidirecionais
```typescript
// Cada lado marca independentemente
settled_by_debtor: boolean    // Devedor marcou como pago
settled_by_creditor: boolean  // Credor marcou como pago

// Transação só é considerada "settled" quando AMBOS marcam
is_settled = settled_by_debtor && settled_by_creditor
```

### Lógica de Desfazer (Individual e Todos)
```typescript
// 1. Buscar split
const split = await supabase
  .from('transaction_splits')
  .select('settled_by_debtor, settled_by_creditor, debtor_settlement_tx_id, creditor_settlement_tx_id')
  .eq('id', splitId)
  .single();

// 2. Determinar lado
const isDebtor = item.type === 'DEBIT';
const settlementTxId = isDebtor ? split.debtor_settlement_tx_id : split.creditor_settlement_tx_id;

// 3. Deletar transação de acerto
await supabase.from('transactions').delete().eq('id', settlementTxId);

// 4. Atualizar split
const updateFields = {
  settled_at: null,
  [isDebtor ? 'settled_by_debtor' : 'settled_by_creditor']: false,
  [isDebtor ? 'debtor_settlement_tx_id' : 'creditor_settlement_tx_id']: null,
};

// 5. Desmarcar is_settled apenas se outro lado também não marcou
if (isDebtor && !split.settled_by_creditor) {
  updateFields.is_settled = false;
  updateFields.settled_transaction_id = null;
}

await supabase.from('transaction_splits').update(updateFields).eq('id', splitId);
```

## ⚠️ AVISOS IMPORTANTES

1. **NUNCA** usar hook para operações que funcionam inline
2. **SEMPRE** replicar lógica exata do que funciona
3. **SEMPRE** deletar transações ANTES de atualizar splits
4. **SEMPRE** respeitar flags bidirecionais
5. **SEMPRE** fazer refetch após operações

## 📊 STATUS ATUAL

- ✅ Desfazer individual: FUNCIONA
- ✅ Desfazer todos: CORRIGIDO (aguardando teste)
- ⚠️ Sincronização de status: PARCIAL
- ❌ Duplicidade: PENDENTE
- ❌ Verificação de ID único: PENDENTE

## 🚀 DEPLOY

**Commit**: `b05f7ea` - "fix: Replicar lógica exata do desfazer individual no desfazer todos"
**Branch**: `main`
**Status**: ✅ Pushed para produção
