# Requirements Document

## Introduction

Este documento define os requisitos para padronizar e garantir a consistência do sistema de acertos (settlements) de transações compartilhadas. O sistema atual permite edições, exclusões e antecipações em transações já acertadas (pagas/recebidas), causando inconsistências financeiras e quebra da lógica contábil.

## Glossary

- **Transaction**: Uma transação financeira no sistema
- **Settlement**: Acerto de uma transação compartilhada (marcação como paga/recebida)
- **Split**: Divisão de uma transação compartilhada entre múltiplos usuários
- **CREDIT**: Transação onde o usuário atual deve receber dinheiro
- **DEBIT**: Transação onde o usuário atual deve pagar dinheiro
- **Settled_Transaction**: Transação que foi marcada como acertada (paga ou recebida)
- **UI_State**: Estado da interface do usuário que controla visibilidade e interatividade
- **Financial_Integrity**: Garantia de que operações financeiras não causam duplicação ou inconsistência

## Requirements

### Requirement 1: Integração Visual entre Compartilhados e Transações (NEW)

**User Story:** Como usuário, eu quero que transações compartilhadas apareçam de forma consistente em todas as páginas, para que eu possa identificá-las facilmente e entender seu estado.

#### Acceptance Criteria

1. WHEN uma transação compartilhada é exibida na lista de transações, THEN THE System SHALL display a "Compartilhado" badge with the member name
2. WHEN uma transação compartilhada está acertada, THEN THE System SHALL display the same visual styling in both Compartilhados and Transações pages
3. WHEN uma transação compartilhada é modificada em qualquer página, THEN THE System SHALL update the display in all related pages automatically
4. WHEN uma transação de CRÉDITO está acertada, THEN THE System SHALL show the same restrictions in both pages
5. WHEN uma transação de DÉBITO está acertada, THEN THE System SHALL show the same restrictions in both pages

### Requirement 2: Sincronização Bidirecional (NEW)

**User Story:** Como usuário, eu quero que mudanças em compartilhados reflitam automaticamente nas transações e vice-versa, para manter consistência de dados.

#### Acceptance Criteria

1. WHEN um acerto é feito em Compartilhados, THEN THE System SHALL update the transaction status in Transações immediately
2. WHEN uma transação compartilhada é editada em Transações, THEN THE System SHALL update the display in Compartilhados immediately
3. WHEN uma transação compartilhada é excluída em qualquer página, THEN THE System SHALL remove it from all related pages
4. WHEN splits são atualizados, THEN THE System SHALL invalidate and refetch all related queries
5. WHEN cache is invalidated, THEN THE System SHALL refresh UI components automatically

### Requirement 3: Efeito Cascata Completo (NEW)

**User Story:** Como usuário, eu quero que exclusões de transações compartilhadas limpem todos os dados relacionados, para evitar dados órfãos no sistema.

#### Acceptance Criteria

1. WHEN uma transação compartilhada é excluída, THEN THE System SHALL cascade delete all related transaction_splits
2. WHEN uma transação compartilhada é excluída, THEN THE System SHALL cascade delete all settlement transactions
3. WHEN uma série de parcelas é excluída, THEN THE System SHALL cascade delete all installments and their splits
4. WHEN cascade delete occurs, THEN THE System SHALL use database triggers to ensure completeness
5. WHEN cascade delete completes, THEN THE System SHALL verify no orphaned data remains

### Requirement 4: Bloqueio de Edição em Transações Acertadas

**User Story:** Como usuário, eu quero que transações já acertadas (pagas ou recebidas) sejam bloqueadas para edição, para que eu não possa modificar acidentalmente valores já confirmados.

#### Acceptance Criteria

1. WHEN uma transação está marcada como acertada (is_settled = true OU settled_by_debtor = true OU settled_by_creditor = true), THEN THE System SHALL prevent any edit operations on that transaction
2. WHEN um usuário tenta editar uma transação acertada, THEN THE System SHALL display a clear error message explaining that settled transactions cannot be edited
3. WHEN uma transação de CRÉDITO está acertada, THEN THE UI SHALL hide or disable all edit buttons and options
4. WHEN uma transação de DÉBITO está acertada, THEN THE UI SHALL hide or disable all edit buttons and options
5. WHEN uma transação está acertada, THEN THE System SHALL maintain the transaction visible in the UI with a "PAGO" badge

### Requirement 5: Bloqueio de Exclusão em Transações Acertadas

**User Story:** Como usuário, eu quero que transações já acertadas não possam ser excluídas diretamente, para evitar perda de histórico financeiro e inconsistências contábeis.

#### Acceptance Criteria

1. WHEN uma transação está marcada como acertada, THEN THE System SHALL prevent direct deletion of that transaction
2. WHEN um usuário tenta excluir uma transação acertada, THEN THE System SHALL display an error message requiring the user to undo the settlement first
3. WHEN uma série de parcelas contém pelo menos uma parcela acertada, THEN THE System SHALL prevent deletion of the entire series
4. WHEN um usuário tenta excluir uma série com parcelas acertadas, THEN THE System SHALL display a message listing which installments are settled
5. WHEN todas as parcelas de uma série estão não-acertadas, THEN THE System SHALL allow deletion of the entire series

### Requirement 6: Bloqueio de Antecipação em Transações Acertadas

**User Story:** Como usuário, eu quero que parcelas já acertadas não possam ser antecipadas, para manter a integridade do histórico de pagamentos.

#### Acceptance Criteria

