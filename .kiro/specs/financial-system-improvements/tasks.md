# Implementation Plan: Financial System Improvements

## Overview

Este plano implementa melhorias críticas no sistema financeiro pessoal, focando em:
1. Fortalecer partidas dobradas com validação rigorosa
2. Corrigir fluxo de transações pagas por outros
3. Implementar alertas e projeções financeiras
4. Adicionar reconciliação bancária e exportação de dados

## Tasks

- [ ] 1. Preparar infraestrutura de banco de dados
  - Criar migrations para novas tabelas e colunas
  - Adicionar índices para performance
  - Criar triggers e functions necessárias
  - _Requirements: 1.6, 1.7, 2.5, 10.1, 10.2_

- [ ]* 1.1 Escrever testes de migração
  - Testar criação de tabelas
  - Testar integridade referencial
  - _Requirements: 1.6_

- [ ] 2. Implementar Enhanced Ledger Service
  - [ ] 2.1 Criar modelo de dados LedgerEntry
    - Definir interface TypeScript
    - Criar tipo para TrialBalance
    - _Requirements: 1.6_

  - [ ] 2.2 Implementar createLedgerEntries()
    - Criar entradas para EXPENSE (débito categoria, crédito conta)
    - Criar entradas para INCOME (débito conta, crédito categoria)
    - Criar entradas para TRANSFER (débito destino, crédito origem)
    - Usar SafeFinancialCalculator para valores
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 2.3 Escrever property test para double entry balance
    - **Property 1: Double Entry Balance**
    - **Validates: Requirements 1.4**

  - [ ] 2.4 Implementar generateTrialBalance()
    - Agregar débitos e créditos por conta
    - Calcular diferença total
    - Validar que diferença é zero
    - _Requirements: 1.7_

  - [ ]* 2.5 Escrever property test para trial balance closure
    - **Property 3: Trial Balance Closure**
    - **Validates: Requirements 1.7**

  - [ ] 2.6 Implementar validateDoubleEntry()
    - Buscar entradas de ledger da transação
    - Validar soma de débitos = soma de créditos
    - _Requirements: 1.4, 1.10_

  - [ ] 2.7 Implementar getLedger() com filtros
    - Filtrar por período, conta, tipo
    - Ordenar por data
    - _Requirements: 1.6_

  - [ ] 2.8 Implementar reverseLedgerEntries()
    - Marcar entradas como revertidas
    - Criar entradas de reversão
    - _Requirements: 1.5_

  - [ ]* 2.9 Escrever property test para ledger entry reversal
    - **Property 14: Ledger Entry Reversal**
    - **Validates: Requirements 1.5**

- [ ] 3. Checkpoint - Validar ledger service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Corrigir fluxo de transações pagas por outros
  - [ ] 4.1 Atualizar TransactionForm
    - Desabilitar seleção de conta quando payer_id != 'me'
    - Mostrar indicador visual de "Pago por outro"
    - Validar que account_id é null quando payer_id != 'me'
    - _Requirements: 4.1, 4.4_

  - [ ]* 4.2 Escrever property test para paid by others no account
    - **Property 5: Paid By Others No Account**
    - **Validates: Requirements 4.2**

  - [ ] 4.3 Atualizar TransactionService.createTransaction()
    - Se payer_id != 'me', definir account_id como null
    - Não atualizar saldo quando payer_id != 'me'
    - _Requirements: 4.2_

  - [ ] 4.4 Atualizar listagem de transações
    - Filtrar transações onde payer_id != user_id
    - Adicionar filtro "Pagas por mim" vs "Pagas por outros"
    - Diferenciar visualmente quem pagou
    - _Requirements: 5.2, 4.6, 4.7_

  - [ ]* 4.5 Escrever unit tests para transaction filtering
    - Testar filtro de payer_id
    - Testar exibição correta
    - _Requirements: 5.2_

