# Implementation Plan: Transaction Settlement Consistency

## Overview

Este plano implementa a integração completa entre Compartilhados e Transações, com validação de estado, bloqueios de operações em transações acertadas, e sincronização bidirecional. A implementação garante que transações compartilhadas apareçam consistentemente em todas as páginas e que mudanças sejam refletidas automaticamente.

## Tasks

- [x] 1. Criar camada de validação de settlement
  - Implementar serviço de validação com todas as regras de negócio
  - _Requirements: 4.1, 5.1, 6.1, 8.1_

- [x] 1.1 Criar `settlementValidation.ts` service
  - Implementar `SettlementValidator` class com métodos estáticos
  - Implementar `canEdit()`, `canDelete()`, `canAnticipate()`, `canDeleteSeries()`
  - Implementar `getSettlementStatus()` para obter status completo
  - Definir interfaces `SettlementStatus` e `ValidationResult`
  - Definir enum `SettlementErrorCode` com todos os códigos de erro
  - Criar mapa `ERROR_MESSAGES` com mensagens e ações sugeridas
  - _Requirements: 4.1, 5.1, 6.1, 8.1, 12.1_

- [ ]* 1.2 Escrever testes unitários para `settlementValidation.ts`
  - Testar cada método de validação com diferentes estados de settlement
  - Testar casos de borda (transação não encontrada, sem permissão, etc.)
  - Testar mensagens de erro e códigos
  - _Requirements: 4.1, 5.1, 6.1_

- [ ]* 1.3 Escrever property test para validação de settlement
  - **Property 1: Settled transactions cannot be edited**
  - **Validates: Requirements 4.1, 11.2**

- [x] 2. Criar hook de validação de transações
  - Hook React para validar operações em transações
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 2.1 Criar `useTransactionValidation.ts` hook
  - Implementar hook que recebe `transactionId` e `splitId`
  - Retornar flags `canEdit`, `canDelete`, `canAnticipate`
  - Retornar `settlementStatus` completo
  - Implementar função `validate(operation)` para validação sob demanda
  - Integrar com React Query para cache de validações
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 2.2 Escrever testes unitários para `useTransactionValidation`
  - Testar hook com diferentes estados de transação
  - Testar cache e invalidação
  - Testar função `validate()` com diferentes operações
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Criar hook de sincronização de transações
  - Hook para sincronizar transações entre Compartilhados e Transações
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.1 Criar `useTransactionSync.ts` hook
  - Implementar `syncTransaction(transactionId)` para sincronizar uma transação
  - Implementar `syncAllShared()` para sincronizar todas as compartilhadas
  - Implementar `invalidateRelated(transactionId)` para invalidar queries relacionadas
  - Usar React Query para invalidação de cache
  - Retornar flag `isSyncing` para feedback visual
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 3.2 Escrever testes unitários para `useTransactionSync`
  - Testar sincronização de transação individual
  - Testar sincronização em massa
  - Testar invalidação de cache
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Atualizar `useSharedFinances` com validação
  - Adicionar flags de validação em InvoiceItem
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1_

- [x] 4.1 Atualizar interface `InvoiceItem` em `useSharedFinances.ts`
  - Adicionar campos `isSettled`, `settledByDebtor`, `settledByCreditor`
  - Adicionar campos `canEdit`, `canDelete`, `canAnticipate`
  - Adicionar campo opcional `blockReason`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 Atualizar lógica de criação de InvoiceItem
  - Calcular flags de validação usando `SettlementValidator`
  - Incluir `blockReason` quando operação é bloqueada
  - Garantir que flags são calculadas para CREDIT e DEBIT
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1_

- [ ]* 4.3 Escrever property test para InvoiceItem validation
  - **Property 3: Settled CREDIT transactions hide edit UI**
  - **Property 4: Settled DEBIT transactions hide edit UI**
  - **Validates: Requirements 1.3, 1.4**

- [x] 5. Criar componente SharedTransactionBadge
  - Badge visual unificado para transações compartilhadas
  - _Requirements: 1.1, 1.2, 1.3, 9.1_

- [x] 5.1 Criar `SharedTransactionBadge.tsx` component
  - Receber props: `isShared`, `isSettled`, `type`, `memberName`, `compact`
  - Renderizar badge "Compartilhado" com nome do membro
  - Aplicar cores: verde para CREDIT, vermelho para DEBIT
  - Mostrar badge "PAGO" quando `isSettled` é true
  - Suportar modo compacto para mobile
  - _Requirements: 1.1, 1.2, 1.3, 9.1_

- [ ]* 5.2 Escrever testes de componente para SharedTransactionBadge
  - Testar renderização com diferentes props
  - Testar cores e estilos
  - Testar modo compacto
  - _Requirements: 1.1, 1.2, 1.3_

