# Implementation Plan: International Accounts

## Overview

Este plano implementa o sistema de contas e cartões internacionais, permitindo transações em múltiplas moedas com filtros adequados.

## Tasks

- [x] 1. Adicionar campo currency na tabela transactions
  - Campo já adicionado via migration
  - _Requirements: 3.4_

- [x] 2. Atualizar formulário de conta para suportar internacional
  - [x] 2.1 Adicionar toggle "Conta Internacional" no AccountForm
  - [x] 2.2 Adicionar seleção de moeda quando internacional
  - Implementado em `src/pages/Accounts.tsx`
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 3. Filtrar contas por moeda no TransactionForm
  - [x] 3.1 Detectar moeda da viagem selecionada
  - [x] 3.2 Filtrar contas/cartões compatíveis com a moeda
  - [x] 3.3 Mostrar mensagem se não houver conta compatível
  - Implementado em `src/components/transactions/TransactionForm.tsx`
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Atualizar TransactionForm para moeda da viagem
  - [x] 4.1 Exibir símbolo da moeda da viagem no campo valor
  - [x] 4.2 Salvar currency na transação
  - Implementado em `src/components/transactions/TransactionForm.tsx`
  - _Requirements: 3.1, 3.4, 6.2_

- [x] 5. Filtrar transações em moeda estrangeira da página principal
  - Implementado no useTransactions com `.or("currency.is.null,currency.eq.BRL")`
  - _Requirements: 4.1, 4.2_

- [x] 6. Checkpoint - Verificar funcionamento ✅
  - ✅ Criação de conta internacional funciona
  - ✅ Transação em moeda estrangeira salva currency
  - ✅ Filtros na página principal excluem moeda estrangeira

## Notes

- Transações em moeda estrangeira só aparecem: na viagem, no extrato da conta/cartão internacional, ou no compartilhado da viagem
- A moeda da transação deve sempre corresponder à moeda da conta/cartão
- Bancos internacionais disponíveis: Nomad, Wise, C6 Global, Inter Global, Avenue, Remessa Online
