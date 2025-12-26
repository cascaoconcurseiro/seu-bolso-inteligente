# 🔧 CORREÇÃO: Lógica de Transações Compartilhadas e Parceladas

## 📋 PROBLEMAS IDENTIFICADOS

### 1. Parcelamento em Transações Compartilhadas de Viagem
**Problema**: Quando crio uma transação compartilhada parcelada vinculada a viagem, ela não cria as parcelas corretamente.

**Exemplo do Problema**:
- Valor: R$ 100,00
- Parcelas: 2x de R$ 50,00
- Compartilhado com: Usuário B (50%)
- Resultado Esperado: Usuário B deve pagar R$ 25,00 em cada mês
- Resultado Atual: Não parcela corretamente

### 2. Falta de Lógica de Partidas Dobradas
**Problema**: O projeto atual não implementa a lógica de ledger (partidas dobradas) do PE copy.

### 3. Cálculos Financeiros Inconsistentes
**Problema**: Os cálculos de divisão e parcelamento não seguem a mesma lógica do PE copy.

## 🎯 CORREÇÕES NECESSÁRIAS

### 1. Criar Serviço de Ledger
Implementar `src/services/ledger.ts` baseado no PE copy para garantir partidas dobradas.

### 2. Corrigir Lógica de Parcelamento Compartilhado
No `useTransactions.ts`, a lógica de criação de parcelas precisa:
- Criar uma parcela por mês
- Cada parcela deve ter seus próprios splits
- Os splits devem ser calculados sobre o valor da parcela, não do total

### 3. Implementar SharedTransactionManager
Criar serviço centralizado para gerenciar transações compartilhadas com cache e sincronização.

### 4. Corrigir Fluxo de Viagens
Garantir que transações de viagem com parcelamento e compartilhamento funcionem corretamente.

## 📝 LÓGICA CORRETA (PE COPY)

### Exemplo: R$ 100 parcelado em 2x, compartilhado 50/50

```typescript
// CORRETO (PE copy):
Parcela 1: R$ 50,00
  - Eu pago: R$ 50,00
  - Usuário B deve: R$ 25,00 (50% de R$ 50)
  
Parcela 2: R$ 50,00
  - Eu pago: R$ 50,00
  - Usuário B deve: R$ 25,00 (50% de R$ 50)

Total:
  - Eu paguei: R$ 100,00
  - Usuário B deve: R$ 50,00
```

### Estrutura de Dados

```typescript
// Parcela 1
{
  id: "uuid-1",
  amount: 50,
  description: "Viagem Orlando (1/2)",
  date: "2024-12-25",
  is_installment: true,
  current_installment: 1,
  total_installments: 2,
  series_id: "serie-xyz",
  is_shared: true,
  trip_id: "trip-id",
  domain: "TRAVEL",
  transaction_splits: [
    {
      member_id: "user-b-id",
      percentage: 50,
      amount: 25.00  // 50% de R$ 50
    }
  ]
}

// Parcela 2
{
  id: "uuid-2",
  amount: 50,
  description: "Viagem Orlando (2/2)",
  date: "2025-01-25",  // +1 mês
  is_installment: true,
  current_installment: 2,
  total_installments: 2,
  series_id: "serie-xyz",
  is_shared: true,
  trip_id: "trip-id",
  domain: "TRAVEL",
  transaction_splits: [
    {
      member_id: "user-b-id",
      percentage: 50,
      amount: 25.00  // 50% de R$ 50
    }
  ]
}
```

## 🔄 PLANO DE IMPLEMENTAÇÃO

1. ✅ Criar `src/services/ledger.ts`
2. ✅ Criar `src/services/SafeFinancialCalculator.ts`
3. ✅ Corrigir `src/hooks/useTransactions.ts` - lógica de parcelamento
4. ⏳ Testar transações compartilhadas parceladas em viagens
5. ⏳ Validar cálculos financeiros

## 🎯 CORREÇÕES APLICADAS

### 1. Serviço de Ledger (Partidas Dobradas)
✅ Criado `src/services/ledger.ts` com:
- `generateLedger()`: Gera lançamentos contábeis
- `getTrialBalance()`: Calcula balancete de verificação
- Validação de contas órfãs
- Suporte a EXPENSE, INCOME e TRANSFER

### 2. Calculadora Financeira Segura
✅ Criado `src/services/SafeFinancialCalculator.ts` com:
- Cálculos sem erros de ponto flutuante
- `calculateInstallment()`: Calcula valor de parcela
- `percentage()`: Calcula porcentagem com precisão
- `distributeSplits()`: Distribui valores mantendo total exato
- `validateSplits()`: Valida que splits não excedem total

### 3. Correção de Parcelamento Compartilhado
✅ Atualizado `src/hooks/useTransactions.ts`:
- Usa `SafeFinancialCalculator` para calcular parcelas
- Cada parcela tem seus próprios splits
- Splits calculados sobre valor DA PARCELA (não do total)
- Campo `is_settled` adicionado aos splits
- Campo `payer_id` preservado corretamente
- Domain correto (TRAVEL para viagens, SHARED para compartilhado)

### 4. Exemplo Corrigido

**Antes (ERRADO)**:
```typescript
// R$ 100 em 2x compartilhado 50/50
Parcela 1: R$ 50
  Split: R$ 50 (100% do total) ❌ ERRADO

Parcela 2: R$ 50
  Split: R$ 50 (100% do total) ❌ ERRADO
```

**Depois (CORRETO)**:
```typescript
// R$ 100 em 2x compartilhado 50/50
Parcela 1: R$ 50
  Split: R$ 25 (50% da parcela) ✅ CORRETO

Parcela 2: R$ 50
  Split: R$ 25 (50% da parcela) ✅ CORRETO

Total devido: R$ 50 (R$ 25 + R$ 25) ✅
```

---
**Data**: 26/12/2024
**Status**: Correções Aplicadas - Aguardando Testes
