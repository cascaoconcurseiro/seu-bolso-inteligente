# Design Técnico: Correção de Problemas Críticos do Seu Bolso Inteligente

## 1. VISÃO GERAL DA ARQUITETURA

Este documento descreve o design técnico para implementar os 20 requisitos de correção crítica do Seu Bolso Inteligente. Os problemas serão resolvidos em 4 fases, com foco em:

1. **Infraestrutura de Testes** - Garantir precisão financeira
2. **Qualidade de Código** - Remover console.log, adicionar type safety
3. **Integridade de Dados** - Validação antecipada, operações atômicas
4. **Confiabilidade** - Retry logic, cache invalidation, documentação

---

## 2. FASE 1: REQUISITOS CRÍTICOS (Semana 1)

### 2.1 Requisito 1: Infraestrutura de Testes Automatizados

**Objetivo:** Estabelecer Jest/Vitest com cobertura de 80% para módulos financeiros críticos.

**Arquitetura:**

```
tests/
├── unit/
│   ├── SafeFinancialCalculator.test.ts
│   ├── invoiceUtils.test.ts
│   └── settlementValidation.test.ts
├── integration/
│   ├── useTransactions.test.ts
│   ├── useSettlement.test.ts
│   └── useSharedFinances.test.ts
└── fixtures/
    ├── mockTransactions.ts
    ├── mockSplits.ts
    └── mockAccounts.ts
```

**Implementação:**

1. **Setup Jest/Vitest**
   - Instalar: `npm install --save-dev vitest @vitest/ui fast-check`
   - Configurar vitest.config.ts
   - Setup coverage reporter

2. **SafeFinancialCalculator Tests**
   ```typescript
   // Property-based tests com fast-check
   describe('SafeFinancialCalculator', () => {
     it('add(a, b) - b === a (round-trip)', () => {
       fc.assert(
         fc.property(fc.integer(), fc.integer(), (a, b) => {
           const result = SafeFinancialCalculator.add(a, b);
           expect(SafeFinancialCalculator.subtract(result, b)).toBe(a);
         })
       );
     });
     
     it('safeSum(splits) <= total + 1 cent', () => {
       fc.assert(
         fc.property(fc.array(fc.integer(0, 10000)), (amounts) => {
           const total = 10000;
           const sum = SafeFinancialCalculator.safeSum(amounts);
           expect(sum).toBeLessThanOrEqual(total + 1);
         })
       );
     });
   });
   ```

3. **Split Calculation Tests**
   - Testar soma de splits = total ± 1 centavo
   - Testar auto-completar splits (< 100%)
   - Testar edge cases (zero, valores grandes)

4. **Settlement State Tests**
   - Testar transições de estado válidas
   - Testar idempotência (liquidar 2x = erro)
   - Testar rollback em falha

**Cobertura Esperada:**
- SafeFinancialCalculator: 100%
- Split logic: 85%
- Settlement: 80%

---

### 2.2 Requisito 2: Remover Logs de Console

**Objetivo:** Centralizar logging e remover console.log de produção.

**Arquitetura:**

```typescript
// src/utils/logger.ts
export const logger = {
  debug: (message: string, context?: any) => {
    if (isDev) console.log(`[DEBUG] ${message}`, context);
  },
  error: (message: string, error?: Error) => {
    if (isDev) console.error(`[ERROR] ${message}`, error);
    // Em produção: enviar para Sentry
  },
  warn: (message: string, context?: any) => {
    if (isDev) console.warn(`[WARN] ${message}`, context);
  },
  info: (message: string, context?: any) => {
    if (isDev) console.info(`[INFO] ${message}`, context);
  }
};
```

**Implementação:**

1. Criar/melhorar src/utils/logger.ts
2. Remover console.log de 7 arquivos:
   - useTransactions.ts (9 ocorrências)
   - useSharedFinances.ts (múltiplas)
   - useSettlement.ts (1)
   - auditLog.ts (4)
   - useCategories.ts (1)
   - useAnticipateInstallments.ts (6)
   - useAccountStatement.ts (2)

3. Substituir por logger.debug() ou logger.error()

**Verificação:**
```bash
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
# Deve retornar 0 resultados
```

---

### 2.3 Requisito 3: Corrigir Problemas de Fuso Horário

