# Implementation Plan: Trip Currency Exchange

## Overview

Este plano implementa o sistema de controle de câmbio em viagens, permitindo registrar compras de moeda estrangeira, calcular média ponderada com CET, e exibir o criador e moeda da viagem.

## Tasks

- [ ] 1. Criar tabela e políticas RLS no banco de dados
  - Criar tabela `trip_exchange_purchases` com todos os campos
  - Criar índices para trip_id e user_id
  - Criar políticas RLS para SELECT, INSERT, UPDATE, DELETE
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 2. Implementar funções de cálculo de câmbio
  - [ ] 2.1 Criar arquivo `src/services/exchangeCalculations.ts`
    - Implementar `calculateEffectiveRate(exchangeRate, cetPercentage)`
    - Implementar `calculateLocalAmount(foreignAmount, effectiveRate)`
    - Implementar `calculateWeightedAverageRate(purchases)`
    - Implementar `calculateExchangeSummary(purchases)`
    - _Requirements: 4.3, 5.2, 6.2, 7.1_
  - [ ]* 2.2 Escrever testes de propriedade para cálculos
    - **Property 1: Effective Rate and Local Amount Calculation**
    - **Property 2: Weighted Average Rate Calculation**
    - **Validates: Requirements 4.3, 5.2, 6.2**

- [ ] 3. Criar tipos TypeScript
  - [ ] 3.1 Criar arquivo `src/types/tripExchange.ts`
    - Definir interface `ExchangePurchase`
    - Definir interface `ExchangePurchaseInput`
    - Definir interface `ExchangeSummary`
    - _Requirements: 4.2_

- [ ] 4. Implementar hooks de câmbio
  - [ ] 4.1 Criar arquivo `src/hooks/useTripExchange.ts`
    - Implementar `useTripExchangePurchases(tripId)`
    - Implementar `useCreateExchangePurchase()`
    - Implementar `useUpdateExchangePurchase()`
    - Implementar `useDeleteExchangePurchase()`
    - Implementar `useExchangeSummary(tripId)`
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 5. Implementar componente de resumo de câmbio
  - [ ] 5.1 Criar `src/components/trips/ExchangeSummaryCard.tsx`
    - Exibir total de moeda estrangeira comprada
    - Exibir total gasto em BRL
    - Exibir média ponderada do câmbio
    - Exibir quantidade de compras
    - _Requirements: 7.1, 6.4_

- [ ] 6. Implementar dialog de compra de câmbio
  - [ ] 6.1 Criar `src/components/trips/ExchangePurchaseDialog.tsx`
    - Campos: valor estrangeiro, taxa de câmbio, CET%, data, descrição
    - Validação de campos obrigatórios
    - Cálculo em tempo real da taxa efetiva e valor total
    - Suporte para criação e edição
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.1, 5.3_
  - [ ]* 6.2 Escrever testes de propriedade para validação
    - **Property 4: Input Validation - Positive Numbers**
    - **Validates: Requirements 4.4, 4.5**

- [ ] 7. Implementar componente principal de câmbio
  - [ ] 7.1 Criar `src/components/trips/TripExchange.tsx`
    - Exibir card de resumo
    - Exibir lista de compras de câmbio
    - Botão para adicionar nova compra
    - Estado vazio quando não há compras
    - _Requirements: 3.2, 3.3, 8.1, 8.2_
  - [ ]* 7.2 Escrever testes de propriedade para ordenação e exibição
    - **Property 7: Chronological Ordering**
    - **Property 8: Display Completeness**
    - **Validates: Requirements 8.1, 8.2**

- [ ] 8. Adicionar aba de Câmbio na página de viagem
  - [ ] 8.1 Atualizar `src/pages/Trips.tsx`
    - Adicionar tab "Câmbio" com ícone
    - Renderizar componente TripExchange na aba
    - _Requirements: 3.1_

- [ ] 9. Exibir criador e moeda da viagem
  - [ ] 9.1 Atualizar header da viagem em `src/pages/Trips.tsx`
    - Buscar nome do criador da viagem
    - Exibir nome do criador com ícone/badge
    - Exibir moeda da viagem (código e símbolo)
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 10. Implementar edição e exclusão de compras
  - [ ] 10.1 Adicionar funcionalidade de edição
    - Botão de editar em cada item da lista
    - Abrir dialog preenchido com dados existentes
    - _Requirements: 8.3_
  - [ ] 10.2 Adicionar funcionalidade de exclusão
    - Botão de excluir em cada item da lista
    - Confirmação antes de excluir
    - Recalcular média após exclusão
    - _Requirements: 8.4, 8.5_

- [ ] 11. Checkpoint - Verificar funcionamento completo
  - Testar criação de compra de câmbio
  - Testar edição e exclusão
  - Verificar cálculos de média ponderada
  - Verificar exibição do criador e moeda
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais (testes de propriedade)
- A tabela deve ser criada no Supabase antes de implementar os hooks
- Os cálculos de câmbio devem usar precisão decimal adequada
- A média ponderada deve ser recalculada automaticamente após qualquer alteração
