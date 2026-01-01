# Implementation Plan: Double Entry MVP

## Overview

Este plano implementa as melhorias MVP para partidas dobradas, desabilitação de conta quando pago por terceiros, e interligação de dados. A implementação é feita em TypeScript/React com Supabase.

## Tasks

- [x] 1. Desabilitar campo de conta quando outro paga
  - [x] 1.1 Modificar TransactionForm para esconder campo de conta quando payerId !== 'me'
    - Adicionar variável `isPaidByOther = payerId !== 'me' && payerId !== ''`
    - Renderizar condicionalmente o campo de conta
    - Mostrar Alert explicativo quando conta estiver oculta
    - Limpar accountId quando payerId mudar para outro
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 1.2 Validar que account_id é null quando payer_id é de outro
    - Modificar handleSubmit para forçar account_id = undefined quando isPaidByOther
    - Adicionar validação no validationService
    - _Requirements: 1.2, 1.5, 1.6_

  - [ ]* 1.3 Escrever property test para conta desabilitada
    - **Property 1: Conta Desabilitada Quando Outro Paga**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6**

- [x] 2. Filtrar transações pagas por outros da lista principal
  - [x] 2.1 Modificar useTransactions para excluir transações com payer_id de outro
    - Adicionar filtro `.or('payer_id.is.null,payer_id.eq.${user.id}')`
    - Garantir que totais são calculados apenas com transações filtradas
    - _Requirements: 2.1, 2.7_

  - [ ]* 2.2 Escrever property test para filtro de transações
    - **Property 2: Transações Pagas por Outros Excluídas da Lista Principal**
    - **Validates: Requirements 2.1, 2.7**

- [x] 3. Exibir transações pagas por outros em Compartilhados
  - [x] 3.1 Criar hook useSharedDebts para calcular débitos com cada pessoa
    - Buscar transações onde payer_id != user_id
    - Agrupar por pessoa e calcular saldo devedor/credor
    - Retornar lista de SharedDebt com totais
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.2 Modificar SharedExpenses.tsx para exibir débitos
    - Adicionado suporte em useSharedFinances para transações com payer_id
    - Transações pagas por outros aparecem como DEBIT na fatura do membro
    - _Requirements: 2.2, 2.6_

  - [ ]* 3.3 Escrever property test para cálculo de débitos
    - **Property 3: Débitos Compartilhados Calculados Corretamente**
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [ ] 4. Checkpoint - Verificar funcionalidades de UI
  - Testar manualmente: criar transação com "Outro Pagou"
  - Verificar que campo de conta está oculto
  - Verificar que transação aparece em Compartilhados
  - Verificar que não aparece na lista principal de Transações
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Criar triggers para atualização automática de saldos
  - [x] 5.1 Criar migration SQL com triggers de INSERT
    - Trigger para decrementar saldo em despesas
    - Trigger para incrementar saldo em receitas
    - Trigger para transferências (débito origem, crédito destino)
    - Ignorar transações com payer_id de outro
    - ✅ Aplicado ao projeto vrrcagukyfnlhxuvnssp (supabase-seubolsointeligente)
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 5.2 Criar trigger de DELETE para reverter saldos
    - Reverter operações do trigger de INSERT
    - ✅ Aplicado ao projeto vrrcagukyfnlhxuvnssp
    - _Requirements: 3.4_

  - [x] 5.3 Criar função de recálculo de saldo
    - Função recalculate_account_balance(p_account_id UUID) criada
    - Útil para correção de inconsistências
    - ✅ Aplicado ao projeto vrrcagukyfnlhxuvnssp
    - _Requirements: 3.7_

  - [ ]* 5.4 Escrever property test para atualização de saldos
    - **Property 4: Atualização de Saldo por Tipo de Transação**
    - **Property 5: Reversão de Saldo ao Excluir**
    - **Property 6: Transação Paga por Outro Não Afeta Saldo**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.7**