**Objetivo:** Usar date-fns com UTC para todas as operações de data.

**Arquitetura:**

```typescript
// src/lib/dateUtils.ts
import { parseISO, format, addMonths } from 'date-fns';

export const dateUtils = {
  // Parse ISO string (YYYY-MM-DD)
  parseDate: (dateString: string): Date => {
    return parseISO(dateString);
  },
  
  // Format to YYYY-MM-DD
  formatDate: (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  },
  
  // Get competence_date (YYYY-MM-01)
  getCompetenceDate: (date: Date): string => {
    return format(date, 'yyyy-MM-01');
  },
  
  // Add months (for installments)
  addMonthsToDate: (date: Date, months: number): Date => {
    return addMonths(date, months);
  }
};
```

**Implementação:**

1. Criar src/lib/dateUtils.ts
2. Atualizar useTransactions.ts (linhas 380-430)
   - Remover `new Date(year, month-1, day)`
   - Usar `dateUtils.parseDate()` e `dateUtils.addMonthsToDate()`

3. Atualizar invoiceUtils.ts (linhas 20-50)
   - Usar `dateUtils.parseDate()` para parsing
   - Usar `dateUtils.formatDate()` para formatação

4. Atualizar useSharedFinances.ts (linhas 80-120)
   - Usar `dateUtils.getCompetenceDate()` para agrupamento

**Verificação:**
```bash
grep -r "new Date(" src/ --include="*.ts" --include="*.tsx" | grep -v "new Date()" | grep -v "// "
# Deve retornar 0 resultados em lógica de data
```

---

### 2.4 Requisito 4: Validar Payer_ID Antes de Criar Splits

**Objetivo:** Validar payer_id ANTES de qualquer operação de banco de dados.

**Arquitetura:**

```typescript
// src/hooks/useTransactions.ts
const validatePayerId = async (payerId: string | null | undefined) => {
  if (!payerId) return true; // Campo opcional
  
  const { data: member, error } = await supabase
    .from('family_members')
    .select('id')
    .eq('id', payerId)
    .single();
  
  if (error || !member) {
    throw new Error('O pagador selecionado é inválido ou não foi encontrado.');
  }
  
  return true;
};

// Em useCreateTransaction mutation
const handleCreateTransaction = async (data: TransactionInput) => {
  // Validar payer_id ANTES de criar splits
  if (data.isShared && data.payerId) {
    await validatePayerId(data.payerId);
  }
  
  // Agora criar transaction e splits
  // ...
};
```

**Implementação:**

1. Criar função validatePayerId() em useTransactions.ts
2. Chamar ANTES de criar transaction
3. Se falhar, lançar erro e não prosseguir

---

### 2.5 Requisito 5: Implementar Operações de Liquidação Atômicas

**Objetivo:** Usar RPC functions para garantir atomicidade.

**Arquitetura:**