- [-] 6. Atualizar SharedExpenses.tsx com validação
  - Aplicar validações e bloqueios na página de compartilhados
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6.1 Integrar `useTransactionValidation` em SharedExpenses
  - Usar hook para cada item renderizado
  - Condicionar exibição de botões baseado em `canEdit`, `canDelete`, `canAnticipate`
  - Mostrar apenas "Desfazer acerto" para itens acertados
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.5_

- [ ] 6.2 Aplicar styling consistente para transações acertadas
  - Aplicar opacity 60% para itens acertados
  - Mostrar CheckCircle icon ao invés de status dot
  - Aplicar strikethrough na descrição
  - Mostrar badge "PAGO" em verde
  - _Requirements: 1.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 6.3 Implementar tratamento de erros com toast
  - Mostrar toast de erro quando operação é bloqueada
  - Incluir mensagem explicativa e ação sugerida
  - Usar `ERROR_MESSAGES` do validation service
  - _Requirements: 1.2, 5.2, 6.2, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 6.4 Escrever property test para UI de transações acertadas
  - **Property 5: Settled transactions display PAGO badge**
  - **Property 19: Settled transactions have consistent visual styling**
  - **Validates: Requirements 1.5, 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 7. Checkpoint - Validação e UI básica funcionando
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Criar hook de antecipação de parcelas
  - Hook para antecipar parcelas compartilhadas
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8.1 Criar `useAnticipateInstallments.ts` hook
  - Implementar mutation para antecipar parcelas
  - Validar que parcelas não estão acertadas antes de antecipar
  - Atualizar `competence_date` mantendo `transaction_date` inalterado
  - Invalidar queries relacionadas após sucesso
  - Retornar `isLoading` e `error` para feedback
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 8.2 Escrever testes unitários para `useAnticipateInstallments`
  - Testar antecipação bem-sucedida
  - Testar bloqueio de parcelas acertadas
  - Testar atualização de competence_date
  - Testar que transaction_date não muda
  - _Requirements: 7.3, 7.4_

- [ ]* 8.3 Escrever property test para antecipação
  - **Property 13: Anticipation updates competence_date correctly**
  - **Validates: Requirements 7.3, 7.4**

- [ ] 9. Criar dialog de antecipação de parcelas
  - Dialog para selecionar e antecipar parcelas
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 9.1 Criar `AnticipateInstallmentsDialog.tsx` component
  - Receber props: `isOpen`, `onClose`, `seriesId`, `currentInstallment`, `totalInstallments`, `onSuccess`
  - Buscar parcelas futuras não-acertadas da série
  - Permitir seleção de parcelas para antecipar
  - Mostrar data de competência atual e nova
  - Integrar com `useAnticipateInstallments` hook
  - Mostrar loading state durante operação
  - Chamar `onSuccess` e fechar dialog após sucesso
  - _Requirements: 7.1, 7.2, 7.5_

- [ ]* 9.2 Escrever testes de componente para AnticipateInstallmentsDialog
  - Testar abertura e fechamento do dialog
  - Testar seleção de parcelas
  - Testar submissão
  - Testar estados de loading e erro
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 10. Adicionar opção de antecipar parcelas em SharedExpenses
  - Adicionar opção no dropdown menu
  - _Requirements: 7.1_

- [ ] 10.1 Adicionar "Antecipar Parcelas" no dropdown menu
  - Mostrar opção apenas para transações parceladas não-acertadas
  - Abrir `AnticipateInstallmentsDialog` ao clicar
  - Passar `seriesId`, `currentInstallment`, `totalInstallments`
  - Atualizar lista após sucesso
  - _Requirements: 7.1_

- [ ]* 10.2 Escrever property test para opção de antecipação
  - **Property 12: Non-settled installment transactions show anticipation option**
  - **Validates: Requirements 7.1**

- [ ] 11. Implementar bloqueio de exclusão de transações acertadas
  - Bloquear exclusão de transações e séries acertadas
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 11.1 Atualizar handlers de exclusão em SharedExpenses
  - Validar settlement status antes de excluir transação
  - Validar settlement status antes de excluir série
  - Mostrar erro com lista de parcelas acertadas para séries
  - Usar `SettlementValidator.canDelete()` e `canDeleteSeries()`
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 11.2 Escrever property test para bloqueio de exclusão
  - **Property 6: Settled transactions cannot be deleted**
  - **Property 8: Series with settled installments cannot be deleted**
  - **Validates: Requirements 5.1, 5.3**

- [ ] 12. Implementar bloqueio de antecipação de parcelas acertadas
  - Bloquear antecipação de parcelas já acertadas
  - _Requirements: 6.1, 6.2, 6.4_

