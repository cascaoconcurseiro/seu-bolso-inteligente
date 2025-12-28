# Requirements Document

## Introduction

Este documento especifica os requisitos para o sistema de contas e cartões internacionais, permitindo que usuários gerenciem finanças em múltiplas moedas. Transações em moeda estrangeira são vinculadas a contas/cartões internacionais e aparecem apenas em contextos específicos (extrato da conta, viagem, compartilhado da viagem).

## Glossary

- **International_Account_System**: Sistema responsável pelo gerenciamento de contas e cartões internacionais
- **International_Account**: Conta bancária em moeda estrangeira (ex: Nomad, Wise)
- **International_Card**: Cartão de crédito/débito internacional
- **Foreign_Transaction**: Transação realizada em moeda estrangeira
- **Local_Currency**: Moeda local do usuário (BRL)
- **Foreign_Currency**: Moeda estrangeira (USD, EUR, etc.)
- **Trip_Currency**: Moeda definida para uma viagem específica

## Requirements

### Requirement 1: Criar Conta Internacional

**User Story:** Como usuário, quero criar contas bancárias internacionais, para gerenciar meu dinheiro em moeda estrangeira.

#### Acceptance Criteria

1. WHEN creating an account, THE International_Account_System SHALL provide an option to mark it as international
2. WHEN an account is marked as international, THE International_Account_System SHALL require a currency selection (USD, EUR, etc.)
3. THE International_Account_System SHALL display international accounts with a distinct visual indicator
4. THE International_Account_System SHALL store the currency code with the International_Account

### Requirement 2: Criar Cartão Internacional

**User Story:** Como usuário, quero criar cartões internacionais, para registrar gastos em moeda estrangeira.

#### Acceptance Criteria

1. WHEN creating a card, THE International_Account_System SHALL provide an option to mark it as international
2. WHEN a card is marked as international, THE International_Account_System SHALL require a currency selection
3. THE International_Account_System SHALL display international cards with a distinct visual indicator
4. THE International_Account_System SHALL allow linking international cards to international accounts

### Requirement 3: Transações em Moeda Estrangeira

**User Story:** Como usuário, quero criar transações em moeda estrangeira, para registrar gastos durante viagens internacionais.

#### Acceptance Criteria

1. WHEN creating a transaction linked to a trip with Foreign_Currency, THE International_Account_System SHALL display the amount field in the Trip_Currency
2. WHEN a Foreign_Transaction is created, THE International_Account_System SHALL require an International_Account or International_Card
3. THE International_Account_System SHALL NOT allow Foreign_Transactions without a linked International_Account or International_Card
4. THE International_Account_System SHALL store the currency code with each Foreign_Transaction

### Requirement 4: Filtrar Transações por Moeda

**User Story:** Como usuário, quero que transações em moeda estrangeira não apareçam na página principal de transações, para evitar confusão com valores.

#### Acceptance Criteria

1. THE International_Account_System SHALL filter out Foreign_Transactions from the main transactions page
2. WHEN viewing the main transactions page, THE International_Account_System SHALL only display transactions in Local_Currency
3. THE International_Account_System SHALL display Foreign_Transactions in the following contexts:
   - International_Account statement
   - International_Card statement
   - Trip expenses (when trip has Foreign_Currency)
   - Shared expenses of a trip

### Requirement 5: Extrato de Conta/Cartão Internacional

**User Story:** Como usuário, quero ver o extrato das minhas contas e cartões internacionais, para acompanhar meus gastos em moeda estrangeira.

#### Acceptance Criteria

1. WHEN viewing an International_Account, THE International_Account_System SHALL display all transactions in that account's currency
2. WHEN viewing an International_Card, THE International_Account_System SHALL display all transactions in that card's currency
3. THE International_Account_System SHALL calculate and display the balance in the account's/card's currency
4. THE International_Account_System SHALL display amounts with the correct currency symbol

### Requirement 6: Viagem em Moeda Estrangeira

**User Story:** Como usuário, quero que viagens em moeda estrangeira exibam todos os valores nessa moeda, para facilitar o controle de gastos.

#### Acceptance Criteria

1. WHEN a trip has a Foreign_Currency, THE International_Account_System SHALL display all trip amounts in that currency
2. WHEN adding a transaction to a trip with Foreign_Currency, THE International_Account_System SHALL default the currency to the Trip_Currency
3. THE International_Account_System SHALL only allow International_Accounts or International_Cards for trips with Foreign_Currency
4. THE International_Account_System SHALL display the currency symbol consistently throughout the trip view

### Requirement 7: Seleção de Conta/Cartão por Moeda

**User Story:** Como usuário, quero que apenas contas/cartões compatíveis apareçam ao criar transações, para evitar erros.

#### Acceptance Criteria

1. WHEN creating a transaction in Local_Currency, THE International_Account_System SHALL only show local accounts and cards
2. WHEN creating a transaction in Foreign_Currency, THE International_Account_System SHALL only show international accounts and cards matching that currency
3. IF no compatible account/card exists, THEN THE International_Account_System SHALL display a message prompting the user to create one
