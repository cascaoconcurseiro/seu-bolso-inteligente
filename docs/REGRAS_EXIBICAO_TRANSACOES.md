# REGRAS DE EXIBIÇÃO DE TRANSAÇÕES POR CONTEXTO

## CONTEXTOS DO SISTEMA

O sistema possui 3 contextos diferentes onde transações são exibidas, cada um com suas próprias regras de filtragem por data:

---

## 1. PÁGINA "TRANSAÇÕES" (Extrato Pessoal)

**Objetivo**: Mostrar o histórico real de movimentações financeiras

**Regra de Data**: `transaction.date` (data real da transação)

**Comportamento**:
- Transação feita em 04/01 → aparece em JANEIRO
- Transação feita em 15/02 → aparece em FEVEREIRO
- Não importa o tipo de pagamento (cartão, dinheiro, débito)
- Não importa se é compartilhada ou não

**Implementação**: `useTransactions` hook
- Filtro: `WHERE date >= startDate AND date <= endDate`

---

## 2. PÁGINA "CARTÕES DE CRÉDITO" (Faturas)

**Objetivo**: Agrupar compras por ciclo de fechamento da fatura

**Regra de Data**: `transaction.competence_date` (mês de fechamento da fatura)

**Comportamento**:
- Compra em 04/01 com cartão que fecha dia 27/01 → aparece na fatura de JANEIRO
- Compra em 28/01 com cartão que fecha dia 27/01 → aparece na fatura de FEVEREIRO
- Agrupa todas as compras do mesmo ciclo

**Cálculo do competence_date**:
```
Se dia_transacao <= dia_fechamento:
  competence_date = mês_atual
Senão:
  competence_date = próximo_mês
```

**Implementação**: Função `calculate_credit_card_competence_date()` no banco
- Filtro: `WHERE competence_date = mes_selecionado`

---

## 3. PÁGINA "COMPARTILHADOS" (Despesas Divididas)

**Objetivo**: Mostrar quando o dinheiro será efetivamente cobrado/pago

**Regras de Data**: Depende do tipo de pagamento

### 3A. CARTÃO DE CRÉDITO (Compartilhado)

**Regra**: Mostrar no mês de VENCIMENTO da fatura do CRIADOR da transação

**Comportamento**:
- Wesley compra em 04/01 com cartão que vence 05/02 → aparece em FEVEREIRO para Wesley E Fran
- Fran compra em 04/01 com cartão que vence 02/02 → aparece em FEVEREIRO para Fran E Wesley
- **IMPORTANTE**: Ambos os usuários veem a transação no MESMO mês (mês de vencimento)

**Cálculo da data de vencimento**:
```
1. Determinar em qual fatura a transação entra:
   Se dia_transacao <= dia_fechamento:
     fatura = mês_atual
   Senão:
     fatura = próximo_mês

2. Calcular mês de vencimento:
   Se dia_vencimento <= dia_fechamento:
     vencimento = fatura + 1 mês
   Senão:
     vencimento = fatura (mesmo mês)
```

**Exemplo**:
- Cartão: fecha dia 27, vence dia 5
- Transação: 04/01
- Fatura: Janeiro (04 <= 27)
- Vencimento: Fevereiro (5 <= 27, então +1 mês)
- **Aparece em FEVEREIRO no Compartilhados**

### 3B. DINHEIRO/DÉBITO (Compartilhado)

**Regra**: Mostrar no mês SEGUINTE ao da transação

**Comportamento**:
- Compra em 04/01 com dinheiro → aparece em FEVEREIRO no compartilhados
- Compra em 15/01 com débito → aparece em FEVEREIRO no compartilhados
- Compra em 28/02 com dinheiro → aparece em MARÇO no compartilhados

**Cálculo**:
```
display_date = transaction.date + 1 mês
```

**Implementação**: Função `calculateSharedDisplayDate()` no frontend
- Para cartão: calcular mês de vencimento usando `calculateDueDate()`
- Para dinheiro/débito: adicionar 1 mês à data da transação
- Filtro: `WHERE display_date = mes_selecionado`

---

## RESUMO DAS FUNÇÕES

| Contexto | Hook/Função | Campo de Data | Lógica |
|----------|-------------|---------------|--------|
| Transações | `useTransactions` | `date` | Data real |
| Cartões | `useCreditCards` | `competence_date` | Mês de fechamento |
| Compartilhados | `useSharedFinances` | `display_date` (calculado) | Vencimento (cartão) ou +1 mês (dinheiro) |

---

## IMPORTANTE

- **NÃO misturar as lógicas**: Cada contexto tem sua própria função de cálculo
- **NÃO reutilizar filtros**: Cada hook deve ter seu próprio filtro específico
- **Transações compartilhadas de cartão**: AMBOS os usuários devem ver no MESMO mês (vencimento)
- **Consistência**: O criador e o devedor sempre veem a transação no mesmo mês no Compartilhados