- [ ] 5. Implementar Alert Service
  - [ ] 5.1 Criar modelo de dados Alert
    - Definir interface TypeScript
    - Criar enum AlertType
    - _Requirements: 11.7_

  - [ ] 5.2 Implementar checkNegativeBalances()
    - Buscar contas com saldo negativo
    - Criar alertas de NEGATIVE_BALANCE
    - _Requirements: 11.1_

  - [ ] 5.3 Implementar checkCreditLimits()
    - Buscar cartões com uso > 80% do limite
    - Criar alertas de CREDIT_LIMIT_WARNING
    - _Requirements: 11.2_

  - [ ]* 5.4 Escrever property test para alert threshold trigger
    - **Property 13: Alert Threshold Trigger**
    - **Validates: Requirements 11.2**

  - [ ] 5.5 Implementar checkDuplicates()
    - Detectar transações similares (valor, descrição, data ±3 dias)
    - Criar alertas de DUPLICATE_TRANSACTION
    - _Requirements: 11.3_

  - [ ] 5.6 Implementar checkExcessiveSpending()
    - Calcular média histórica por categoria
    - Comparar com gastos do mês atual
    - Criar alertas de EXCESSIVE_SPENDING
    - _Requirements: 11.4_

  - [ ] 5.7 Implementar checkUpcomingInstallments()
    - Buscar parcelas próximas do vencimento
    - Criar alertas de INSTALLMENT_DUE
    - _Requirements: 11.5_

  - [ ] 5.8 Implementar getAlerts() e markAsRead()
    - Buscar alertas do usuário
    - Filtrar por lidos/não lidos
    - Marcar como lido
    - _Requirements: 11.7_

  - [ ] 5.9 Criar componente AlertsPanel
    - Exibir alertas no dashboard
    - Agrupar por severidade
    - Permitir marcar como lido
    - _Requirements: 11.7_

  - [ ]* 5.10 Escrever unit tests para alert service
    - Testar cada tipo de alerta
    - Testar thresholds
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 6. Checkpoint - Validar alert service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implementar Projection Service
  - [ ] 7.1 Criar modelo de dados Projection
    - Definir interface TypeScript
    - Criar tipo ProjectionScenario
    - _Requirements: 15.1_

  - [ ] 7.2 Implementar getRecurringForMonth()
    - Buscar transações recorrentes
    - Calcular próxima ocorrência
    - _Requirements: 15.2_

  - [ ] 7.3 Implementar getInstallmentsForMonth()
    - Buscar parcelas futuras do mês
    - Filtrar por competence_date
    - _Requirements: 15.3_

  - [ ] 7.4 Implementar calculateAverageExpenses()
    - Calcular média dos últimos 3 meses por categoria
    - Usar SafeFinancialCalculator
    - _Requirements: 15.7_

  - [ ] 7.5 Implementar calculateProjection()
    - Combinar recorrentes + parcelas + média
    - Calcular saldo projetado
    - Definir nível de confiança
    - _Requirements: 15.1_

  - [ ]* 7.6 Escrever property test para projection non-negative
    - **Property 11: Projection Non-Negative**
    - **Validates: Requirements 15.5**

  - [ ] 7.7 Implementar simulateScenario()
    - Aplicar despesas/receitas adicionais
    - Recalcular projeção
    - _Requirements: 15.6_

  - [ ] 7.8 Implementar detectNegativeProjections()
    - Identificar meses com saldo negativo
    - Criar alertas de PROJECTED_NEGATIVE
    - _Requirements: 15.5_

  - [ ] 7.9 Criar componente ProjectionChart
    - Exibir gráfico de projeção
    - Mostrar breakdown (recorrentes, parcelas, média)
    - Destacar meses negativos
    - _Requirements: 15.4_

  - [ ]* 7.10 Escrever unit tests para projection service
    - Testar cálculo de projeção
    - Testar cenários
    - _Requirements: 15.1, 15.6_

- [ ] 8. Implementar Reconciliation Service
  - [ ] 8.1 Criar modelo de dados ReconciliationSession
    - Definir interface TypeScript
    - _Requirements: 16.1_

  - [ ] 8.2 Implementar startReconciliation()
    - Criar sessão de reconciliação
    - Calcular diferença inicial
    - _Requirements: 16.1, 16.3_

  - [ ] 8.3 Implementar reconcileTransaction()
    - Marcar transação como reconciliada
    - Registrar reconciled_at e reconciled_by
    - _Requirements: 16.2_

  - [ ]* 8.4 Escrever property test para reconciled immutability
    - **Property 10: Reconciled Immutability**
    - **Validates: Requirements 16.6**

  - [ ] 8.5 Implementar unreconcileTransaction()
    - Desmarcar reconciliação
    - Validar permissões
    - _Requirements: 16.6_

  - [ ] 8.6 Implementar calculateReconciliationDifference()
    - Somar transações reconciliadas
    - Comparar com saldo bancário
    - _Requirements: 16.3_

  - [ ] 8.7 Implementar generateReconciliationReport()
    - Listar transações reconciliadas e não reconciliadas
    - Mostrar diferença
    - Sugerir matches
    - _Requirements: 16.7_

  - [ ] 8.8 Criar componente ReconciliationPanel
    - Interface para reconciliação
    - Checkbox para marcar transações
    - Mostrar diferença em tempo real
    - _Requirements: 16.1, 16.4_

  - [ ]* 8.9 Escrever unit tests para reconciliation service
    - Testar cálculo de diferença
    - Testar marcação de reconciliação
    - _Requirements: 16.2, 16.3_

