# 🔍 ANÁLISE COMPLETA: Projeção e Economia - ERROS E SOLUÇÃO

## 📊 SITUAÇÃO ATUAL (EXEMPLO DO USUÁRIO)

**Dados:**
- Saldo Atual: R$ 1.000,00
- Entradas: R$ 1.000,00
- Saídas: R$ 0,00

**Resultado Mostrado:**
- Economizou: R$ 1.000,00 ✅ (CORRETO)
- Projeção fim do mês: R$ 2.000,00 ❌ (ERRADO!)

## ⚠️ O QUE ESTÁ FALTANDO NA PROJEÇÃO

A projeção atual NÃO considera:
1. ❌ Faturas de cartão de crédito (despesas futuras)
2. ❌ Despesas compartilhadas pendentes
3. ❌ Parcelas futuras do mês
4. ❌ Transações recorrentes futuras
5. ❌ Apenas duplica o saldo atual

---

## 🎯 COMO A PROJEÇÃO DEVERIA FUNCIONAR

### Fórmula Correta:
```
PROJEÇÃO = SALDO_ATUAL 
         + RECEITAS_FUTURAS_DO_MÊS
         - DESPESAS_FUTURAS_DO_MÊS
         - FATURAS_CARTÃO_PENDENTES
         - COMPARTILHADOS_A_PAGAR
```

### Detalhamento:

#### 1. SALDO ATUAL (já implementado)
```sql
-- Soma de todas as contas ativas (exceto cartões e internacionais)
SELECT COALESCE(SUM(balance), 0)
FROM accounts
WHERE user_id = p_user_id
  AND is_active = true
  AND type != 'CREDIT_CARD'
  AND (is_international = false OR is_international IS NULL);
```

#### 2. RECEITAS FUTURAS DO MÊS (falta implementar)
```sql
-- Transações de INCOME com competence_date futura no mês
SELECT COALESCE(SUM(amount), 0)
FROM transactions
WHERE user_id = p_user_id
  AND type = 'INCOME'
  AND competence_date > CURRENT_DATE
  AND competence_date <= p_end_date
  AND (currency = 'BRL' OR currency IS NULL)
  AND source_transaction_id IS NULL;
```

#### 3. DESPESAS FUTURAS DO MÊS (falta implementar)
```sql
-- Transações de EXPENSE com competence_date futura no mês
SELECT COALESCE(SUM(amount), 0)
FROM transactions
WHERE user_id = p_user_id
  AND type = 'EXPENSE'
  AND competence_date > CURRENT_DATE
  AND competence_date <= p_end_date
  AND (currency = 'BRL' OR currency IS NULL)
  AND source_transaction_id IS NULL;
```

#### 4. FATURAS DE CARTÃO PENDENTES (falta implementar)
```sql
-- Saldo negativo dos cartões (fatura a pagar)
SELECT COALESCE(SUM(ABS(balance)), 0)
FROM accounts
WHERE user_id = p_user_id
  AND type = 'CREDIT_CARD'
  AND is_active = true
  AND balance < 0;
```

#### 5. COMPARTILHADOS A PAGAR (falta implementar)
```sql
-- Saldo negativo com membros da família (você deve para eles)
SELECT COALESCE(SUM(ABS(net_balance)), 0)
FROM (
  SELECT (calculate_member_balance(p_user_id, fm.id)).net_balance
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE (f.owner_id = p_user_id OR fm.user_id = p_user_id)
    AND (calculate_member_balance(p_user_id, fm.id)).net_balance < 0
) AS debts;
```

---

## 🐛 PROBLEMA 1: PROJEÇÃO FIM DO MÊS (ATUAL)

### Como está calculando (ERRADO):
```typescript
// Dashboard.tsx - Linhas 95-97
const income = summary?.income || 0;        // R$ 1.000,00
const expenses = summary?.expenses || 0;    // R$ 0,00
const savings = income - expenses;          // R$ 1.000,00
const projectedBalance = balance + savings; // R$ 1.000 + R$ 1.000 = R$ 2.000 ❌
```

### Por que está errado:
A projeção está **SOMANDO DUAS VEZES** o mesmo dinheiro:
1. O `balance` (R$ 1.000) já inclui as entradas do mês
2. O `savings` (R$ 1.000) é calculado das mesmas entradas
3. Resultado: **duplicação do valor**

### Como deveria ser:
A projeção deveria considerar:
- **Saldo atual** (que já inclui tudo que aconteceu até hoje)
- **Mais**: receitas futuras esperadas até o fim do mês
- **Menos**: despesas futuras esperadas até o fim do mês
- **Menos**: faturas de cartão pendentes
- **Menos**: compartilhados a pagar

