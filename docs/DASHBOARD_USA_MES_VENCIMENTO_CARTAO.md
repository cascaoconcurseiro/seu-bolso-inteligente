# Dashboard: Despesas de Cartão no Mês de Vencimento

## Problema

No Dashboard, despesas de cartão de crédito apareciam no **mês de fechamento** ao invés do **mês de vencimento**.

**Exemplo:**
- Compra: 04/01/2026
- Cartão fecha: 26/01/2026
- Vence: 05/02/2026
- **Antes**: Aparecia R$ 518,00 em Janeiro ❌
- **Depois**: Aparece R$ 0,00 em Janeiro, R$ 518,00 em Fevereiro ✓

## Solução

Modificamos a função `get_monthly_financial_summary()` para calcular o **mês de vencimento** dinamicamente para despesas de cartão.

### Lógica Implementada

Para cada despesa de cartão, calculamos:

```sql
-- Se due_day <= closing_day: vencimento = competence_date + 1 mês
-- Se due_day > closing_day: vencimento = competence_date (mesmo mês)

CASE 
  WHEN due_day <= closing_day THEN
    competence_date + 1 mês
  ELSE
    competence_date
END
```

### Exemplo Prático

**Cartão fecha dia 26, vence dia 5:**

| Compra     | competence_date | Cálculo                    | Mês no Dashboard |
|------------|-----------------|----------------------------|------------------|
| 04/01/2026 | 01/01/2026      | 5 <= 26 → Jan + 1 = Fev    | Fevereiro ✓      |
| 26/01/2026 | 01/01/2026      | 5 <= 26 → Jan + 1 = Fev    | Fevereiro ✓      |
| 27/01/2026 | 01/02/2026      | 5 <= 26 → Fev + 1 = Mar    | Março ✓          |

**Cartão fecha dia 5, vence dia 10:**

| Compra     | competence_date | Cálculo                    | Mês no Dashboard |
|------------|-----------------|----------------------------|------------------|
| 04/01/2026 | 01/01/2026      | 10 > 5 → Jan (mesmo mês)   | Janeiro ✓        |
| 06/01/2026 | 01/02/2026      | 10 > 5 → Fev (mesmo mês)   | Fevereiro ✓      |

## Impacto nas Páginas

### ✅ Dashboard
- **MODIFICADO**: Despesas de cartão aparecem no mês de vencimento
- Receitas e despesas não-cartão: sem mudança (usam competence_date)

### ✅ Página Transações
- **NÃO AFETADA**: Continua usando `date` (data real da compra)
- Compra de 04/01 aparece em Janeiro ✓

### ✅ Página Cartões
- **NÃO AFETADA**: Continua usando `competence_date` (mês de fechamento)
- Compra de 04/01 aparece na fatura de Janeiro (fecha 26/01) ✓

### ✅ Página Compartilhados
- **NÃO AFETADA**: Calcula vencimento no frontend (useSharedFinances.ts)
- Compra de 04/01 aparece em Fevereiro (vence 05/02) ✓

## Migração Aplicada

**Arquivo:** `20260105213000_dashboard_use_due_month_for_cards.sql`

**Ações:**
1. ✅ Modificou `get_monthly_financial_summary()` para calcular mês de vencimento
2. ✅ Aplicado em produção
3. ✅ Sincronizado localmente

## Verificação

Para testar, acesse o Dashboard em Janeiro e Fevereiro:

**Janeiro (JAN/26):**
- Saldo: R$ 0,00
- Entradas: R$ 0,00
- Saídas: R$ 0,00 (despesas de cartão foram para Fevereiro)

**Fevereiro (FEV/26):**
- Saldo: R$ 0,00
- Entradas: R$ 0,00
- Saídas: R$ 518,00 (despesas de cartão que vencem em Fevereiro)

## Status

✅ **CORRIGIDO E APLICADO EM PRODUÇÃO**

Data: 05/01/2026 21:30
