# Utilitários Criados para Redução de Duplicação
**Data:** 21/04/2026  
**Projeto:** Seu Bolso Inteligente

## 📦 ARQUIVOS CRIADOS

### 1. **queryInvalidation.ts** ✅
**Localização:** `src/utils/queryInvalidation.ts`  
**Propósito:** Centralizar invalidação de queries do React Query

**Funções principais:**
- `invalidateFinancialQueries()` - Invalida queries financeiras
- `invalidateSharedQueries()` - Invalida queries compartilhadas
- `invalidateTripQueries()` - Invalida queries de viagens
- `invalidateFamilyQueries()` - Invalida queries de família
- `invalidateAllFinancialData()` - Invalida TUDO (usar com cuidado)
- `invalidateTransactionQueries()` - Invalida queries de transações
- `invalidateAccountQueries()` - Invalida queries de contas
- `invalidateBudgetQueries()` - Invalida queries de orçamentos

**Redução esperada:** ~200 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
queryClient.invalidateQueries({ queryKey: ["transactions"] });
queryClient.invalidateQueries({ queryKey: ["accounts"] });
queryClient.invalidateQueries({ queryKey: ["financial-summary"] });

// DEPOIS
import { invalidateFinancialQueries } from '@/utils/queryInvalidation';
await invalidateFinancialQueries(queryClient);
```

---

### 2. **toastMessages.ts** ✅
**Localização:** `src/utils/toastMessages.ts`  
**Propósito:** Centralizar mensagens de toast para consistência

**Módulos principais:**
- `transactionToasts` - Mensagens de transações
- `accountToasts` - Mensagens de contas
- `budgetToasts` - Mensagens de orçamentos
- `categoryToasts` - Mensagens de categorias
- `familyToasts` - Mensagens de família
- `tripToasts` - Mensagens de viagens
- `settlementToasts` - Mensagens de acertos
- `goalToasts` - Mensagens de metas
- `alertToasts` - Mensagens de alertas

**Redução esperada:** ~150 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
toast.success("Transação criada com sucesso!");
toast.error("Erro ao criar transação: " + error.message);

// DEPOIS
import { transactionToasts } from '@/utils/toastMessages';
transactionToasts.created();
transactionToasts.error('criar', error);
```

---

### 3. **dateUtils.ts** ✅ (ATUALIZADO)
**Localização:** `src/utils/dateUtils.ts`  
**Propósito:** Centralizar cálculos de data

**Novas funções adicionadas:**
- `getMonthDateRange(date)` - Retorna startDate, endDate e monthKey
- `formatDateISO(date)` - Formata data como YYYY-MM-DD
- `getCurrentMonthRange()` - Range do mês atual

**Redução esperada:** ~80 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
import { startOfMonth, endOfMonth, format } from 'date-fns';
const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

// DEPOIS
import { getMonthDateRange } from '@/utils/dateUtils';
const { startDate, endDate, monthKey } = getMonthDateRange(currentDate);
```

---

### 4. **financialCalculations.ts** ✅
**Localização:** `src/utils/financialCalculations.ts`  
**Propósito:** Centralizar cálculos financeiros usando SafeFinancialCalculator

**Funções principais:**
- `calculateTotal(items)` - Soma total de valores
- `calculateTotalByType(items, type)` - Soma por tipo
- `calculateNetAmount(items)` - Calcula líquido (créditos - débitos)
- `calculateTotalIncome(transactions)` - Total de receitas
- `calculateTotalExpenses(transactions)` - Total de despesas
- `calculateSavings(transactions)` - Calcula economia
- `calculatePercentage(value, total)` - Calcula percentual
- `calculateBudgetUsage(spent, budget)` - Uso do orçamento
- `calculateRemainingBudget(budget, spent)` - Orçamento restante
- `groupByCurrency(items)` - Agrupa por moeda
- `calculateTotalsByCurrency(items)` - Totais por moeda
- `calculateAverage(items)` - Média
- `findMaxAmount(items)` - Valor máximo
- `findMinAmount(items)` - Valor mínimo

**Redução esperada:** ~60 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
const total = items.reduce((sum, item) => sum + item.amount, 0);

// DEPOIS
import { calculateTotal } from '@/utils/financialCalculations';
const total = calculateTotal(items);
```

---

### 5. **currencyFormatter.ts** ✅
**Localização:** `src/utils/currencyFormatter.ts`  
**Propósito:** Centralizar formatação de moeda

**Funções principais:**
- `formatCurrency(amount, currency)` - Formata como moeda
- `formatCurrencyCompact(amount, currency)` - Formato compacto (R$ 1,2 mil)
- `formatAmount(amount)` - Formata sem símbolo
- `formatAmountWithDecimals(amount, decimals)` - Com decimais customizados
- `formatPercentage(value, decimals)` - Formata percentual
- `getCurrencySymbol(currency)` - Retorna símbolo da moeda
- `formatCurrencyWithColor(amount, currency)` - Com classe de cor
- `formatCurrencyForInput(amount)` - Para inputs
- `parseCurrencyInput(value)` - Parse de input
- `formatMultipleCurrencies(amounts)` - Múltiplas moedas
- `formatCurrencyWithSign(amount, currency)` - Com sinal +/-