- [ ] 12.1 Filtrar parcelas acertadas da lista de antecipação
  - No `AnticipateInstallmentsDialog`, filtrar parcelas com `isPaid` true
  - Mostrar apenas parcelas não-acertadas
  - Esconder opção de antecipação se todas as parcelas estão acertadas
  - _Requirements: 6.1, 6.2_

- [ ] 12.2 Adicionar validação no backend
  - Criar função RPC `validate_anticipation` no Supabase
  - Verificar que parcelas não estão acertadas
  - Retornar erro se alguma parcela está acertada
  - _Requirements: 6.4_

- [ ]* 12.3 Escrever property test para bloqueio de antecipação
  - **Property 10: Settled installments excluded from anticipation list**
  - **Property 11: API blocks anticipation of settled installments**
  - **Validates: Requirements 6.1, 6.2, 6.4**

- [ ] 13. Checkpoint - Antecipação e bloqueios funcionando
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implementar desfazer acerto com integridade
  - Garantir que desfazer acerto restaura estado correto
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14.1 Atualizar `handleUndoSettlement` em SharedExpenses
  - Deletar settlement transaction
  - Atualizar flags `settled_by_debtor` ou `settled_by_creditor` para false
  - Recalcular `is_settled` baseado em settlements restantes
  - Invalidar queries relacionadas
  - Mostrar toast de sucesso
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 14.2 Escrever property test para undo settlement
  - **Property 20: Undo settlement deletes settlement transaction**
  - **Property 21: Undo settlement resets split flags**
  - **Property 22: Undo settlement recalculates is_settled flag**
  - **Property 23: Undo settlement restores editability**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [ ] 15. Implementar prevenção de duplicação
  - Evitar criação de settlements duplicados
  - _Requirements: 11.1, 11.4_

- [ ] 15.1 Adicionar validação de duplicação em `handleSettle`
  - Verificar se já existe settlement transaction para o split
  - Bloquear criação se já existe
  - Mostrar erro claro ao usuário
  - _Requirements: 11.1_

- [ ] 15.2 Adicionar validação de duplicação em antecipação
  - Verificar se competence_date já existe para a série
  - Bloquear antecipação se criar duplicata
  - Mostrar erro claro ao usuário
  - _Requirements: 11.4_

- [ ]* 15.3 Escrever property test para prevenção de duplicação
  - **Property 24: Settlement creation checks for duplicates**
  - **Property 26: Anticipation prevents duplicate competence_date entries**
  - **Validates: Requirements 11.1, 11.4**

- [ ] 16. Implementar efeito cascata completo
  - Garantir que exclusões limpam todos os dados relacionados
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 11.3_

- [ ] 16.1 Criar trigger de cascade delete no banco
  - Criar trigger para deletar splits quando transação é deletada
  - Criar trigger para deletar settlement transactions quando split é deletado
  - Criar trigger para deletar todas as parcelas quando série é deletada
  - Testar triggers com dados reais
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 16.2 Atualizar handlers de exclusão para usar cascade
  - Remover lógica manual de exclusão de splits
  - Confiar nos triggers do banco para cascade
  - Adicionar verificação pós-exclusão para garantir limpeza
  - _Requirements: 3.1, 3.2, 3.3, 11.3_

- [ ]* 16.3 Escrever property test para cascade delete
  - **Property 25: Transaction deletion cascades to related data**
  - **Validates: Requirements 3.1, 3.2, 3.3, 11.3**

- [ ] 17. Implementar integração visual completa
  - Garantir que transações compartilhadas apareçam consistentemente
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 17.1 Adicionar SharedTransactionBadge na lista de transações
  - Importar e usar `SharedTransactionBadge` em `Transactions.tsx`
  - Mostrar badge para todas as transações com `is_shared` true
  - Passar `type`, `isSettled`, `memberName` corretos
  - Aplicar mesmo styling de SharedExpenses
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 17.2 Aplicar validações na lista de transações
  - Usar `useTransactionValidation` para cada transação compartilhada
  - Bloquear edição/exclusão de transações acertadas
  - Mostrar mesmas mensagens de erro
  - Aplicar mesmo styling visual (opacity, strikethrough, etc.)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 17.3 Escrever property test para integração visual
  - **Property 5: Settled transactions display PAGO badge** (em ambas páginas)
  - **Property 19: Settled transactions have consistent visual styling** (em ambas páginas)
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [ ] 18. Implementar sincronização bidirecional
  - Garantir que mudanças refletem em ambas as páginas
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 18.1 Integrar `useTransactionSync` em SharedExpenses
  - Chamar `invalidateRelated()` após cada operação (settle, undo, delete)
  - Mostrar loading state durante sincronização
  - Garantir que UI atualiza após sync
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 18.2 Integrar `useTransactionSync` em Transactions
  - Chamar `invalidateRelated()` após editar/excluir transação compartilhada
  - Garantir que mudanças refletem em Compartilhados
  - Mostrar feedback visual durante sync
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 18.3 Configurar React Query para invalidação automática
  - Configurar query keys relacionadas
  - Usar `invalidateQueries` com padrões corretos
  - Testar que invalidação funciona em ambas as direções
  - _Requirements: 2.4, 2.5_

