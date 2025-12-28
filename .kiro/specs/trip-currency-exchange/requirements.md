# Requirements Document

## Introduction

Este documento especifica os requisitos para o sistema de controle de câmbio em viagens. A funcionalidade permite que usuários registrem compras de moeda estrangeira, calculem a média ponderada do câmbio, incluam o CET (Custo Efetivo Total) e visualizem o custo real das despesas em sua moeda local.

## Glossary

- **Trip_Currency_System**: Sistema responsável pelo gerenciamento de câmbio em viagens
- **Exchange_Purchase**: Registro de uma compra de moeda estrangeira
- **CET**: Custo Efetivo Total - inclui taxa de câmbio + IOF + spread bancário
- **Weighted_Average_Rate**: Taxa média ponderada calculada com base em todas as compras de câmbio
- **Trip_Owner**: Usuário que criou a viagem
- **Foreign_Currency**: Moeda estrangeira da viagem (USD, EUR, etc.)
- **Local_Currency**: Moeda local do usuário (BRL)

## Requirements

### Requirement 1: Exibir Criador da Viagem

**User Story:** Como participante de uma viagem, quero ver quem criou a viagem, para saber quem é o organizador principal.

#### Acceptance Criteria

1. WHEN a trip detail page is displayed, THE Trip_Currency_System SHALL show the Trip_Owner name in the header
2. THE Trip_Currency_System SHALL display the Trip_Owner with a visual indicator (icon or badge)

### Requirement 2: Exibir Moeda da Viagem

**User Story:** Como usuário, quero ver a moeda da viagem de forma clara, para entender em qual moeda os gastos estão sendo registrados.

#### Acceptance Criteria

1. WHEN a trip detail page is displayed, THE Trip_Currency_System SHALL show the Foreign_Currency code and symbol prominently
2. THE Trip_Currency_System SHALL display the currency next to the trip name or in the summary section
3. WHEN displaying amounts, THE Trip_Currency_System SHALL use the correct currency symbol for the trip's Foreign_Currency

### Requirement 3: Aba de Controle de Câmbio

**User Story:** Como viajante, quero uma aba dedicada para controle de câmbio, para gerenciar minhas compras de moeda estrangeira.

#### Acceptance Criteria

1. THE Trip_Currency_System SHALL provide a "Câmbio" tab in the trip detail view
2. WHEN the Câmbio tab is selected, THE Trip_Currency_System SHALL display a list of all Exchange_Purchases
3. WHEN no Exchange_Purchases exist, THE Trip_Currency_System SHALL display an empty state with instructions

### Requirement 4: Registrar Compra de Câmbio

**User Story:** Como viajante, quero registrar cada compra de moeda estrangeira, para ter controle do meu câmbio.

#### Acceptance Criteria

1. WHEN a user clicks "Adicionar Câmbio", THE Trip_Currency_System SHALL display a form to register an Exchange_Purchase
2. THE Trip_Currency_System SHALL require the following fields: amount in Foreign_Currency, exchange rate, CET percentage, date, and optional description
3. WHEN an Exchange_Purchase is submitted, THE Trip_Currency_System SHALL calculate and store the total cost in Local_Currency
4. THE Trip_Currency_System SHALL validate that exchange rate and CET are positive numbers
5. IF any required field is missing, THEN THE Trip_Currency_System SHALL display an error message

### Requirement 5: Calcular Custo Efetivo Total (CET)

**User Story:** Como viajante, quero incluir o CET nas minhas compras de câmbio, para saber o custo real da moeda.

#### Acceptance Criteria

1. WHEN registering an Exchange_Purchase, THE Trip_Currency_System SHALL accept a CET percentage
2. THE Trip_Currency_System SHALL calculate the effective rate as: exchange_rate * (1 + CET/100)
3. THE Trip_Currency_System SHALL display both the nominal rate and the effective rate with CET
4. WHEN displaying the Exchange_Purchase, THE Trip_Currency_System SHALL show the total cost in Local_Currency including CET

### Requirement 6: Calcular Média Ponderada do Câmbio

**User Story:** Como viajante, quero ver a média ponderada do câmbio, para saber qual foi meu custo médio de aquisição da moeda.

#### Acceptance Criteria

1. THE Trip_Currency_System SHALL calculate the Weighted_Average_Rate based on all Exchange_Purchases
2. THE Weighted_Average_Rate SHALL be calculated as: sum(amount * effective_rate) / sum(amount)
3. WHEN a new Exchange_Purchase is added, THE Trip_Currency_System SHALL recalculate the Weighted_Average_Rate
4. THE Trip_Currency_System SHALL display the Weighted_Average_Rate prominently in the Câmbio tab
5. WHEN no Exchange_Purchases exist, THE Trip_Currency_System SHALL display "Sem compras de câmbio" instead of a rate

### Requirement 7: Resumo de Câmbio

**User Story:** Como viajante, quero ver um resumo do meu câmbio, para entender rapidamente minha situação financeira na viagem.

#### Acceptance Criteria

1. THE Trip_Currency_System SHALL display a summary showing: total Foreign_Currency purchased, total Local_Currency spent, and Weighted_Average_Rate
2. THE Trip_Currency_System SHALL display how much Foreign_Currency remains (purchased - spent in trip)
3. WHEN displaying trip expenses, THE Trip_Currency_System SHALL show the equivalent in Local_Currency using the Weighted_Average_Rate

### Requirement 8: Histórico de Compras de Câmbio

**User Story:** Como viajante, quero ver o histórico de todas as minhas compras de câmbio, para acompanhar a evolução do meu custo.

#### Acceptance Criteria

1. THE Trip_Currency_System SHALL display Exchange_Purchases in chronological order (most recent first)
2. FOR EACH Exchange_Purchase, THE Trip_Currency_System SHALL display: date, amount, nominal rate, CET, effective rate, and total cost
3. THE Trip_Currency_System SHALL allow editing an Exchange_Purchase
4. THE Trip_Currency_System SHALL allow deleting an Exchange_Purchase with confirmation
5. WHEN an Exchange_Purchase is edited or deleted, THE Trip_Currency_System SHALL recalculate the Weighted_Average_Rate

### Requirement 9: Persistência de Dados de Câmbio

**User Story:** Como usuário, quero que meus dados de câmbio sejam salvos, para não perder as informações.

#### Acceptance Criteria

1. WHEN an Exchange_Purchase is created, THE Trip_Currency_System SHALL persist it to the database
2. THE Trip_Currency_System SHALL associate each Exchange_Purchase with the trip and the user who created it
3. WHEN the trip is loaded, THE Trip_Currency_System SHALL fetch all Exchange_Purchases for that trip
4. THE Trip_Currency_System SHALL only show Exchange_Purchases to trip participants