- [ ] 9. Checkpoint - Validar reconciliation service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implementar Export Service
  - [ ] 10.1 Criar modelo de dados ExportOptions
    - Definir interface TypeScript
    - _Requirements: 17.4_

  - [ ] 10.2 Implementar generateCSV()
    - Converter transações para CSV
    - Formatar valores monetários
    - Incluir cabeçalhos
    - _Requirements: 17.1, 17.7_

  - [ ]* 10.3 Escrever property test para export data completeness
    - **Property 12: Export Data Completeness**
    - **Validates: Requirements 17.6**

  - [ ] 10.4 Implementar generatePDF()
    - Usar biblioteca de PDF (jsPDF ou similar)
    - Formatar relatório
    - Incluir totais
    - _Requirements: 17.2_

  - [ ] 10.5 Implementar exportTransactions()
    - Buscar transações com filtros
    - Chamar gerador apropriado
    - Retornar Blob
    - _Requirements: 17.1, 17.4_

  - [ ] 10.6 Implementar exportLedger()
    - Buscar ledger completo
    - Incluir débitos e créditos
    - _Requirements: 17.3_

  - [ ] 10.7 Implementar exportTrialBalance()
    - Gerar trial balance
    - Exportar em formato tabular
    - _Requirements: 17.3_

  - [ ] 10.8 Criar componente ExportButton
    - Dropdown com opções de formato
    - Filtros de exportação
    - Download automático
    - _Requirements: 17.1, 17.2_

  - [ ]* 10.9 Escrever unit tests para export service
    - Testar geração de CSV
    - Testar formatação de valores
    - _Requirements: 17.7_

- [ ] 11. Fortalecer validações existentes
  - [ ] 11.1 Atualizar validateTransaction()
    - Adicionar validação de account_id obrigatório para pessoais
    - Validar que payer_id != 'me' implica account_id = null
    - _Requirements: 3.4, 4.2_

  - [ ]* 11.2 Escrever property test para transaction account requirement
    - **Property 4: Transaction Account Requirement**
    - **Validates: Requirements 3.4**

  - [ ] 11.3 Adicionar validação de splits
    - Validar soma de percentagens = 100%
    - Validar soma de valores <= total
    - _Requirements: 12.1, 12.2_

  - [ ]* 11.4 Escrever property test para split percentage sum
    - **Property 6: Split Percentage Sum**
    - **Validates: Requirements 12.1**

  - [ ]* 11.5 Escrever property test para split amount sum
    - **Property 7: Split Amount Sum**
    - **Validates: Requirements 12.2**

  - [ ] 11.6 Adicionar validação de parcelamentos
    - Validar competence_date correto
    - Validar series_id consistente
    - _Requirements: 13.2, 13.3_

  - [ ]* 11.7 Escrever property test para installment amount sum
    - **Property 8: Installment Amount Sum**
    - **Validates: Requirements 13.1**

  - [ ]* 11.8 Escrever property test para competence date consistency
    - **Property 9: Competence Date Consistency**
    - **Validates: Requirements 13.2**

  - [ ] 11.9 Adicionar validação de transferências
    - Validar ambas as contas não nulas
    - Validar contas diferentes
    - _Requirements: 3.3_

  - [ ]* 11.10 Escrever property test para transfer double account
    - **Property 15: Transfer Double Account**
    - **Validates: Requirements 3.3**