- [ ]* 18.4 Escrever testes de integração para sincronização
  - Testar mudança em Compartilhados → reflete em Transações
  - Testar mudança em Transações → reflete em Compartilhados
  - Testar exclusão em qualquer página → remove de ambas
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 19. Checkpoint - Integração completa funcionando
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Implementar auditoria de operações
  - Registrar todas as operações de settlement
  - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [ ] 20.1 Criar função de logging
  - Criar `logSettlementOperation()` em `src/services/auditLog.ts`
  - Registrar user_id, timestamp, operation type, affected IDs
  - Armazenar logs em tabela `audit_logs` no Supabase
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 20.2 Integrar logging em operações
  - Chamar `logSettlementOperation()` em `handleSettle`
  - Chamar `logSettlementOperation()` em `handleUndoSettlement`
  - Chamar `logSettlementOperation()` quando operação é bloqueada
  - Incluir contexto suficiente para debugging
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 20.3 Criar interface de consulta de logs
  - Criar página ou modal para visualizar logs
  - Implementar filtros por user, date range, operation type
  - Mostrar logs em ordem cronológica reversa
  - _Requirements: 13.5_

- [ ]* 20.4 Escrever property test para auditoria
  - **Property 29: Settlement operations are logged**
  - **Property 30: Blocked operations are logged**
  - **Property 31: Log queries support filtering**
  - **Validates: Requirements 13.1, 13.2, 13.3, 13.5**

- [ ] 21. Criar função RPC de validação no banco
  - Validação no backend para segurança adicional
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 21.1 Criar `validate_transaction_operation` function
  - Implementar função SQL conforme design
  - Verificar settlement status
  - Verificar permissões do usuário
  - Retornar JSON com `isValid` e `error`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 21.2 Integrar função RPC nas operações
  - Chamar RPC antes de editar transação
  - Chamar RPC antes de excluir transação
  - Chamar RPC antes de antecipar parcelas
  - Tratar erros retornados pela função
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ]* 21.3 Escrever testes para função RPC
  - Testar validação com diferentes estados
  - Testar verificação de permissões
  - Testar retorno de erros
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 22. Testes de integração end-to-end
  - Testar fluxos completos do usuário
  - _Requirements: ALL_

- [ ]* 22.1 Escrever testes E2E para fluxo de acerto
  - Criar transação compartilhada
  - Acertar transação
  - Verificar que não pode editar
  - Desfazer acerto
  - Verificar que pode editar novamente
  - _Requirements: 4.1, 10.1, 10.4_

- [ ]* 22.2 Escrever testes E2E para fluxo de antecipação
  - Criar série de parcelas compartilhadas
  - Antecipar parcelas futuras
  - Verificar que competence_date foi atualizado
  - Verificar que transaction_date não mudou
  - Acertar uma parcela
  - Verificar que não pode antecipar parcela acertada
  - _Requirements: 7.1, 7.3, 7.4, 6.1_

- [ ]* 22.3 Escrever testes E2E para sincronização
  - Acertar transação em Compartilhados
  - Verificar que aparece como acertada em Transações
  - Desfazer acerto em Transações
  - Verificar que aparece como não-acertada em Compartilhados
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 23. Checkpoint final - Sistema completo
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Documentação e refinamento
  - Documentar APIs e componentes criados
  - _Requirements: ALL_

- [ ] 24.1 Documentar APIs e hooks
  - Adicionar JSDoc comments em todos os hooks
  - Adicionar exemplos de uso
  - Documentar interfaces e tipos
  - _Requirements: ALL_

- [ ] 24.2 Criar guia de uso para desenvolvedores
  - Documentar como usar `SettlementValidator`
  - Documentar como usar `useTransactionValidation`
  - Documentar como usar `useTransactionSync`
  - Incluir exemplos de código
  - _Requirements: ALL_

- [ ] 24.3 Atualizar README com novas funcionalidades
  - Documentar integração Compartilhados ↔ Transações
  - Documentar validações e bloqueios
  - Documentar antecipação de parcelas
  - Incluir screenshots
  - _Requirements: ALL_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user flows
- The implementation follows a bottom-up approach: validation layer → hooks → UI components → integration