- [x] 6. Validação de integridade contábil
  - [x] 6.1 Adicionar validação de transação pessoal requer conta
    - Modificar validationService para exigir account_id quando domain=PERSONAL e payer_id é próprio
    - Mostrar erro claro no formulário
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Criar função de verificação de integridade do ledger
    - Verificar que soma de débitos = soma de créditos
    - Verificar que trial balance fecha em zero
    - Detectar transações órfãs
    - _Requirements: 4.3, 4.5_

  - [ ]* 6.3 Escrever property tests para integridade contábil
    - **Property 7: Transação Pessoal Requer Conta**
    - **Property 8: Integridade Contábil - Débitos Iguais a Créditos**
    - **Property 9: Trial Balance Fecha em Zero**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**

- [ ] 7. Checkpoint - Verificar triggers e integridade
  - Aplicar migrations no Supabase
  - Testar criação de transação e verificar saldo atualizado
  - Testar exclusão e verificar saldo revertido
  - Verificar integridade do ledger
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Indicadores visuais de pagador
  - [x] 8.1 Adicionar badge de pagador na lista de transações
    - Mostrar "Você pagou" quando payer_id = user_id e is_shared = true
    - Mostrar "Pago por [nome]" quando payer_id != user_id
    - Usar cores diferentes para diferenciar
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.2 Mostrar divisão completa nos detalhes da transação
    - Exibir lista de splits com nome e valor de cada pessoa
    - Mostrar quanto cada pessoa deve/recebe
    - _Requirements: 5.5, 5.6_

- [x] 9. Garantir consistência de dados entre páginas
  - [x] 9.1 Invalidar caches corretos após mutações
    - Após criar transação: invalidar transactions, accounts, financial-summary, shared-transactions-with-splits, paid-by-others-transactions
    - Após excluir transação: mesmas invalidações
    - _Requirements: 6.1, 6.5_

  - [x] 9.2 Verificar consistência de totais
    - Dashboard deve mostrar mesmos totais que soma de transações
    - Saldo de conta deve ser consistente em todas as páginas
    - _Requirements: 6.2, 6.3, 6.6_

  - [ ]* 9.3 Escrever property test para consistência
    - **Property 10: Consistência de Saldos Entre Páginas**
    - **Validates: Requirements 6.2, 6.3, 6.6**

- [x] 10. Garantir precisão em cálculos financeiros
  - [x] 10.1 Verificar uso de SafeFinancialCalculator em todos os cálculos
    - Revisado useTransactions, validationService
    - SafeFinancialCalculator usado para parcelamento e splits
    - _Requirements: 7.1_

  - [x] 10.2 Corrigir distribuição de centavos em splits e parcelas
    - SafeFinancialCalculator.distributeSplits ajusta último split para diferença de arredondamento
    - Validação garante que soma = total original
    - _Requirements: 7.2, 7.3_

  - [ ]* 10.3 Escrever property tests para cálculos precisos
    - **Property 11: Distribuição Precisa de Valores em Splits**
    - **Property 12: Distribuição Precisa de Parcelas**
    - **Property 13: Arredondamento Correto**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**

- [ ] 11. Checkpoint Final - Testes completos
  - Executar todos os property tests
  - Testar fluxo completo: criar transação → verificar saldo → excluir → verificar reversão
  - Testar transação paga por outro → verificar em compartilhados
  - Verificar consistência entre Dashboard, Contas e Transações
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais (property tests)
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Property tests usam fast-check com mínimo 100 iterações
- Migrations SQL devem ser aplicadas no Supabase Dashboard ou via CLI

## Correções Aplicadas

- **trip_participant_budgets 404**: Corrigido em `useTrips.ts` - a tabela não existe, o código agora usa `trip_members.personal_budget` que é a coluna correta
- **Triggers de saldo**: Aplicados ao projeto correto `vrrcagukyfnlhxuvnssp` (supabase-seubolsointeligente)