- [ ] 12. Implementar validação de integridade
  - [ ] 12.1 Criar IntegrityService
    - Definir interface para relatório de auditoria
    - _Requirements: 8.7_

  - [ ] 12.2 Implementar validateAccountBalances()
    - Calcular saldo a partir de transações
    - Comparar com saldo armazenado
    - Reportar discrepâncias
    - _Requirements: 8.1_

  - [ ]* 12.3 Escrever property test para account balance consistency
    - **Property 2: Account Balance Consistency**
    - **Validates: Requirements 2.6**

  - [ ] 12.4 Implementar detectOrphanTransactions()
    - Buscar transações sem conta válida
    - Buscar transações sem categoria válida
    - _Requirements: 8.3_

  - [ ] 12.5 Implementar validateInstallmentSeries()
    - Verificar que parcelas somam total
    - Verificar series_id consistente
    - _Requirements: 8.5_

  - [ ] 12.6 Implementar validateSplits()
    - Verificar que splits somam 100%
    - Verificar que valores somam total
    - _Requirements: 8.6_

  - [ ] 12.7 Criar componente IntegrityReport
    - Exibir relatório de auditoria
    - Agrupar por tipo de problema
    - Oferecer ações de correção
    - _Requirements: 8.7_

  - [ ]* 12.8 Escrever unit tests para integrity service
    - Testar detecção de inconsistências
    - Testar geração de relatório
    - _Requirements: 8.1, 8.3, 8.5, 8.6_

- [ ] 13. Checkpoint - Validar integrity service
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Atualizar UI para novos recursos
  - [ ] 14.1 Adicionar seção de Alertas no Dashboard
    - Mostrar alertas não lidos
    - Agrupar por severidade
    - Link para detalhes
    - _Requirements: 11.7_

  - [ ] 14.2 Adicionar seção de Projeções no Dashboard
    - Mostrar gráfico de projeção
    - Destacar meses negativos
    - Link para simulador
    - _Requirements: 15.4_

  - [ ] 14.3 Criar página de Reconciliação
    - Interface completa de reconciliação
    - Filtros e busca
    - Relatório de diferenças
    - _Requirements: 16.1, 16.4, 16.7_

  - [ ] 14.4 Adicionar botões de Exportação
    - Em página de transações
    - Em relatórios
    - Em ledger
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ] 14.5 Criar página de Auditoria
    - Exibir trial balance
    - Exibir ledger completo
    - Exibir relatório de integridade
    - _Requirements: 1.7, 8.7_

  - [ ]* 14.6 Escrever testes E2E para novos fluxos
    - Testar criação de transação paga por outro
    - Testar visualização de alertas
    - Testar reconciliação
    - Testar exportação
    - _Requirements: 4.1, 11.7, 16.1, 17.1_

- [ ] 15. Otimizações de performance
  - [ ] 15.1 Adicionar índices no banco de dados
    - Índice em ledger_entries(transaction_id)
    - Índice em ledger_entries(user_id, competence_date)
    - Índice em transactions(reconciled, user_id)
    - Índice em alerts(user_id, is_read)
    - _Requirements: 7.5_

  - [ ] 15.2 Configurar cache do React Query
    - staleTime: 30000 para queries
    - Invalidação após mutações
    - _Requirements: 7.4, 7.5_

  - [ ] 15.3 Implementar batch operations
    - Criar parcelas em batch
    - Criar splits em batch
    - Criar ledger entries em batch
    - _Requirements: 13.1_

  - [ ]* 15.4 Escrever testes de performance
    - Testar criação de 100 transações
    - Testar geração de trial balance com 1000 entradas
    - _Requirements: 7.5_

- [ ] 16. Documentação e migração
  - [ ] 16.1 Documentar novos serviços
    - JSDoc para todos os métodos públicos
    - Exemplos de uso
    - _Requirements: 10.7_

  - [ ] 16.2 Criar guia de migração
    - Passos para atualizar banco de dados
    - Regenerar ledger para transações antigas
    - Testar em ambiente de staging
    - _Requirements: 1.6_

  - [ ] 16.3 Criar guia do usuário
    - Como usar alertas
    - Como usar projeções
    - Como reconciliar
    - Como exportar
    - _Requirements: 11.7, 15.1, 16.1, 17.1_

- [ ] 17. Final checkpoint - Testes completos
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use SafeFinancialCalculator for ALL monetary calculations
- Maintain backward compatibility with existing data
- Test thoroughly before deploying to production
