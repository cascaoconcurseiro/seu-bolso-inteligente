# ⚡ AÇÕES IMEDIATAS - Auditoria 20/04/2026

## 🔴 CRÍTICO - Fazer AGORA (Hoje)

### 1. Habilitar Minificação no Build
**Tempo**: 5 minutos  
**Arquivo**: `vite.config.ts`

```typescript
build: {
  minify: 'terser',  // ✅ Mudar de false para 'terser'
  sourcemap: false,  // ✅ Desabilitar em produção
}
```

**Impacto**: Reduz bundle de 2.5MB para ~500KB

---

### 2. Corrigir Vulnerabilidades de Dependências
**Tempo**: 10 minutos

```bash
cd seu-bolso-inteligente
npm audit
npm audit fix
npm audit fix --force  # se necessário
```

---

### 3. Criar Sistema de Logger
**Tempo**: 15 minutos  
**Arquivo**: `src/utils/logger.ts` (criar novo)

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = import.meta.env.DEV;

  debug(message: string, data?: any) {
    if (this.isDev) {
      console.log(`🔍 [DEBUG] ${message}`, data || '');
    }
  }

  info(message: string, data?: any) {
    if (this.isDev) {
      console.info(`ℹ️ [INFO] ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    console.warn(`⚠️ [WARN] ${message}`, data || '');
    // TODO: Enviar para Sentry em produção
  }

  error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error || '');
    // TODO: Enviar para Sentry em produção
  }
}

export const logger = new Logger();
```

**Uso**:
```typescript
// ❌ Antes
console.log('Criando transação:', data);

// ✅ Depois
import { logger } from '@/utils/logger';
logger.debug('Criando transação', data);
```

---

## 🟡 IMPORTANTE - Fazer Esta Semana

### 4. Substituir console.logs por logger
**Tempo**: 2-3 horas  
**Prioridade**: Alta

**Arquivos prioritários**:
1. `src/services/notificationGenerator.ts` (10+ logs)
2. `src/services/auditLog.ts` (8+ logs)
3. `src/services/notificationService.ts` (12+ logs)
4. `src/services/SharedTransactionManager.ts` (5+ logs)

**Script de busca**:
```bash
# Encontrar todos os console.logs
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
```

---

### 5. Adicionar Índices no Banco de Dados
**Tempo**: 30 minutos  
**Arquivo**: Criar nova migration

```sql
-- supabase/migrations/20260420000001_add_performance_indexes.sql

-- Índice para queries de transações por usuário e data
CREATE INDEX IF NOT EXISTS idx_transactions_user_competence 
ON transactions(user_id, competence_date DESC);

-- Índice para splits por usuário e status
CREATE INDEX IF NOT EXISTS idx_splits_user_settled 
ON transaction_splits(user_id, is_settled);

-- Índice para busca por descrição
CREATE INDEX IF NOT EXISTS idx_transactions_description 
ON transactions USING gin(to_tsvector('portuguese', description));

-- Índices para RLS (melhorar performance)
CREATE INDEX IF NOT EXISTS idx_family_members_active 
ON family_members(user_id, family_id) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trip_members_user_trip 
ON trip_members(user_id, trip_id);

-- Índice para notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = FALSE;
```

**Aplicar**:
```bash
# Aplicar migration no Supabase
supabase db push
```

---

### 6. Habilitar TypeScript Strict (Gradualmente)
**Tempo**: Começar com 1 hora, continuar ao longo da semana  
**Arquivo**: `tsconfig.json`

**Fase 1 - Habilitar uma opção por vez**:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,        // ✅ Começar com esta
    "noUnusedParameters": false,   // ⏳ Próxima
    "noImplicitAny": false,        // ⏳ Depois
    "strictNullChecks": false      // ⏳ Por último
  }
}
```

**Processo**:
1. Habilitar `noUnusedLocals`
2. Corrigir erros que aparecerem
3. Commit
4. Repetir para próxima opção

---

## 🟠 DESEJÁVEL - Fazer Este Mês

### 7. Implementar Testes Unitários
**Tempo**: 4-6 horas  
**Prioridade**: Alta

**Começar com**:
```typescript
// __tests__/SafeFinancialCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { SafeFinancialCalculator } from '@/services/SafeFinancialCalculator';

describe('SafeFinancialCalculator', () => {
  describe('add', () => {
    it('should handle floating point correctly', () => {
      expect(SafeFinancialCalculator.add(0.1, 0.2)).toBe(0.3);
    });
  });

  describe('distributeSplits', () => {
    it('should maintain total when distributing', () => {
      const result = SafeFinancialCalculator.distributeSplits(100, [
        { percentage: 50 },
        { percentage: 50 }
      ]);
      const total = result.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(100);
    });
  });
});
```

**Setup**:
```bash
npm install -D vitest @vitest/ui
```

**package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 8. Integrar Sentry para Monitoramento
**Tempo**: 1 hora  
**Prioridade**: Alta

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

**.env**:
```bash
VITE_SENTRY_DSN=https://...@sentry.io/...
```

---

### 9. Implementar Paginação
**Tempo**: 2-3 horas  
**Arquivo**: `src/hooks/useTransactions.ts`

```typescript
export function useTransactions(page = 1, itemsPerPage = 50) {
  const { user } = useAuth();
  const { currentMonth } = useMonth();

  return useQuery({
    queryKey: ["transactions", user?.id, currentMonth, page],
    queryFn: async () => {
      const startDate = startOfMonth(parseISO(currentMonth));
      const endDate = endOfMonth(parseISO(currentMonth));

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await supabase
        .from("transactions")
        .select("*", { count: 'exact' })
        .eq("user_id", user!.id)
        .gte("competence_date", startDate.toISOString())
        .lte("competence_date", endDate.toISOString())
        .order("date", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        transactions: data,
        totalCount: count,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
        currentPage: page,
      };
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
```

---

### 10. Reduzir Uso de `any`
**Tempo**: 4-6 horas (gradual)  
**Prioridade**: Média

**Criar interfaces apropriadas**:
```typescript
// src/types/transaction.ts
export interface TransactionWithSplits extends Transaction {
  transaction_splits?: TransactionSplit[];
  account?: Account;
  category?: Category;
}

// Substituir
const transactions: any[] = [];
// Por
const transactions: TransactionWithSplits[] = [];
```

---

## 📊 CHECKLIST DE PROGRESSO

### Crítico (Esta Semana)
- [ ] Habilitar minificação no build
- [ ] Corrigir vulnerabilidades npm
- [ ] Criar sistema de logger
- [ ] Substituir console.logs principais
- [ ] Adicionar índices no banco

### Importante (Este Mês)
- [ ] Habilitar TypeScript strict (gradual)
- [ ] Implementar testes unitários básicos
- [ ] Integrar Sentry
- [ ] Implementar paginação
- [ ] Reduzir uso de `any` (começar)

### Desejável (Próximos 2 Meses)
- [ ] Refatorar componentes grandes
- [ ] Adicionar debounce em buscas
- [ ] Implementar rate limiting
- [ ] Melhorar documentação
- [ ] Adicionar JSDoc

---

## 🎯 MÉTRICAS DE SUCESSO

### Após Ações Críticas
- ✅ Bundle size < 600KB
- ✅ 0 vulnerabilidades npm
- ✅ 0 console.logs em produção
- ✅ Queries 30% mais rápidas

### Após Ações Importantes
- ✅ Cobertura de testes > 50%
- ✅ Monitoramento de erros ativo
- ✅ TypeScript strict habilitado
- ✅ Paginação implementada

---

## 📝 NOTAS

### Ordem de Prioridade
1. **Minificação** - Impacto imediato na performance
2. **Vulnerabilidades** - Segurança
3. **Logger** - Preparação para produção
4. **Índices** - Performance do banco
5. **TypeScript** - Qualidade do código

### Não Fazer Agora
- ❌ Refatoração grande de componentes
- ❌ Mudanças de arquitetura
- ❌ Novas features
- ❌ Otimizações prematuras

**Foco**: Corrigir problemas existentes, não adicionar complexidade.

---

**Criado**: 20/04/2026  
**Atualizado**: 20/04/2026  
**Responsável**: Time de Desenvolvimento