```sql
-- Database RPC function
CREATE OR REPLACE FUNCTION settle_split(
  p_split_id UUID,
  p_account_id UUID,
  p_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  BEGIN
    -- 1. Marcar split como liquidado
    UPDATE transaction_splits
    SET is_settled = true,
        settled_at = NOW(),
        settled_by_creditor = true
    WHERE id = p_split_id;
    
    -- 2. Criar transação de INCOME
    INSERT INTO transactions (
      user_id, account_id, amount, type, description,
      date, competence_date, domain
    ) VALUES (
      auth.uid(), p_account_id, p_amount, 'INCOME',
      'Ressarcimento de despesa compartilhada',
      NOW()::DATE, DATE_TRUNC('month', NOW())::DATE,
      'PERSONAL'
    );
    
    -- 3. Trigger automático recalcula saldo
    
    v_result := json_build_object('success', true);
    RETURN v_result;
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    v_result := json_build_object('success', false, 'error', SQLERRM);
    RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Implementação Frontend:**

```typescript
// src/hooks/useSettlement.ts
const useSettleWithPayment = useMutation(
  async (data: SettleData) => {
    const { data: result, error } = await supabase
      .rpc('settle_split', {
        p_split_id: data.splitId,
        p_account_id: data.accountId,
        p_amount: data.amount
      });
    
    if (error) throw error;
    return result;
  },
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['sharedFinances']);
    }
  }
);
```

---

## 3. FASE 2: REQUISITOS ALTOS (Semana 2)

### 3.1 Requisito 6: Segurança de Tipo

**Objetivo:** Remover todos os tipos `any` de arquivos críticos.

**Implementação:**

1. Criar interfaces explícitas em types/database.ts
2. Remover `any` de:
   - useSharedExpensesActions.ts
   - useAccounts.ts
   - notificationGenerator.ts

---

### 3.2 Requisito 7: RPC com Retry Logic

**Objetivo:** Implementar wrapper com retry automático.

```typescript
// src/utils/rpcWithRetry.ts
export const rpcWithRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`RPC attempt ${attempt + 1} failed, retrying in ${delay}ms`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error('RPC failed after all retries', lastError);
  throw lastError;
};
```

---

### 3.3 Requisito 8: Categorização Automática

**Objetivo:** Habilitar e testar categorização automática.

**Implementação:**

1. Identificar por que foi desabilitada
2. Corrigir a causa raiz
3. Adicionar testes
4. Habilitar com fallback (não bloqueia transação)

---

### 3.4 Requisito 9: Validação de Entrada com Zod

**Objetivo:** Usar Zod para validação robusta.

```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const TransactionSchema = z.object({
  amount: z.number().positive('Valor deve ser maior que zero'),
  description: z.string().min(1, 'Descrição é obrigatória').trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  accountId: z.string().uuid('Conta inválida'),
  categoryId: z.string().uuid().optional(),
  payerId: z.string().uuid().optional()
});

export type Transaction = z.infer<typeof TransactionSchema>;
```

---

### 3.5 Requisito 10: Testes de Finanças Compartilhadas

**Objetivo:** Adicionar testes abrangentes para splits e settlement.

---

### 3.6 Requisito 11: Validar Member_ID

**Objetivo:** Validar member_id ANTES de criar splits (similar a Req 4).

---

## 4. FASE 3: REQUISITOS MÉDIOS (Semana 3)

### 4.1 Requisito 12: Limite de Transações

**Objetivo:** Avisar quando atinge 1000 transações.

```typescript
const TRANSACTION_FETCH_LIMIT = 1000;

if (transactions.length >= TRANSACTION_FETCH_LIMIT) {
  showWarning('Limite de 1000 transações atingido. Use filtros de data para visualizar períodos menores.');
}
```

---

### 4.2 Requisito 13: Otimização N+1

**Objetivo:** Usar RPC consolidado em vez de múltiplas queries.

```typescript
// Antes (N+1):
const transactions = await fetchTransactions();
for (const tx of transactions) {
  const account = await fetchAccount(tx.accountId);
  const category = await fetchCategory(tx.categoryId);
}

// Depois (RPC consolidado):
const data = await supabase.rpc('get_transactions_with_details', {
  user_id: currentUser.id
});
```

---

### 4.3 Requisito 14: Invalidação de Cache

**Objetivo:** Centralizar invalidação de cache.

```typescript
// src/utils/queryInvalidation.ts
export const invalidateTransactionQueries = () => {
  queryClient.invalidateQueries(['transactions']);
  queryClient.invalidateQueries(['accountStatement']);
};

export const invalidateFinancialQueries = () => {
  queryClient.invalidateQueries(['financialSummary']);
  queryClient.invalidateQueries(['accounts']);
};

