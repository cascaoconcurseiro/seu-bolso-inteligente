# Requirements Document: Trip Budget Privacy & Personal Ownership

## Introduction

Este documento especifica as correções necessárias para garantir que orçamentos em viagens sejam **estritamente pessoais e privados**. O sistema atual viola princípios fundamentais de privacidade ao expor orçamentos de outros usuários e criar confusão sobre ownership.

## Glossary

- **Trip**: Contexto compartilhado onde múltiplos usuários podem colaborar
- **Personal_Budget**: Orçamento individual de um usuário para uma viagem específica (PRIVADO)
- **Trip_Participant**: Registro que vincula um usuário a uma viagem com seu orçamento pessoal
- **Owner**: Criador da viagem (não tem privilégios sobre orçamentos de outros)
- **Participant**: Usuário convidado para uma viagem (controla apenas seu próprio orçamento)
- **Budget_Modal**: Interface para definir orçamento pessoal (aparece uma única vez)

## Requirements

### Requirement 1: Personal Budget Privacy

**User Story:** As a trip participant, I want my personal budget to remain completely private, so that other users cannot see how much I allocated for the trip.

#### Acceptance Criteria

1. WHEN a user queries trip data, THE System SHALL return only that user's personal budget
2. WHEN a user views trip list, THE System SHALL display only their own personal budget for each trip
3. WHEN a user views trip details, THE System SHALL show only their own budget progress
4. THE System SHALL NOT expose any user's personal budget to other users
5. THE System SHALL NOT calculate or display aggregate budgets (sum, average, total)

### Requirement 2: Single Source of Truth

**User Story:** As a system architect, I want trip_participants.personal_budget to be the only source for budget data, so that there is no confusion or data inconsistency.

#### Acceptance Criteria

1. THE System SHALL use trip_participants.personal_budget as the exclusive source for user budgets
2. THE System SHALL NOT use trips.budget for participant budget calculations
3. WHEN displaying budget information, THE System SHALL query trip_participants table
4. THE System SHALL NOT implement fallback logic to trips.budget for participants
5. IF trips.budget exists, THE System SHALL use it only for internal owner reference

### Requirement 3: Budget Modal Behavior

**User Story:** As a trip participant, I want to set my personal budget only once when I first access a trip, so that I'm not repeatedly asked for the same information.

#### Acceptance Criteria

1. WHEN a user accesses a trip for the first time, THE System SHALL display the budget modal
2. WHEN personal_budget IS NULL for the user, THE System SHALL show the budget modal
3. WHEN the user submits a valid budget, THE System SHALL save it to trip_participants.personal_budget
4. WHEN personal_budget is already set, THE System SHALL NOT show the budget modal automatically
5. THE System SHALL allow manual budget updates through settings/profile

### Requirement 4: Trip List Display

**User Story:** As a user viewing my trip list, I want to see MY budget for each trip, so that I can quickly understand my financial commitment.

#### Acceptance Criteria

1. WHEN displaying trip cards, THE System SHALL show "Meu orçamento: R$ X" (not "Orçamento da viagem")
2. WHEN querying trips, THE System SHALL JOIN with trip_participants filtered by current user
3. WHEN a trip has no personal_budget set, THE System SHALL display "Orçamento não definido"
4. THE System SHALL NOT display the trip creator's budget
5. THE System SHALL NOT display any aggregate budget information

### Requirement 5: Trip Detail Budget Display

**User Story:** As a user viewing trip details, I want to see only MY budget and MY expenses, so that I can track my personal spending without seeing others' financial information.

#### Acceptance Criteria

1. WHEN viewing trip summary, THE System SHALL display only the user's personal budget
2. WHEN calculating budget progress, THE System SHALL use only the user's expenses
3. WHEN showing budget percentage, THE System SHALL calculate based on user's personal_budget
4. THE System SHALL label budget as "Meu Orçamento" (not "Orçamento da Viagem")
5. THE System SHALL NOT show or calculate budgets for other participants

### Requirement 6: Expense Attribution

**User Story:** As a user creating expenses in a trip, I want those expenses to count only against MY budget, so that my spending doesn't affect others' budget tracking.

#### Acceptance Criteria

1. WHEN a user creates an expense in a trip, THE System SHALL attribute it only to that user
2. WHEN calculating budget usage, THE System SHALL sum only expenses where user_id matches
3. THE System SHALL NOT aggregate expenses across multiple users
4. WHEN filtering expenses, THE System SHALL use WHERE trip_id = :trip_id AND user_id = auth.uid()
5. THE System SHALL maintain expense isolation between participants

### Requirement 7: RLS Policy Enforcement

**User Story:** As a system administrator, I want database-level security to prevent budget information leakage, so that privacy is guaranteed even if application code has bugs.

#### Acceptance Criteria

1. THE System SHALL implement RLS policies that filter personal_budget by user_id
2. WHEN querying trip_participants, THE System SHALL return personal_budget only for auth.uid()
3. WHEN other users query the same trip, THE System SHALL return NULL for personal_budget
4. THE System SHALL enforce privacy at the database level, not just application level
5. THE System SHALL prevent any SELECT query from exposing other users' budgets

### Requirement 8: UI/UX Clarity

**User Story:** As a user, I want the interface to clearly indicate that budgets are personal, so that I don't confuse my budget with a shared trip budget.

#### Acceptance Criteria

1. THE System SHALL use labels like "Meu Orçamento" instead of "Orçamento da Viagem"
2. THE System SHALL use first-person language ("Meus gastos", "Meu saldo")
3. THE System SHALL NOT use collective language ("Orçamento total", "Gastos da viagem")
4. WHEN showing budget progress, THE System SHALL clearly indicate it's personal
5. THE System SHALL provide tooltips explaining that budgets are individual

### Requirement 9: Budget Validation

**User Story:** As a user setting my budget, I want to ensure I enter a valid positive amount, so that my budget tracking works correctly.

#### Acceptance Criteria

1. WHEN submitting budget, THE System SHALL validate that personal_budget > 0
2. WHEN budget is invalid, THE System SHALL display a clear error message
3. THE System SHALL NOT allow NULL or negative budgets after initial setup
4. THE System SHALL accept decimal values with 2 decimal places
5. THE System SHALL format currency according to trip currency setting

### Requirement 10: Itinerary and Activities Privacy

**User Story:** As a trip participant, I want my itinerary and activities to be private, so that other participants don't see my personal plans.

#### Acceptance Criteria

1. WHEN querying trip_itinerary, THE System SHALL filter by user_id = auth.uid()
2. WHEN displaying activities, THE System SHALL show only the current user's items
3. THE System SHALL NOT expose itinerary items from other participants
4. THE System SHALL enforce privacy through RLS policies
5. THE System SHALL maintain complete isolation of personal planning data
