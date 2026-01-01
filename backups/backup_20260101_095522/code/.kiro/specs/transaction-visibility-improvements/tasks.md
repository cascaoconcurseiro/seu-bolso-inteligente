# Implementation Plan: Transaction Visibility Improvements

## Overview

Este plano implementa melhorias na visibilidade e gestão de transações, transformando o sistema em um app financeiro pessoal padrão com lista agrupada por dia, extrato completo, adiantamento de parcelas e controle total do usuário.

## Tasks

- [x] 1. Refatorar lista de transações para agrupar por dia
  - [x] 1.1 Criar função `groupTransactionsByDay` em `src/utils/transactionUtils.ts`
    - Agrupar transações por campo `date`
    - Calcular totais por dia (income, expense, balance)
    - Gerar labels amigáveis ("Hoje", "Ontem", "25 de dezembro")
    - _Requirements: 1.2, 1.3_
  - [x] 1.2 Atualizar query em `useTransactions` para excluir TRANSFER da lista principal
    - Adicionar filtro `.neq("type", "TRANSFER")` na query
    - Manter transferências apenas para extrato
    - _Requirements: 1.7, 2.1_
  - [x] 1.3 Refatorar componente `Transactions.tsx` para usar agrupamento por dia
    - Renderizar grupos de dia com header (data + total)
    - Exibir transações dentro de cada grupo
    - Ordenar por created_at dentro do dia
    - _Requirements: 1.1, 1.2, 1.6_
  - [ ]* 1.4 Escrever property test para agrupamento por dia
    - **Property 2: Day Grouping Correctness**
    - **Validates: Requirements 1.2, 1.6**

- [x] 2. Implementar extrato completo de conta
  - [x] 2.1 Criar hook `useAccountStatement` em `src/hooks/useAccountStatement.ts`
    - Query todas transações onde account_id = conta OU destination_account_id = conta
    - Incluir TRANSFER no extrato
    - Calcular running balance
    - _Requirements: 3.1, 3.5_
  - [x] 2.2 Criar função `calculateRunningBalance` em `src/utils/transactionUtils.ts`
    - Ordenar transações por data crescente
    - Calcular saldo acumulado considerando tipo e direção
    - _Requirements: 3.5_
  - [x] 2.3 Atualizar componente `AccountDetail.tsx` para usar novo hook
    - Exibir running balance em cada linha
    - Mostrar transferências com direção (entrada/saída)
    - _Requirements: 2.2, 2.3, 2.4, 3.4_
  - [ ]* 2.4 Escrever property test para running balance
    - **Property 7: Running Balance Calculation**
    - **Validates: Requirements 3.5**

- [x] 3. Corrigir visibilidade de transações compartilhadas
  - [x] 3.1 Atualizar query em `useTransactions` para incluir compartilhadas pagas pelo usuário
    - Remover filtro que exclui compartilhadas
    - Manter filtro de payer_id (só exclui se pago por OUTRO)
    - _Requirements: 1.8, 4.1_
  - [x] 3.2 Adicionar indicadores visuais de compartilhamento na lista
    - Badge "Compartilhada" quando is_shared = true
    - Badge "Pendente" quando tem splits não settled
    - Exibir quem deve ressarcir
    - _Requirements: 4.2, 4.3_
  - [ ]* 3.3 Escrever property test para valor integral de compartilhadas
    - **Property 4: Shared Transaction Full Amount Display**
    - **Validates: Requirements 1.8, 4.1, 4.5**

- [x] 4. Implementar adiantamento de parcelas
  - [x] 4.1 Adicionar campo `advanced_at` na tabela transactions (migration)
    - Campo timestamp nullable
    - Indica quando a parcela foi adiantada
    - _Requirements: 6.6_
  - [x] 4.2 Criar hook `useAdvanceInstallments` em `src/hooks/useInstallments.ts`
    - Atualizar competence_date para mês atual
    - Setar advanced_at com timestamp atual
    - Invalidar queries relacionadas
    - _Requirements: 6.4, 6.5_
  - [x] 4.3 Criar componente `AdvanceInstallmentsDialog.tsx`
    - Listar parcelas futuras disponíveis
    - Permitir seleção múltipla
    - Mostrar total a ser adiantado
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.4 Integrar dialog de adiantamento na lista de transações
    - Botão "Adiantar" em transações parceladas
    - Abrir dialog ao clicar
    - _Requirements: 6.1_
  - [ ]* 4.5 Escrever property test para adiantamento
    - **Property 8: Installment Advance Updates Competence**
    - **Validates: Requirements 6.4, 6.5, 6.6**

- [x] 5. Melhorar exclusão de parcelas em série
  - [x] 5.1 Atualizar `InstallmentActionsDialog.tsx` com opção de excluir série
    - Opção "Excluir apenas esta parcela"
    - Opção "Excluir toda a série"
    - Opção "Excluir parcelas futuras"
    - _Requirements: 7.1, 7.5_
  - [x] 5.2 Verificar hooks existentes `useDeleteInstallmentSeries` e `useDeleteFutureInstallments`
    - Garantir que revertem saldo corretamente
    - Garantir que excluem splits associados
    - _Requirements: 7.2, 7.3, 7.4, 7.6_
  - [ ]* 5.3 Escrever property test para exclusão de série
    - **Property 9: Series Deletion Completeness**
    - **Validates: Requirements 7.2, 7.4**

