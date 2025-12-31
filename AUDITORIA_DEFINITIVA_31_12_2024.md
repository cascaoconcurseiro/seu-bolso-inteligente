# 🔍 AUDITORIA DEFINITIVA - SISTEMA DE COMPARTILHAMENTO
**Data**: 31/12/2024 11:00 BRT  
**Status**: 🔴 PROBLEMA IDENTIFICADO - SOLUÇÃO EM ANDAMENTO

---

## 📊 ESTADO ATUAL DO BANCO DE DADOS

### ✅ Transação Original (Wesley)
```
ID: 8b752657-60cd-4654-8783-a6fc2d84d52f
User: Wesley (56ccd60b-641f-4265-bc17-7b8705a2f8c9)
Valor: R$ 100,00
Descrição: "teste compartilhado"
is_shared: TRUE
domain: SHARED
date: 2025-12-31
competence_date: 2025-12-01
```

### ✅ Split (Fran)
```
ID: 46db4140-5bda-429d-887f-0412198be2cf
Transaction: 8b752657-60cd-4654-8783-a6fc2d84d52f
Member: Fran (5c4a4fb5-ccc9-440f-912e-9e81731aa7ab)
User: Fran (9545d0c1-94be-4b69-b110-f939bce072ee)
Valor: R$ 50,00 (50%)
is_settled: FALSE
```

### ✅ Mirror (Fran)
```
ID: 280625c1-a3b1-40d8-9c1e-87b39b8115b7
User: Fran (9545d0c1-94be-4b69-b110-f939bce072ee)
Valor: R$ 50,00
source_transaction_id: 8b752657-60cd-4654-8783-a6fc2d84d52f
is_mirror: TRUE
date: 2025-12-31
competence_date: 2025-12-01
```

### ✅ Ledger (4 entradas corretas)
```
1. DEBIT Wesley R$ 100,00 (Pagamento original)
2. CREDIT Wesley R$ 50,00 (A receber de Fran)
3. DEBIT Fran R$ 50,00 (Dívida com Wesley - split)
4. DEBIT Fran R$ 50,00 (Pagamento do mirror)
```

### ✅ Membros da Família
```
Wesley:
  ID: 7ba0b663-7ecc-41e9-a840-4cb729f0dac1
  linked_user_id: 56ccd60b-641f-4265-bc17-7b8705a2f8c9
  sharing_scope: all

Fran:
  ID: 5c4a4fb5-ccc9-440f-912e-9e81731aa7ab
  linked_user_id: 9545d0c1-94be-4b69-b110-f939bce072ee
  sharing_scope: all
```

---

## 🐛 PROBLEMA IDENTIFICADO

### Sintoma
Transação compartilhada criada mas **NÃO APARECE** na página "Compartilhados" para nenhum dos usuários.

### Logs do Console
```javascript
// Query retorna a transação MAS com splits vazios:
{
  id: "8b752657-60cd-4654-8783-a6fc2d84d52f",
  description: "teste compartilhado",
  splits: 0,  // ❌ ZERO!
  splitsData: []  // ❌ VAZIO!
}

// useMemo recebe:
{
  transactionsWithSplits: 1,  // ✅ Tem transação
  members: 0,  // ❌ ZERO MEMBROS!
  transactionsCount: 0  // ❌ ZERO!
}

// getFilteredInvoice retorna:
{
  allItemsCount: 0,  // ❌ ZERO!
  filteredCount: 0  // ❌ ZERO!
}
```

### Causa Raiz Descoberta

**PROBLEMA 1**: Hook `useFamilyMembers()` retorna array vazio!

```typescript
// Em useSharedFinances.ts
const { data: members = [] } = useFamilyMembers();

// members está VAZIO, então:
// 1. invoiceMap não é inicializado para nenhum membro
// 2. Splits não são processados (não há membros para mapear)
// 3. getFilteredInvoice retorna vazio
```

**PROBLEMA 2**: Query de splits separada pode não estar funcionando

```typescript
// Mudamos de:
.select(`*, transaction_splits!transaction_splits_transaction_id_fkey (...)`)

// Para:
const { data: splits } = await supabase
  .from('transaction_splits')
  .in('transaction_id', transactionIds);

// Mas isso pode estar falhando silenciosamente
```

---

## 🔍 ANÁLISE DO FLUXO

