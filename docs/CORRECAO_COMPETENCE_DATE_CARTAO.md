# Correção: Cálculo de competence_date para Cartões de Crédito

## Problema

Transações de cartão de crédito estavam aparecendo no **mês errado** em todas as páginas:
- Transações feitas em Janeiro (dentro do ciclo que fecha 26/01 e vence 05/02) apareciam em **Fevereiro**
- Isso afetava: Página Transações, Página Cartões e Página Compartilhados

## Causa

O trigger `set_credit_card_competence_date()` estava **somando meses** à data da transação ao invés de usar o mês correto da fatura.

### Lógica ERRADA (antes):
```sql
IF v_transaction_day > v_closing_day THEN
  -- Transação depois do fechamento: transação + 2 meses ❌
  v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '2 months')::date;
ELSE
  -- Transação antes/no fechamento: transação + 1 mês ❌
  v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
END IF;
```

**Exemplo do erro:**
- Transação: 04/01/2026
- Cartão fecha: dia 26
- 04 <= 26 → competence_date = 04/01 + 1 mês = **01/02/2026** ❌ (ERRADO!)
- Deveria ser: **01/01/2026** (Janeiro, pois a fatura fecha em 26/01)

## Solução

### Lógica CORRETA (agora):
```sql
IF v_transaction_day > v_closing_day THEN
  -- Transação depois do fechamento: próximo mês ✓
  v_competence_date := (DATE_TRUNC('month', v_transaction_date) + INTERVAL '1 month')::date;
ELSE
  -- Transação antes/no fechamento: mesmo mês ✓
  v_competence_date := DATE_TRUNC('month', v_transaction_date)::date;
END IF;
```

**Exemplo correto:**
- Transação: 04/01/2026
- Cartão fecha: dia 26
- 04 <= 26 → competence_date = **01/01/2026** ✓ (Janeiro)

**Outro exemplo:**
- Transação: 27/01/2026
- Cartão fecha: dia 26
- 27 > 26 → competence_date = **01/02/2026** ✓ (Fevereiro, pois passou do fechamento)

## Regras de Negócio

### competence_date = Mês de FECHAMENTO da fatura

- **Transação ANTES/NO dia de fechamento** → competence_date = mês da transação
- **Transação DEPOIS do fechamento** → competence_date = próximo mês

### Exemplo prático (Cartão fecha dia 26, vence dia 5):

| Data Transação | Dia | Fechamento | competence_date | Fatura Fecha | Fatura Vence |
|----------------|-----|------------|-----------------|--------------|--------------|
| 04/01/2026     | 04  | 26         | 01/01/2026      | 26/01/2026   | 05/02/2026   |
| 26/01/2026     | 26  | 26         | 01/01/2026      | 26/01/2026   | 05/02/2026   |
| 27/01/2026     | 27  | 26         | 01/02/2026      | 26/02/2026   | 05/03/2026   |
| 15/02/2026     | 15  | 26         | 01/02/2026      | 26/02/2026   | 05/03/2026   |

## Impacto nas Páginas

### 1. Página Transações
- Filtra por `date` (data real da transação)
- **Não afetada** pelo competence_date
- Transação de 04/01 aparece em Janeiro ✓

### 2. Página Cartões
- Filtra por `competence_date` (mês de fechamento)
- **CORRIGIDA**: Transação de 04/01 agora aparece na fatura de Janeiro (fecha 26/01) ✓

### 3. Página Compartilhados
- Calcula mês de **VENCIMENTO** a partir do `competence_date`
- **CORRIGIDA**: Transação de 04/01 (competence_date = Janeiro) aparece em Fevereiro (vence 05/02) ✓

## Migração Aplicada

**Arquivo:** `20260105210000_fix_competence_date_calculation.sql`

**Ações:**
1. ✅ Corrigiu a função `set_credit_card_competence_date()`
2. ✅ Atualizou TODAS as transações existentes de cartão de crédito
3. ✅ Sincronizado com o banco de produção

## Verificação

Execute para confirmar:

```sql
-- Ver transações de cartão em Janeiro
SELECT 
  description,
  date,
  competence_date,
  EXTRACT(DAY FROM date) as dia_transacao,
  a.closing_day as dia_fechamento
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.type = 'CREDIT_CARD'
  AND t.date >= '2026-01-01'
  AND t.date < '2026-02-01'
ORDER BY t.date;
```

**Resultado esperado:**
- Transações até dia 26: competence_date = 2026-01-01
- Transações após dia 26: competence_date = 2026-02-01

## Status

✅ **CORRIGIDO E APLICADO EM PRODUÇÃO**

Data: 05/01/2026 21:00
