# Implementation Plan: Fix Trip Invitations and Transaction Form

## Overview

Este plano implementa correções para três bugs críticos: viagens que desaparecem após aceitar convite, ausência de notificação ao rejeitar convite, e loop infinito no formulário de transação. As tarefas são organizadas para corrigir primeiro os problemas mais críticos (viagens desaparecendo) e depois otimizações de performance.

## Tasks

- [x] 1. Corrigir hook useAcceptTripInvitation para adicionar membro à viagem
  - Modificar `src/hooks/useTripInvitations.ts`
  - Na função `mutationFn`, após atualizar status do convite, inserir registro em `trip_members`
  - Definir `role: 'member'`, `can_edit_details: false`, `can_manage_expenses: true`
  - Tratar erro de duplicata (ignorar se já existe)
  - Invalidar queries: `['trips']`, `['trip-members']`, `['pending-trip-invitations']`
  - _Requirements: 1.1, 5.2, 5.3, 5.4_

- [ ]* 1.1 Escrever property test para criação de trip_member ao aceitar convite
  - **Property 1: Trip Member Creation on Accept**
  - **Validates: Requirements 1.1, 5.2, 5.3, 5.4**
  - Gerar convites aleatórios, aceitar, verificar registro em trip_members
  - Verificar role='member' e can_manage_expenses=true

- [ ]* 1.2 Escrever property test para visibilidade de viagem após aceitar
  - **Property 2: Trip Visibility After Accept**
  - **Validates: Requirements 1.3, 1.4, 1.5, 4.1, 4.2**
  - Gerar viagens e convites aleatórios, aceitar, verificar viagem aparece na query

- [ ]* 1.3 Escrever property test para atualização de status ao aceitar
  - **Property 3: Invitation Status Update on Accept**
  - **Validates: Requirements 5.1**
  - Gerar convites aleatórios, aceitar, verificar status='accepted'

- [x] 2. Corrigir hook useRejectTripInvitation para notificar com detalhes
  - Modificar `src/hooks/useTripInvitations.ts`
  - Na função `mutationFn`, buscar dados do convite antes de atualizar
  - Após atualizar status, buscar dados da viagem e do inviter usando Promise.all
  - No `onSuccess`, extrair nomes e exibir toast.info com mensagem personalizada
  - Usar valores padrão se dados não estiverem disponíveis
  - _Requirements: 2.1, 2.3, 2.5, 6.3_

- [ ]* 2.1 Escrever property test para atualização de status ao rejeitar
  - **Property 4: Invitation Status Update on Reject**
  - **Validates: Requirements 2.1, 2.5**
  - Gerar convites aleatórios, rejeitar, verificar status='rejected' e registro preservado

- [ ]* 2.2 Escrever property test para conteúdo da notificação de rejeição
  - **Property 5: Rejection Notification Content**
  - **Validates: Requirements 2.3, 6.3**
  - Gerar convites com nomes aleatórios, rejeitar, verificar toast contém nomes

- [ ] 3. Checkpoint - Testar fluxo de convites
  - Testar aceitar convite e verificar viagem aparece
  - Testar rejeitar convite e verificar notificação
  - Verificar console sem erros
  - Perguntar ao usuário se há problemas

- [x] 4. Otimizar hook useTrips para evitar loops
  - Modificar `src/hooks/useTrips.ts`
  - Adicionar configuração `retry: false` na query
  - Adicionar configuração `staleTime: 30000` (30 segundos)
  - Adicionar configuração `refetchOnWindowFocus: false`
  - Manter lógica existente de buscar por trip_members
  - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2_

- [ ]* 4.1 Escrever property test para lista vazia de viagens
  - **Property 6: Empty Trip List Handling**
  - **Validates: Requirements 4.3**
  - Gerar usuários sem viagens, verificar query retorna array vazio sem erro

- [x] 5. Corrigir useEffect de detecção de duplicatas no TransactionForm
  - Modificar `src/components/transactions/TransactionForm.tsx`
  - No início do useEffect (linha ~140), adicionar verificação: `if (!allTransactions || allTransactions.length === 0) { setDuplicateWarning(false); return; }`
  - Manter debounce de 500ms existente
  - Manter lógica de detecção de duplicatas
  - _Requirements: 3.3, 3.4_

- [ ]* 5.1 Escrever unit test para detecção de duplicatas com array vazio
  - **Property 8: Duplicate Detection with Empty Transactions**
  - **Validates: Requirements 3.4**
  - Testar que useEffect não falha quando allTransactions é undefined ou vazio

- [x] 6. Adicionar DialogDescription ao SplitModal para acessibilidade
  - Modificar `src/components/transactions/SplitModal.tsx`
  - Importar `DialogDescription` de `@/components/ui/dialog`
  - Adicionar `<DialogDescription>` após `<DialogTitle>` com texto: "Configure como a despesa será dividida entre os participantes"
  - _Requirements: 3.5_

- [ ]* 6.1 Escrever unit test para acessibilidade do DialogContent
  - **Property 7: Dialog Accessibility**
  - **Validates: Requirements 3.5**
  - Renderizar SplitModal, verificar presença de DialogDescription ou aria-describedby

- [x] 7. Otimizar hook usePendingTripInvitations (verificar configurações)
  - Verificar `src/hooks/useTripInvitations.ts`
  - Confirmar que já tem `retry: 1`, `staleTime: 60000`, `refetchOnWindowFocus: false`
  - Se não tiver, adicionar essas configurações
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. Checkpoint Final - Testar sistema completo
  - Abrir formulário de transação múltiplas vezes, verificar sem loop
  - Aceitar convite e verificar viagem aparece para ambos usuários
  - Rejeitar convite e verificar notificação detalhada
  - Verificar console sem warnings de DialogContent
  - Testar com conexão lenta para verificar cache
  - Perguntar ao usuário se tudo está funcionando

## Notes

- Tasks marcadas com `*` são opcionais (testes) e podem ser puladas para MVP mais rápido
- Cada task referencia requirements específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests validam propriedades universais de correção
- Unit tests validam exemplos específicos e casos de borda
- Ordem de implementação prioriza correções críticas primeiro (viagens desaparecendo)