---

## 🐛 PROBLEMA 2: "ECONOMIZOU" - CONCEITO ERRADO

## ✅ SOLUÇÃO COMPLETA: NOVA FUNÇÃO SQL

### Criar função `get_monthly_projection`:

```sql
-- NOVA FUNÇÃO: Projeção completa do fim do mês
CREATE OR REPLACE FUNCTION public.get_monthly_projection(
  p_user_id UUID,
  p_end_date DATE
)
RETURNS TABLE (
  current_balance NUMERIC,
  future_income NUMERIC,
  future_expenses NUMERIC,
  credit_card_invoices NUMERIC,
  shared_debts NUMERIC,
  projected_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_current_balance NUMERIC := 0;
  v_future_income NUMERIC := 0;
  v_future_expenses NUMERIC := 0;
  v_credit_invoices NUMERIC := 0;
  v_shared_debts NUMERIC := 0;
  v_projected NUMERIC := 0;
BEGIN
  -- 1. SALDO ATUAL (contas ativas, exceto cartões e internacionais)
  SELECT COALESCE(SUM(balance), 0) INTO v_current_balance
  FROM public.accounts
  WHERE user_id = p_user_id
    AND is_active = true
    AND type != 'CREDIT_CARD'
    AND (is_international = false OR is_international IS NULL);

  -- 2. RECEITAS FUTURAS DO MÊS (competence_date futura)
  SELECT COALESCE(SUM(amount), 0) INTO v_future_income
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'INCOME'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- 3. DESPESAS FUTURAS DO MÊS (competence_date futura)
  SELECT COALESCE(SUM(amount), 0) INTO v_future_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'EXPENSE'
    AND competence_date > CURRENT_DATE
    AND competence_date <= p_end_date
    AND (currency = 'BRL' OR currency IS NULL)
    AND source_transaction_id IS NULL;

  -- 4. FATURAS DE CARTÃO PENDENTES (saldo negativo = dívida)
  SELECT COALESCE(SUM(ABS(balance)), 0) INTO v_credit_invoices
  FROM public.accounts
  WHERE user_id = p_user_id
    AND type = 'CREDIT_CARD'
    AND is_active = true
    AND balance < 0;

  -- 5. COMPARTILHADOS A PAGAR (saldo negativo com membros)
  SELECT COALESCE(SUM(ABS(net_balance)), 0) INTO v_shared_debts
  FROM (
    SELECT (public.calculate_member_balance(p_user_id, fm.id)).net_balance
    FROM public.family_members fm
    JOIN public.families f ON f.id = fm.family_id
    WHERE (f.owner_id = p_user_id OR fm.user_id = p_user_id OR fm.linked_user_id = p_user_id)
  ) AS balances
  WHERE net_balance < 0;

  -- CÁLCULO FINAL DA PROJEÇÃO
  v_projected := v_current_balance 
               + v_future_income 
               - v_future_expenses 
               - v_credit_invoices 
               - v_shared_debts;

  RETURN QUERY SELECT 
    v_current_balance,
    v_future_income,
    v_future_expenses,
    v_credit_invoices,
    v_shared_debts,
    v_projected;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_projection IS 
'Calcula projeção completa do saldo no fim do mês considerando: saldo atual, receitas/despesas futuras, faturas de cartão e compartilhados a pagar';
```

---

## 🔧 IMPLEMENTAÇÃO NO FRONTEND

### 1. Criar hook `useMonthlyProjection`:

```typescript
// src/hooks/useMonthlyProjection.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useMonth } from "@/contexts/MonthContext";
import { format, endOfMonth } from "date-fns";

export interface MonthlyProjection {
  current_balance: number;
  future_income: number;
  future_expenses: number;
  credit_card_invoices: number;
  shared_debts: number;
  projected_balance: number;
}

export function useMonthlyProjection() {
  const { user } = useAuth();
  const { currentDate } = useMonth();
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ["monthly-projection", user?.id, endDate],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_monthly_projection', {
        p_user_id: user.id,
        p_end_date: endDate,
      });

      if (error) {
        console.error('Erro ao buscar projeção mensal:', error);
        return null;
      }

      const projection = data?.[0];
      return {
        current_balance: Number(projection?.current_balance) || 0,
        future_income: Number(projection?.future_income) || 0,
        future_expenses: Number(projection?.future_expenses) || 0,
        credit_card_invoices: Number(projection?.credit_card_invoices) || 0,
        shared_debts: Number(projection?.shared_debts) || 0,
        projected_balance: Number(projection?.projected_balance) || 0,
      } as MonthlyProjection;
    },
    enabled: !!user,
    staleTime: 30000,
  });
}
```