- [x] 6. Corrigir filtro de contas por moeda da viagem
  - [x] 6.1 Lógica de filtro já implementada em `TransactionForm.tsx`
    - Sem viagem: mostra todas as contas
    - Viagem BRL: mostra contas nacionais
    - Viagem internacional: mostra contas na moeda da viagem
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 6.2 Mensagem quando não há conta compatível já implementada
    - Exibe alerta com link para criar conta internacional
    - _Requirements: 8.4, 8.5, 8.6_
  - [ ]* 6.3 Escrever property test para filtro de contas
    - **Property 11: Account Filter by Trip Currency**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 7. Implementar confirmação de ressarcimento
  - [x] 7.1 Criar componente `SettlementConfirmDialog.tsx`
    - Listar splits pendentes
    - Permitir confirmar individual ou todos
    - Atualizar is_settled e settled_at
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 7.2 Criar hook `useSettleSplit` em `src/hooks/useSharedFinances.ts`
    - Atualizar split com is_settled = true
    - Setar settled_at com timestamp atual
    - _Requirements: 9.2, 9.3_
  - [x] 7.3 Adicionar botão "Confirmar recebimento" na lista de transações
    - Visível apenas para transações compartilhadas pendentes
    - Abrir dialog ao clicar
    - _Requirements: 9.1, 9.5_
  - [ ]* 7.4 Escrever property test para confirmação de ressarcimento
    - **Property 12: Settlement Status Update**
    - **Validates: Requirements 9.2, 9.3, 9.6**

- [x] 8. Implementar modal de detalhes da transação
  - [x] 8.1 Criar componente `TransactionDetailsModal.tsx`
    - Exibir todos os campos da transação
    - Exibir splits se compartilhada
    - Exibir série se parcelada
    - Botões de ação (Editar, Excluir, Adiantar)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 8.2 Integrar modal na lista de transações
    - Abrir ao clicar na transação
    - Passar dados da transação
    - _Requirements: 10.1_

- [ ] 9. Checkpoint - Verificar funcionalidades principais
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Melhorar filtros na lista de transações
  - [x] 10.1 Adicionar filtro por categoria em `Transactions.tsx`
    - Select com categorias do usuário
    - Filtrar transações pela categoria selecionada
    - _Requirements: 11.2_
  - [x] 10.2 Adicionar filtro por conta/cartão
    - Select com contas e cartões
    - Filtrar por account_id ou credit_card_id
    - _Requirements: 11.3_
  - [x] 10.3 Adicionar filtro por período personalizado
    - Date picker para início e fim
    - Presets: Este mês, Mês passado, Últimos 7 dias
    - _Requirements: 11.4_
  - [x] 10.4 Atualizar totais para refletir filtros aplicados
    - Recalcular income, expense, balance com filtros
    - _Requirements: 11.6_

- [x] 11. Adicionar indicadores visuais
  - [x] 11.1 Melhorar badges de status na lista
    - Badge verde para receitas
    - Badge vermelho para despesas
    - Badge "X/Y" para parcelas
    - Badge "Dividido" para compartilhadas
    - Badge "Pendente"/"Acertado" para ressarcimento
    - _Requirements: 12.1, 12.2, 12.4, 12.5, 12.6, 12.7_

- [x] 12. Final checkpoint - Verificar integração completa
  - All main features implemented

## Additional Features Implemented (28/12/2024)

- [x] 13. Configurações de Perfil do Usuário
  - [x] 13.1 Criar hook `useUserProfile` em `src/hooks/useUserProfile.ts`
    - Query e update do perfil do usuário
    - Alterar senha via Supabase Auth
    - Soft delete de conta
  - [x] 13.2 Adicionar seção "Perfil" em `Settings.tsx`
    - Editar nome do usuário
    - Alterar senha com dialog
    - Botão de logout
    - Zona de perigo com exclusão de conta
    - Link para exportar dados

- [x] 14. Sistema de Alertas Financeiros
  - [x] 14.1 Criar hook `useFinancialAlerts` em `src/hooks/useAlerts.ts`
    - Detectar saldo negativo em contas
    - Detectar limite de cartão >80%
    - Detectar parcelas próximas do vencimento
  - [x] 14.2 Criar componente `AlertsPanel` em `src/components/alerts/AlertsPanel.tsx`
    - Exibir alertas com severidade (error, warning, info)
    - Permitir dismiss de alertas
  - [x] 14.3 Integrar AlertsPanel no Dashboard

- [x] 15. Exportação de Dados
  - [x] 15.1 Criar serviço `exportService.ts`
    - Exportar transações para CSV
    - Exportar transações para JSON
    - Download automático de arquivo
  - [x] 15.2 Adicionar botão de exportação em `Transactions.tsx`
    - Dropdown com opções CSV e JSON
    - Exporta transações filtradas

## Notes

- Tasks marcadas com `*` são opcionais (testes de propriedade)
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests usam fast-check para validação de propriedades universais