**Redução esperada:** ~50 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
amount.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// DEPOIS
import { formatCurrency } from '@/utils/currencyFormatter';
formatCurrency(amount, 'BRL');
```

---

### 6. **queryConfig.ts** ✅
**Localização:** `src/utils/queryConfig.ts`  
**Propósito:** Centralizar configurações do React Query

**Configurações:**
- `defaultQueryConfig` - Configuração padrão (staleTime: 0, refetchOnMount: always)
- `cachedQueryConfig` - Para dados que podem ser cacheados
- `realtimeQueryConfig` - Para dados em tempo real

**Helpers:**
- `createUserQueryConfig()` - Config com user_id
- `createDateQueryConfig()` - Config com range de datas
- `createFilteredQueryConfig()` - Config com filtros

**Redução esperada:** ~120 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
return useQuery({
  queryKey: ["something", user?.id],
  queryFn: async () => { /* ... */ },
  enabled: !!user,
  staleTime: 0,
  refetchOnMount: 'always',
});

// DEPOIS
import { createUserQueryConfig } from '@/utils/queryConfig';
return useQuery({
  ...createUserQueryConfig(['something'], user?.id),
  queryFn: async () => { /* ... */ },
});
```

---

### 7. **errorHandling.ts** ✅
**Localização:** `src/utils/errorHandling.ts`  
**Propósito:** Centralizar tratamento de erros

**Funções principais:**
- `handleQueryError(error, context)` - Trata erros de query
- `handleMutationError(error, action, entity)` - Trata erros de mutation
- `handleSupabaseError(error, context)` - Trata erros do Supabase
- `handleValidationError(message)` - Trata erros de validação
- `handleNetworkError(error)` - Trata erros de rede
- `safeErrorHandler(error, fallbackMessage)` - Handler seguro
- `withErrorHandling(fn, errorMessage)` - Wrapper para async
- `retryWithBackoff(fn, maxRetries, baseDelay)` - Retry com backoff
- `isNetworkError(error)` - Verifica se é erro de rede
- `isAuthError(error)` - Verifica se é erro de autenticação
- `isPermissionError(error)` - Verifica se é erro de permissão
- `formatErrorMessage(error)` - Formata mensagem de erro

**Redução esperada:** ~90 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
if (error) {
  console.error("Erro ao buscar dados:", error);
  throw error;
}

// DEPOIS
import { handleQueryError } from '@/utils/errorHandling';
if (error) handleQueryError(error, 'buscar dados');
```

---

### 8. **supabaseHelpers.ts** ✅
**Localização:** `src/utils/supabaseHelpers.ts`  
**Propósito:** Centralizar padrões de query do Supabase

**Funções principais:**
- `fetchUserData(table, userId, options)` - Busca dados do usuário
- `fetchById(table, id, select)` - Busca por ID
- `insertRecord(table, data)` - Insere registro
- `insertRecords(table, data)` - Insere múltiplos
- `updateRecord(table, id, data)` - Atualiza registro
- `deleteRecord(table, id)` - Deleta registro
- `softDeleteRecord(table, id)` - Soft delete
- `countRecords(table, filters)` - Conta registros
- `recordExists(table, filters)` - Verifica existência
- `fetchWithDateRange(table, userId, startDate, endDate, ...)` - Busca com range de datas
- `callRPC(functionName, params)` - Chama função RPC

**Redução esperada:** ~150 linhas duplicadas

**Exemplo de uso:**
```typescript
// ANTES
const { data, error } = await supabase
  .from("table")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
if (error) throw error;
return data;

// DEPOIS
import { fetchUserData } from '@/utils/supabaseHelpers';
return await fetchUserData('table', user.id, {
  orderBy: 'created_at',
  ascending: false
});
```

---

## 📊 RESUMO DE IMPACTO

| Utilitário | Linhas Reduzidas | Arquivos Afetados | Prioridade |
|------------|------------------|-------------------|------------|
| queryInvalidation.ts | ~200 | 30+ | CRÍTICA |
| toastMessages.ts | ~150 | 30+ | ALTA |
| dateUtils.ts | ~80 | 15+ | MÉDIA |
| financialCalculations.ts | ~60 | 20+ | MÉDIA |
| currencyFormatter.ts | ~50 | 30+ | MÉDIA |
| queryConfig.ts | ~120 | 30+ | MÉDIA |
| errorHandling.ts | ~90 | 30+ | BAIXA |
| supabaseHelpers.ts | ~150 | 25+ | BAIXA |
| **TOTAL** | **~900** | **65+** | - |

---

## 🚀 PRÓXIMOS PASSOS

### Fase 1: Validação (AGORA)
1. ✅ Criar todos os utilitários
2. ⏳ Testar imports em ambiente de desenvolvimento
3. ⏳ Validar que não há erros de TypeScript

### Fase 2: Refatoração Gradual
1. ⏳ Refatorar `useTransactions.ts` (maior impacto)
2. ⏳ Refatorar `useAccounts.ts`
3. ⏳ Refatorar `useBudgets.ts`
4. ⏳ Refatorar `useSharedFinances.ts`
5. ⏳ Refatorar `useCategories.ts`

### Fase 3: Refatoração Completa
1. ⏳ Refatorar hooks restantes (25+ arquivos)
2. ⏳ Refatorar componentes (20+ arquivos)
3. ⏳ Refatorar serviços (10+ arquivos)

### Fase 4: Documentação e Testes
1. ⏳ Documentar padrões de uso
2. ⏳ Criar testes unitários para utilitários
3. ⏳ Validar em produção

---

## 📝 NOTAS IMPORTANTES

### Compatibilidade
- ✅ Todos os utilitários são **retrocompatíveis**
- ✅ Não quebram código existente
- ✅ Podem ser adotados gradualmente

### Benefícios Imediatos
- ✅ Código mais limpo e legível
- ✅ Manutenção mais fácil
- ✅ Menos bugs por inconsistência
- ✅ Melhor testabilidade

### Cuidados
- ⚠️ Testar após cada refatoração
- ⚠️ Não alterar lógica de negócio
- ⚠️ Manter comportamento existente
- ⚠️ Revisar com equipe antes de produção

---

**Criado por:** Kiro AI  
**Data:** 21/04/2026  
**Status:** ✅ Utilitários criados, aguardando refatoração