export const invalidateSharedQueries = () => {
  queryClient.invalidateQueries(['sharedFinances']);
  queryClient.invalidateQueries(['invoices']);
};
```

---

### 4.4 Requisito 15: Documentação

**Objetivo:** Adicionar comentários e documentação de fluxos.

---

### 4.5 Requisito 16: TODOs

**Objetivo:** Identificar e completar TODOs.

---

## 5. FASE 4: REQUISITOS BAIXOS (Semana 4)

### 5.1 Requisito 17: Limpeza de Código

**Objetivo:** Remover código morto e imports não utilizados.

---

### 5.2 Requisito 18: Testes E2E

**Objetivo:** Adicionar testes end-to-end com Playwright/Cypress.

---

### 5.3 Requisito 19: Testes RLS

**Objetivo:** Testar políticas de Row-Level Security.

---

### 5.4 Requisito 20: Remover Código Morto

**Objetivo:** Identificar e remover código não utilizado.

---

## 6. DEPENDÊNCIAS ENTRE REQUISITOS

```
Req 1 (Testes) ← Req 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
Req 2 (Logger) ← Req 7 (RPC com retry)
Req 3 (Datas) ← Req 4, 5 (Validação, Settlement)
Req 4 (Payer) ← Req 5 (Settlement)
Req 5 (Atomic) ← Req 7 (RPC com retry)
Req 6 (Types) ← Req 9 (Validação com Zod)
Req 7 (Retry) ← Req 5 (Settlement)
Req 9 (Validation) ← Req 4, 11 (Payer, Member)
Req 14 (Cache) ← Req 5, 8 (Settlement, Categorização)
```

---

## 7. ORDEM RECOMENDADA DE IMPLEMENTAÇÃO

**Semana 1 (Crítica):**
1. Req 2: Remover console.log (rápido, sem dependências)
2. Req 3: Corrigir fusos horários (base para Req 4, 5)
3. Req 4: Validar payer_id (base para Req 5)
4. Req 5: Settlement atômico (usa Req 3, 4)
5. Req 1: Testes (testa Req 2, 3, 4, 5)

**Semana 2 (Alta):**
6. Req 7: RPC com retry (base para Req 5, 8)
7. Req 6: Type safety (melhora qualidade geral)
8. Req 9: Validação com Zod (usa Req 4, 11)
9. Req 11: Validar member_id (similar a Req 4)
10. Req 8: Categorização automática
11. Req 10: Testes de finanças compartilhadas

**Semana 3 (Média):**
12. Req 14: Invalidação de cache (usa Req 5, 8)
13. Req 13: Otimização N+1
14. Req 12: Limite de transações
15. Req 15: Documentação
16. Req 16: TODOs

**Semana 4 (Baixa):**
17. Req 17: Limpeza de código
18. Req 18: Testes E2E
19. Req 19: Testes RLS
20. Req 20: Remover código morto

---

## 8. PADRÕES DE DESIGN

### 8.1 Logger Centralizado
- Usar src/utils/logger.ts
- Apenas output em modo dev
- Integrar com Sentry em produção

### 8.2 Date Utilities
- Usar date-fns com UTC
- Centralizar em src/lib/dateUtils.ts
- Nunca usar new Date() para aritmética

### 8.3 Validação
- Usar Zod para schemas
- Validar ANTES de operações de BD
- Mensagens de erro descritivas

### 8.4 RPC com Retry
- Usar wrapper rpcWithRetry()
- Backoff exponencial
- Logging de erros

### 8.5 Operações Atômicas
- Usar RPC functions no Supabase
- BEGIN/COMMIT/ROLLBACK
- Sem operações parciais

### 8.6 Cache Invalidation
- Centralizar em queryInvalidation.ts
- Invalidar após QUALQUER mutação
- Usar queryClient.invalidateQueries()

---

## 9. MÉTRICAS DE SUCESSO

- ✅ 0 console.log em produção
- ✅ 80% cobertura de testes para módulos críticos
- ✅ 0 tipos `any` em arquivos críticos
- ✅ Todas as datas usando date-fns
- ✅ Todas as validações usando Zod
- ✅ Todas as operações de settlement atômicas
- ✅ RPC calls com retry automático
- ✅ Cache invalidation consistente
- ✅ Documentação completa de fluxos complexos

---

## 10. RISCOS E MITIGAÇÃO

| Risco | Mitigação |
|-------|-----------|
| Quebrar funcionalidade existente | Testes abrangentes antes de deploy |
| Performance degradada | Medir N+1 queries, usar RPC consolidado |
| Timezone issues em produção | Testar com múltiplos fusos horários |
| Settlement parcial | Usar RPC com transações |
| Cache stale | Invalidar agressivamente |

---

## CONCLUSÃO

Este design técnico fornece um roadmap claro para implementar os 20 requisitos de correção crítica. A abordagem faseada permite entregar valor incrementalmente enquanto mantém a qualidade e a estabilidade do sistema.

**Próximos passos:**
1. Criar arquivo tasks.md com tarefas específicas
2. Iniciar Fase 1 (Requisitos Críticos)
3. Executar testes após cada requisito
4. Revisar e ajustar conforme necessário