1. WHEN uma parcela está marcada como acertada, THEN THE System SHALL exclude that installment from the list of installments available for anticipation
2. WHEN um usuário visualiza opções de antecipação, THEN THE System SHALL only display non-settled installments
3. WHEN todas as parcelas de uma série estão acertadas, THEN THE System SHALL hide the anticipation option entirely
4. WHEN um usuário tenta antecipar uma parcela acertada via API, THEN THE System SHALL return an error preventing the operation

### Requirement 7: Funcionalidade de Antecipação de Parcelas na Página de Compartilhados

**User Story:** Como usuário, eu quero poder antecipar parcelas diretamente da página de compartilhados, para ter consistência com outras páginas do sistema.

#### Acceptance Criteria

1. WHEN um usuário visualiza uma transação parcelada não-acertada na página de compartilhados, THEN THE System SHALL display an "Antecipar Parcelas" option in the dropdown menu
2. WHEN um usuário seleciona "Antecipar Parcelas", THEN THE System SHALL open a dialog showing all future non-settled installments of that series
3. WHEN um usuário confirma a antecipação, THEN THE System SHALL update the competence_date of selected installments to the current month
4. WHEN parcelas são antecipadas, THEN THE System SHALL maintain the original transaction_date unchanged
5. WHEN a antecipação é concluída, THEN THE System SHALL refresh the shared expenses list to reflect the changes

### Requirement 8: Validação de Estado Antes de Operações

**User Story:** Como desenvolvedor, eu quero que o sistema valide o estado de acerto antes de qualquer operação destrutiva, para garantir integridade financeira.

#### Acceptance Criteria

1. WHEN any edit operation is attempted, THEN THE System SHALL check the settlement status before proceeding
2. WHEN any delete operation is attempted, THEN THE System SHALL check the settlement status of all affected transactions
3. WHEN any anticipation operation is attempted, THEN THE System SHALL verify that target installments are not settled
4. WHEN validation fails, THEN THE System SHALL return a specific error code and message
5. WHEN validation passes, THEN THE System SHALL proceed with the operation and log the action

### Requirement 9: Consistência Visual de Estado

**User Story:** Como usuário, eu quero que transações acertadas tenham uma aparência visual consistente em todas as páginas, para identificar facilmente seu estado.

#### Acceptance Criteria

1. WHEN uma transação está acertada, THEN THE UI SHALL display a "PAGO" badge in green
2. WHEN uma transação está acertada, THEN THE UI SHALL apply reduced opacity (60%) to the entire row
3. WHEN uma transação está acertada, THEN THE UI SHALL show a CheckCircle icon instead of a status dot
4. WHEN uma transação está acertada, THEN THE UI SHALL apply strikethrough to the description text
5. WHEN uma transação está acertada, THEN THE UI SHALL only show "Desfazer acerto" option in the dropdown menu (no edit/delete/anticipate)

### Requirement 10: Desfazer Acerto Mantém Integridade

**User Story:** Como usuário, eu quero poder desfazer um acerto quando necessário, mas mantendo a integridade financeira do sistema.

#### Acceptance Criteria

1. WHEN um usuário desfaz um acerto, THEN THE System SHALL delete the settlement transaction
2. WHEN um acerto é desfeito, THEN THE System SHALL update the split flags (settled_by_debtor or settled_by_creditor) to false
3. WHEN um acerto é desfeito, THEN THE System SHALL recalculate the is_settled flag based on remaining settlements
4. WHEN um acerto é desfeito, THEN THE System SHALL make the original transaction editable again
5. WHEN um acerto é desfeito, THEN THE System SHALL refresh all affected UI components to reflect the new state

### Requirement 11: Prevenção de Duplicação Financeira

**User Story:** Como usuário, eu quero que o sistema previna qualquer duplicação de transações ou acertos, para manter a precisão dos meus registros financeiros.

#### Acceptance Criteria

1. WHEN um acerto é criado, THEN THE System SHALL verify that no settlement transaction already exists for that split
2. WHEN uma transação é editada, THEN THE System SHALL verify that it is not settled before allowing changes
3. WHEN uma transação é excluída, THEN THE System SHALL cascade delete all related splits and settlement transactions
4. WHEN parcelas são antecipadas, THEN THE System SHALL verify that no duplicate competence_date entries are created
5. WHEN qualquer operação financeira é executada, THEN THE System SHALL use database transactions to ensure atomicity

### Requirement 12: Mensagens de Erro Claras e Acionáveis

**User Story:** Como usuário, eu quero receber mensagens de erro claras quando uma operação não é permitida, para entender o que fazer em seguida.

#### Acceptance Criteria

1. WHEN uma operação é bloqueada por settlement status, THEN THE System SHALL display a message explaining why the operation was blocked
2. WHEN uma transação acertada não pode ser editada, THEN THE System SHALL suggest "Desfazer acerto primeiro"
3. WHEN uma série não pode ser excluída, THEN THE System SHALL list which installments are settled
4. WHEN uma parcela não pode ser antecipada, THEN THE System SHALL explain that settled installments cannot be anticipated
5. WHEN um erro de validação ocorre, THEN THE System SHALL display the error in a toast notification with appropriate styling

### Requirement 13: Auditoria de Operações de Acerto

**User Story:** Como administrador do sistema, eu quero que todas as operações de acerto sejam registradas, para auditoria e troubleshooting.

#### Acceptance Criteria

1. WHEN um acerto é criado, THEN THE System SHALL log the user_id, timestamp, amount, and affected split_id
2. WHEN um acerto é desfeito, THEN THE System SHALL log the user_id, timestamp, and reason
3. WHEN uma operação é bloqueada, THEN THE System SHALL log the attempted operation and reason for blocking
4. WHEN logs são criados, THEN THE System SHALL include sufficient context for debugging
5. WHEN logs são consultados, THEN THE System SHALL provide filtering by user, date range, and operation type