### 2. Atualizar Dashboard:

```typescript
// src/pages/Dashboard.tsx
import { useMonthlyProjection } from "@/hooks/useMonthlyProjection";

export function Dashboard() {
  // ... código existente ...
  
  const { data: projection, isLoading: projectionLoading } = useMonthlyProjection();
  
  // ... código existente ...
  
  const projectedBalance = projection?.projected_balance || balance;
  
  // ... resto do código ...
  
  {/* Projeção do Mês - ATUALIZADO */}
  <div className="p-4 rounded-xl bg-foreground text-background animate-scale-in-bounce hover-lift">
    <p className="text-xs opacity-70 mb-1">Projeção fim do mês</p>
    <p className="font-mono text-2xl font-bold animate-count-up">
      {formatCurrency(projectedBalance)}
    </p>
    
    {/* Detalhamento (opcional) */}
    {projection && (
      <div className="mt-3 pt-3 border-t border-background/20 space-y-1 text-xs opacity-80">
        {projection.future_income > 0 && (
          <div className="flex justify-between">
            <span>+ Receitas futuras</span>
            <span>{formatCurrency(projection.future_income)}</span>
          </div>
        )}
        {projection.future_expenses > 0 && (
          <div className="flex justify-between">
            <span>- Despesas futuras</span>
            <span>{formatCurrency(projection.future_expenses)}</span>
          </div>
        )}
        {projection.credit_card_invoices > 0 && (
          <div className="flex justify-between">
            <span>- Faturas cartão</span>
            <span>{formatCurrency(projection.credit_card_invoices)}</span>
          </div>
        )}
        {projection.shared_debts > 0 && (
          <div className="flex justify-between">
            <span>- Compartilhados</span>
            <span>{formatCurrency(projection.shared_debts)}</span>
          </div>
        )}
      </div>
    )}
  </div>
}
```

---

## 📊 EXEMPLO PRÁTICO

### Cenário:
- **Saldo atual:** R$ 1.000,00
- **Receitas futuras:** R$ 500,00 (salário dia 30)
- **Despesas futuras:** R$ 200,00 (conta de luz dia 29)
- **Fatura cartão:** R$ 800,00 (vence dia 10 do próximo mês)
- **Compartilhados:** R$ 150,00 (deve para João)

### Cálculo:
```
PROJEÇÃO = 1.000 + 500 - 200 - 800 - 150
PROJEÇÃO = R$ 350,00
```

### Interpretação:
"Se você pagar tudo que deve e receber tudo que espera, terminará o mês com R$ 350,00"

---


## 🎯 RECOMENDAÇÃO FINAL

### IMPLEMENTAÇÃO PRIORITÁRIA:

1. **URGENTE - Criar função SQL `get_monthly_projection`**
   - Considera TUDO que impacta o saldo do mês
   - Cartões, compartilhados, futuras receitas/despesas

2. **URGENTE - Criar hook `useMonthlyProjection`**
   - Busca dados da nova função
   - Retorna projeção completa

3. **URGENTE - Atualizar Dashboard**
   - Usar projeção real ao invés de duplicar saldo
   - Mostrar detalhamento opcional

4. **IMPORTANTE - Renomear "Economizou"**
   - Trocar para "Saldo do Mês" (mais claro)
   - Ou implementar comparação com média histórica

---

## 📝 RESUMO DOS BUGS E SOLUÇÕES

| Item | Bug Atual | Solução |
|------|-----------|---------|
| **Projeção** | Duplica saldo (R$ 1.000 vira R$ 2.000) | Nova função SQL que considera tudo do mês |
| **Projeção** | Não considera cartões | Incluir faturas pendentes |
| **Projeção** | Não considera compartilhados | Incluir dívidas com membros |
| **Projeção** | Não considera futuras | Incluir receitas/despesas futuras |
| **Economizou** | Conceito errado (apenas saldo) | Renomear para "Saldo do Mês" |

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Criar migration com função `get_monthly_projection`
2. ✅ Criar hook `useMonthlyProjection.ts`
3. ✅ Atualizar `Dashboard.tsx`
4. ✅ Testar com diferentes cenários
5. ⏭️ (Futuro) Adicionar gráfico de evolução da projeção

---

## 💡 MELHORIAS FUTURAS

### Projeção Inteligente:
- Considerar padrão de gastos dos últimos meses
- Alertar se projeção for negativa
- Sugerir onde economizar

### Detalhamento:
- Mostrar tooltip com breakdown completo
- Gráfico de composição da projeção
- Comparar projeção vs realizado mês anterior