### Fluxo Esperado
```
1. useSharedFinances busca transações compartilhadas
   ✅ Retorna 1 transação

2. useSharedFinances busca splits dessas transações
   ❌ Retorna vazio (ou não está sendo processado)

3. useFamilyMembers busca membros da família
   ❌ Retorna vazio!

4. useMemo processa transações e cria invoiceMap
   ❌ Não processa porque members está vazio

5. getFilteredInvoice retorna itens para cada membro
   ❌ Retorna vazio porque invoiceMap está vazio

6. SharedExpenses renderiza cards de membros
   ❌ Não renderiza nada porque não há itens
```

### Fluxo Real (Quebrado)
```
1. ✅ Query busca transações
2. ❌ Splits não são retornados
3. ❌ Members está vazio
4. ❌ invoiceMap não é criado
5. ❌ Nada aparece na tela
```

---

## 🎯 PLANO DE CORREÇÃO DEFINITIVO

### FASE 1: Verificar useFamilyMembers ⚠️ CRÍTICO
**Objetivo**: Descobrir por que members está vazio

**Ações**:
1. Ler código de `useFamily.ts`
2. Verificar query de family_members
3. Verificar políticas RLS de family_members
4. Adicionar logs em useFamilyMembers

### FASE 2: Corrigir Query de Splits ⚠️ CRÍTICO
**Objetivo**: Garantir que splits sejam retornados

**Ações**:
1. Adicionar logs detalhados na query de splits
2. Verificar se `.in()` está funcionando
3. Testar query manualmente no Supabase
4. Considerar voltar para relacionamento automático se RLS permitir

### FASE 3: Adicionar Logs Completos 🔍 ALTA
**Objetivo**: Rastrear exatamente onde o fluxo quebra

**Ações**:
1. Log em useFamilyMembers (quantos membros retornou)
2. Log na query de transações (quantas retornou)
3. Log na query de splits (quantos retornou)
4. Log no useMemo (members, transactions, splits)
5. Log no processamento de cada transação
6. Log no getFilteredInvoice

### FASE 4: Teste Completo ✅ MÉDIA
**Objetivo**: Validar correção

**Ações**:
1. Recarregar página
2. Verificar logs do console
3. Confirmar que transação aparece
4. Testar acerto de contas
5. Criar nova transação compartilhada
6. Verificar se nova transação aparece

---

## 📝 HIPÓTESES

### Hipótese 1: useFamilyMembers está quebrado ⭐ MAIS PROVÁVEL
**Evidência**:
- Logs mostram `members: 0`
- Banco tem 2 membros (Wesley e Fran)
- Query SQL manual retorna membros

**Possíveis causas**:
- Política RLS bloqueando acesso
- Query incorreta (WHERE clause errada)
- Hook não está sendo chamado corretamente
- Cache do React Query desatualizado

### Hipótese 2: Query de splits está falhando
**Evidência**:
- Logs mostram `splitsData: []`
- Banco tem 1 split
- Query SQL manual retorna split

**Possíveis causas**:
- `.in()` não está funcionando
- Política RLS bloqueando acesso
- transactionIds está vazio
- Erro silencioso não capturado

### Hipótese 3: useMemo não está processando
**Evidência**:
- Logs mostram `transactionsCount: 0`
- transactionsWithSplits tem 1 item

**Possíveis causas**:
- members vazio causa early return
- Lógica de processamento tem bug
- Dependências do useMemo incorretas

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

1. **LER** `src/hooks/useFamily.ts` para entender useFamilyMembers
2. **VERIFICAR** políticas RLS de family_members
3. **ADICIONAR** logs em useFamilyMembers
4. **ADICIONAR** logs detalhados na query de splits
5. **TESTAR** e validar correção

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] useFamilyMembers retorna membros corretos
- [ ] Query de transações retorna transações
- [ ] Query de splits retorna splits
- [ ] useMemo processa transações e cria invoiceMap
- [ ] getFilteredInvoice retorna itens
- [ ] SharedExpenses renderiza cards de membros
- [ ] Transação aparece na tela
- [ ] Valores estão corretos
- [ ] Acerto de contas funciona

---

## 🎯 CONCLUSÃO PRELIMINAR

**PROBLEMA PRINCIPAL**: `useFamilyMembers()` retorna array vazio, impedindo todo o fluxo de funcionar.

**IMPACTO**: Sistema completamente quebrado - nenhuma transação compartilhada aparece.

**PRIORIDADE**: 🔴 CRÍTICA - Resolver IMEDIATAMENTE

**TEMPO ESTIMADO**: 30-60 minutos para diagnóstico e correção completa
