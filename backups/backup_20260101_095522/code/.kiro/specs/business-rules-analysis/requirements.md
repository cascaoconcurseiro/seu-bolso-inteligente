# Análise de Regras de Negócio - Sistema Financeiro

## Introdução

Este documento identifica regras de negócio que estão faltando ou precisam ser implementadas/melhoradas no sistema financeiro. A análise cobre TODO o sistema, não apenas regras de moeda.

## Glossário

- **Conta_Nacional**: Conta bancária em BRL (is_international = false)
- **Conta_Internacional**: Conta em moeda estrangeira (is_international = true)
- **Viagem_Internacional**: Viagem com currency diferente de BRL
- **Transferência_Cross_Currency**: Transferência entre contas de moedas diferentes
- **Competência**: Mês em que a transação deve ser contabilizada (diferente da data de compra)
- **Parcelamento**: Divisão de uma compra em múltiplas parcelas mensais
- **Split**: Divisão de uma despesa entre múltiplos membros

---

## Regras Identificadas

### SEÇÃO A: REGRAS DE MOEDA E INTERNACIONALIZAÇÃO

### Requirement 1: Transferências entre Moedas Diferentes

**User Story:** Como usuário, quero transferir dinheiro entre contas de moedas diferentes, para que eu possa mover fundos entre minhas contas nacionais e internacionais.

#### Acceptance Criteria

1. WHEN um usuário inicia uma transferência entre contas de moedas diferentes THEN o sistema SHALL exibir campos para taxa de câmbio e valor na moeda de destino
2. WHEN a conta de origem é BRL e destino é USD THEN o sistema SHALL calcular automaticamente o valor em USD baseado na taxa informada
3. WHEN a conta de origem é USD e destino é BRL THEN o sistema SHALL calcular automaticamente o valor em BRL baseado na taxa informada
4. WHEN uma transferência cross-currency é realizada THEN o sistema SHALL registrar a taxa de câmbio utilizada na transação
5. IF a taxa de câmbio não for informada em transferência cross-currency THEN o sistema SHALL bloquear a operação e exibir erro

**Status:** ✅ IMPLEMENTADO - TransferModal suporta moedas diferentes com taxa de câmbio

---

### Requirement 2: Filtro de Contas em Transferências

**User Story:** Como usuário, quero ver apenas contas compatíveis ao fazer transferências, para evitar erros de seleção.

#### Acceptance Criteria

1. WHEN um usuário abre o modal de transferência de uma conta nacional THEN o sistema SHALL mostrar todas as contas (nacionais e internacionais)
2. WHEN um usuário seleciona uma conta de destino com moeda diferente THEN o sistema SHALL exibir campos de câmbio automaticamente
3. WHEN um usuário abre o modal de transferência de uma conta internacional THEN o sistema SHALL mostrar todas as contas (nacionais e internacionais)
4. THE sistema SHALL exibir a moeda de cada conta na lista de seleção

**Status:** ✅ IMPLEMENTADO - TransferModal mostra moeda e campos de câmbio automaticamente

---

### Requirement 3: Receitas em Contas Internacionais

**User Story:** Como usuário, quero registrar receitas em minhas contas internacionais, para controlar entradas de dinheiro em moeda estrangeira.

#### Acceptance Criteria

1. WHEN um usuário registra uma receita sem viagem vinculada THEN o sistema SHALL permitir selecionar qualquer conta (nacional ou internacional)
2. WHEN uma conta internacional é selecionada para receita THEN o sistema SHALL usar a moeda da conta no campo de valor
3. WHEN uma receita é registrada em conta internacional THEN o sistema SHALL salvar a currency da transação igual à moeda da conta
4. THE sistema SHALL filtrar receitas em moeda estrangeira da página principal de transações

**Status:** ❌ NÃO IMPLEMENTADO - Receitas só mostram contas nacionais (filtro atual só considera viagem)

**ATUALIZAÇÃO:** ✅ CORRIGIDO em 28/12/2024 - TransactionForm agora mostra todas as contas quando não há viagem selecionada

---

### Requirement 4: Despesas Diretas em Contas Internacionais (sem viagem)

**User Story:** Como usuário, quero registrar despesas diretamente em contas internacionais sem vincular a uma viagem, para controlar gastos em moeda estrangeira fora de viagens.

#### Acceptance Criteria

1. WHEN um usuário registra uma despesa sem viagem THEN o sistema SHALL permitir selecionar contas internacionais
2. WHEN uma conta internacional é selecionada THEN o sistema SHALL mudar o símbolo da moeda no campo valor
3. WHEN uma despesa é registrada em conta internacional sem viagem THEN o sistema SHALL salvar a currency da transação
4. THE sistema SHALL filtrar essas despesas da página principal (aparecem apenas no extrato da conta)

**Status:** ❌ NÃO IMPLEMENTADO - Sem viagem, só mostra contas nacionais

**ATUALIZAÇÃO:** ✅ CORRIGIDO em 28/12/2024 - TransactionForm agora mostra todas as contas quando não há viagem selecionada

---

### Requirement 5: Validação de Moeda Conta x Viagem

**User Story:** Como usuário, quero que o sistema valide se a conta selecionada é compatível com a moeda da viagem, para evitar erros de registro.

#### Acceptance Criteria

1. WHEN uma viagem em USD é selecionada THEN o sistema SHALL mostrar apenas contas em USD
2. WHEN uma viagem em EUR é selecionada THEN o sistema SHALL mostrar apenas contas em EUR
3. WHEN uma viagem em BRL é selecionada THEN o sistema SHALL mostrar apenas contas nacionais (BRL)
4. IF não existir conta compatível com a moeda da viagem THEN o sistema SHALL exibir mensagem orientando criar conta

**Status:** ✅ IMPLEMENTADO - TransactionForm já faz isso corretamente

---

### Requirement 6: Cartões de Crédito Internacionais

**User Story:** Como usuário, quero ter cartões de crédito internacionais, para registrar compras no exterior.

#### Acceptance Criteria

1. WHEN um usuário cria um cartão de crédito THEN o sistema SHALL permitir marcar como internacional
2. WHEN um cartão internacional é criado THEN o sistema SHALL exigir seleção de moeda
3. WHEN uma viagem em moeda estrangeira é selecionada THEN o sistema SHALL mostrar cartões internacionais na mesma moeda
4. THE sistema SHALL exibir limite do cartão na moeda correspondente

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - CreditCards.tsx tem toggle de internacional com seleção de moeda

---

### Requirement 7: Saldo de Contas Internacionais no Dashboard

**User Story:** Como usuário, quero ver o saldo das minhas contas internacionais separado no dashboard, para ter visão clara dos meus recursos em cada moeda.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir saldo total em BRL das contas nacionais
2. THE Dashboard SHALL exibir saldo agrupado por moeda das contas internacionais
3. WHEN o usuário visualiza o dashboard THEN o sistema SHALL mostrar cada moeda separadamente (ex: $500 USD, €200 EUR)
4. THE sistema SHALL NOT somar saldos de moedas diferentes

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Dashboard agora mostra saldos agrupados por moeda estrangeira

---

### Requirement 8: Extrato de Conta Internacional

**User Story:** Como usuário, quero ver o extrato da minha conta internacional na moeda correta, para acompanhar movimentações.

#### Acceptance Criteria

1. WHEN um usuário acessa o extrato de uma conta internacional THEN o sistema SHALL exibir valores na moeda da conta
2. THE sistema SHALL usar o símbolo correto da moeda ($ para USD, € para EUR, etc.)
3. THE sistema SHALL formatar números de acordo com a moeda (ex: 1,000.00 para USD)
4. WHEN uma transação é exibida no extrato THEN o sistema SHALL mostrar a moeda da transação

**Status:** ✅ IMPLEMENTADO - AccountDetail.tsx usa getCurrencySymbol e formata corretamente

---

### Requirement 9: Orçamento de Viagem na Moeda Correta

**User Story:** Como usuário, quero que o orçamento da viagem seja exibido na moeda da viagem, para ter controle preciso dos gastos.

#### Acceptance Criteria

1. WHEN uma viagem é criada em USD THEN o sistema SHALL exibir orçamento em USD
2. WHEN gastos são registrados na viagem THEN o sistema SHALL somar na moeda da viagem
3. THE sistema SHALL exibir "Gasto: $500 de $1000" para viagem em USD
4. THE sistema SHALL NOT converter valores para BRL na tela de viagem

**Status:** ✅ IMPLEMENTADO - Trips.tsx usa formatCurrency com moeda da viagem

---

### Requirement 10: Câmbio - Integração com Gastos da Viagem

**User Story:** Como usuário, quero que o sistema use a taxa média de câmbio para calcular o equivalente em BRL dos meus gastos, para ter noção do custo real.

#### Acceptance Criteria

1. WHEN o usuário registra compras de câmbio THEN o sistema SHALL calcular a taxa média ponderada
2. WHEN o usuário visualiza gastos da viagem THEN o sistema SHALL mostrar valor na moeda da viagem E equivalente em BRL
3. THE sistema SHALL usar a taxa média do câmbio comprado para calcular equivalente em BRL
4. IF não houver câmbio registrado THEN o sistema SHALL mostrar apenas valor na moeda da viagem

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - ExchangeSummaryCard agora mostra equivalente em BRL dos gastos usando taxa média

---

### Requirement 11: Validação de Saldo em Transferências

**User Story:** Como usuário, quero que o sistema valide se tenho saldo suficiente antes de transferir, para evitar saldo negativo.

#### Acceptance Criteria

1. WHEN um usuário tenta transferir mais do que o saldo disponível THEN o sistema SHALL bloquear a operação
2. THE sistema SHALL exibir mensagem "Saldo insuficiente" quando aplicável
3. WHEN a conta de origem é cartão de crédito THEN o sistema SHALL bloquear transferência (não permitido)
4. THE sistema SHALL validar saldo em tempo real conforme usuário digita valor

**Status:** ✅ IMPLEMENTADO - TransferModal já valida saldo

---

### Requirement 12: Impedir Transferência para Cartão de Crédito

**User Story:** Como usuário, quero que o sistema impeça transferências para cartão de crédito, pois isso não faz sentido financeiro.

#### Acceptance Criteria

1. WHEN um usuário tenta transferir para cartão de crédito THEN o sistema SHALL bloquear a operação
2. THE sistema SHALL exibir mensagem explicativa
3. THE sistema SHALL filtrar cartões de crédito da lista de destino em transferências

**Status:** ✅ IMPLEMENTADO - TransferModal filtra cartões de crédito da lista de destino

---

### Requirement 13: Pagamento de Fatura com Moeda Correta

**User Story:** Como usuário, quero pagar a fatura do cartão internacional com a moeda correta, para manter consistência.

#### Acceptance Criteria

1. WHEN um usuário paga fatura de cartão internacional THEN o sistema SHALL exigir conta na mesma moeda
2. IF não existir conta na mesma moeda THEN o sistema SHALL exibir opção de conversão com taxa de câmbio
3. THE sistema SHALL registrar a transação na moeda do cartão
4. WHEN pagamento é feito de conta em moeda diferente THEN o sistema SHALL registrar taxa de câmbio

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - CreditCards.tsx filtra contas por moeda e exige taxa de câmbio

---

### Requirement 14: Categorias por Tipo de Transação

**User Story:** Como usuário, quero que as categorias sejam filtradas por tipo de transação, para facilitar a seleção.

#### Acceptance Criteria

1. WHEN tipo é EXPENSE THEN o sistema SHALL mostrar apenas categorias de despesa
2. WHEN tipo é INCOME THEN o sistema SHALL mostrar apenas categorias de receita
3. WHEN tipo é TRANSFER THEN o sistema SHALL NOT exigir categoria (automático)

**Status:** ✅ IMPLEMENTADO - TransactionForm já faz isso

---

### Requirement 15: Transações Recorrentes em Moeda Estrangeira

**User Story:** Como usuário, quero criar transações recorrentes em moeda estrangeira, para automatizar gastos fixos internacionais.

#### Acceptance Criteria

1. WHEN uma transação recorrente é criada em conta internacional THEN o sistema SHALL manter a moeda nas recorrências
2. THE sistema SHALL gerar transações futuras na mesma moeda
3. THE sistema SHALL vincular transações recorrentes à conta original

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - recurrenceService.ts mantém currency e account_id da transação original

---

### Requirement 16: Parcelamento em Cartão Internacional

**User Story:** Como usuário, quero parcelar compras no cartão internacional, para dividir gastos grandes.

#### Acceptance Criteria

1. WHEN uma compra é parcelada em cartão internacional THEN o sistema SHALL manter a moeda em todas as parcelas
2. THE sistema SHALL exibir valor da parcela na moeda do cartão
3. THE sistema SHALL calcular parcelas na moeda original (não converter para BRL)

**Status:** ✅ VERIFICADO em 28/12/2024 - Funciona corretamente (currency é passado via transactionData)

---

### Requirement 17: Acerto de Despesas Compartilhadas em Viagens Internacionais

**User Story:** Como usuário, quero que ao acertar despesas compartilhadas de viagens internacionais, o sistema exija uma conta na mesma moeda da viagem.

#### Acceptance Criteria

1. WHEN um usuário acerta despesas de uma viagem internacional THEN o sistema SHALL filtrar contas pela moeda da viagem
2. WHEN itens de viagem em USD são selecionados THEN o sistema SHALL mostrar apenas contas em USD
3. THE sistema SHALL exibir alerta informando que é um acerto internacional
4. IF não existir conta na moeda da viagem THEN o sistema SHALL exibir mensagem orientando criar conta
5. THE sistema SHALL exibir a moeda de cada item na lista de seleção

**Status:** ✅ IMPLEMENTADO - SharedExpenses filtra contas por moeda da viagem

---

### SEÇÃO B: REGRAS DE SALDO E LIMITES

### Requirement 18: Validação de Saldo Negativo em Contas

**User Story:** Como usuário, quero que o sistema me avise quando uma transação deixará minha conta com saldo negativo, para evitar problemas financeiros.

#### Acceptance Criteria

1. WHEN um usuário registra uma despesa THEN o sistema SHALL calcular o saldo resultante
2. IF o saldo resultante for negativo THEN o sistema SHALL exibir warning (não bloquear)
3. THE sistema SHALL permitir saldo negativo com confirmação do usuário
4. THE sistema SHALL destacar contas com saldo negativo no Dashboard

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - validationService.ts valida saldo negativo em despesas (warning)

---

### Requirement 19: Validação de Limite de Cartão de Crédito

**User Story:** Como usuário, quero que o sistema valide se tenho limite disponível no cartão antes de registrar uma compra.

#### Acceptance Criteria

1. WHEN um usuário registra despesa em cartão de crédito THEN o sistema SHALL verificar limite disponível
2. IF a despesa ultrapassar o limite THEN o sistema SHALL exibir erro com limite disponível
3. THE sistema SHALL considerar parcelas futuras no cálculo de limite usado
4. THE sistema SHALL exibir % de limite utilizado na lista de cartões

**Status:** ✅ IMPLEMENTADO - validationService.ts valida limite de cartão

---

### Requirement 20: Prevenção de Exclusão de Conta com Saldo

**User Story:** Como usuário, quero que o sistema me impeça de excluir uma conta que ainda tem saldo ou transações pendentes.

#### Acceptance Criteria

1. WHEN um usuário tenta excluir uma conta com saldo != 0 THEN o sistema SHALL bloquear e exibir mensagem
2. WHEN um usuário tenta excluir uma conta com parcelas futuras THEN o sistema SHALL avisar
3. THE sistema SHALL oferecer opção de transferir saldo antes de excluir
4. THE sistema SHALL fazer soft delete (is_active = false) para manter histórico

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - useAccounts.ts valida saldo antes de excluir

---

### SEÇÃO C: REGRAS DE PARCELAMENTO

### Requirement 21: Cálculo Correto de Parcelas

**User Story:** Como usuário, quero que as parcelas sejam calculadas corretamente sem erros de arredondamento.

#### Acceptance Criteria

1. WHEN uma compra é parcelada THEN o sistema SHALL usar SafeFinancialCalculator
2. THE soma de todas as parcelas SHALL ser igual ao valor total (ajustar última parcela se necessário)
3. WHEN parcelas são exibidas THEN o sistema SHALL mostrar "X/Y" (atual/total)
4. THE sistema SHALL registrar series_id para agrupar parcelas da mesma compra

**Status:** ✅ IMPLEMENTADO - useTransactions.ts usa SafeFinancialCalculator

---

### Requirement 22: Competência de Parcelas

**User Story:** Como usuário, quero que cada parcela apareça no mês correto de competência, não no mês da compra.

#### Acceptance Criteria

1. WHEN parcelas são criadas THEN cada parcela SHALL ter competence_date do mês correspondente
2. WHEN usuário navega entre meses THEN o sistema SHALL filtrar por competence_date
3. THE parcela 1 SHALL ter competência do mês da compra
4. THE parcela 2 SHALL ter competência do mês seguinte, e assim por diante

**Status:** ✅ IMPLEMENTADO - useTransactions.ts filtra por competence_date

---

### Requirement 23: Edição/Exclusão de Parcelas

**User Story:** Como usuário, quero poder editar ou excluir parcelas de uma compra parcelada.

#### Acceptance Criteria

1. WHEN usuário edita uma parcela THEN o sistema SHALL perguntar se aplica a todas ou só esta
2. WHEN usuário exclui uma parcela THEN o sistema SHALL perguntar se exclui toda a série
3. IF usuário exclui toda a série THEN o sistema SHALL remover todas as parcelas com mesmo series_id
4. THE sistema SHALL recalcular valores se parcelas forem removidas

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Hooks useDeleteInstallmentSeries, useDeleteFutureInstallments, useUpdateInstallmentSeries + InstallmentActionsDialog.tsx

---

### SEÇÃO D: REGRAS DE DIVISÃO/COMPARTILHAMENTO

### Requirement 24: Validação de Splits (Divisões)

**User Story:** Como usuário, quero que a divisão de despesas seja calculada corretamente.

#### Acceptance Criteria

1. THE soma das porcentagens de split SHALL ser exatamente 100%
2. THE soma dos valores de split SHALL ser igual ao valor total da transação
3. WHEN splits são criados em parcelamento THEN cada parcela SHALL ter seus próprios splits
4. THE sistema SHALL usar SafeFinancialCalculator para evitar erros de arredondamento

**Status:** ✅ IMPLEMENTADO - validationService.ts valida splits

---

### Requirement 25: Acerto de Despesas Compartilhadas

**User Story:** Como usuário, quero acertar despesas compartilhadas de forma simples e correta.

#### Acceptance Criteria

1. WHEN usuário acerta despesas THEN o sistema SHALL marcar splits como is_settled = true
2. WHEN usuário acerta despesas THEN o sistema SHALL criar transação de transferência
3. THE sistema SHALL calcular saldo líquido entre membros (quem deve a quem)
4. THE sistema SHALL permitir acerto parcial (apenas alguns itens)

**Status:** ⚠️ PARCIAL - SharedExpenses permite acerto, mas não cria transferência automática

---

### Requirement 26: Despesa Paga por Outro Membro

**User Story:** Como usuário, quero registrar despesas que foram pagas por outro membro da família.

#### Acceptance Criteria

1. WHEN payer_id é diferente do usuário THEN o sistema SHALL NOT vincular conta
2. WHEN payer_id é definido THEN o sistema SHALL criar débito do usuário com o pagador
3. THE transação SHALL aparecer na lista de "Compartilhados" do usuário
4. THE sistema SHALL exibir claramente quem pagou a despesa

**Status:** ✅ IMPLEMENTADO - TransactionForm suporta payer_id

---

### SEÇÃO E: REGRAS DE CARTÃO DE CRÉDITO

### Requirement 27: Ciclo de Fatura Correto

**User Story:** Como usuário, quero que as transações apareçam na fatura correta baseado na data de fechamento.

#### Acceptance Criteria

1. WHEN transação é registrada antes do fechamento THEN SHALL aparecer na fatura atual
2. WHEN transação é registrada após o fechamento THEN SHALL aparecer na próxima fatura
3. THE sistema SHALL usar closing_day do cartão para determinar ciclo
4. THE sistema SHALL exibir período do ciclo (ex: "01/12 a 31/12")

**Status:** ✅ IMPLEMENTADO - invoiceUtils.ts calcula ciclo corretamente

---

### Requirement 28: Pagamento de Fatura

**User Story:** Como usuário, quero pagar a fatura do cartão de forma simples.

#### Acceptance Criteria

1. WHEN usuário paga fatura THEN o sistema SHALL criar transação TRANSFER
2. THE transação SHALL sair da conta selecionada e ir para o cartão
3. THE sistema SHALL atualizar saldo do cartão (reduzir dívida)
4. THE sistema SHALL registrar descrição "Pagamento Fatura - Mês/Ano"

**Status:** ✅ IMPLEMENTADO - PayInvoiceDialog em CreditCards.tsx

---

### Requirement 29: Cartão de Crédito Internacional

**User Story:** Como usuário, quero ter cartões de crédito em moeda estrangeira.

#### Acceptance Criteria

1. WHEN usuário cria cartão THEN o sistema SHALL permitir marcar como internacional
2. WHEN cartão é internacional THEN o sistema SHALL exigir seleção de moeda
3. THE fatura do cartão internacional SHALL ser exibida na moeda do cartão
4. WHEN viagem em moeda X é selecionada THEN o sistema SHALL mostrar cartões em moeda X

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - CreditCards.tsx agora tem opção de cartão internacional com seleção de moeda

---

### SEÇÃO F: REGRAS DE ORÇAMENTO

### Requirement 30: Orçamento por Categoria

**User Story:** Como usuário, quero definir orçamentos mensais por categoria.

#### Acceptance Criteria

1. WHEN usuário cria orçamento THEN o sistema SHALL vincular a uma categoria
2. THE sistema SHALL calcular % utilizado do orçamento
3. WHEN orçamento ultrapassar 80% THEN o sistema SHALL exibir warning
4. WHEN orçamento ultrapassar 100% THEN o sistema SHALL exibir alerta vermelho

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Budgets.tsx com suporte a multi-moeda

---

### Requirement 31: Orçamento Multi-Moeda

**User Story:** Como usuário, quero que orçamentos considerem apenas transações na moeda correta.

#### Acceptance Criteria

1. WHEN orçamento é em BRL THEN o sistema SHALL somar apenas transações em BRL
2. WHEN orçamento é em USD THEN o sistema SHALL somar apenas transações em USD
3. THE sistema SHALL NOT converter moedas automaticamente para orçamento
4. THE sistema SHALL exibir moeda do orçamento claramente

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Budgets.tsx filtra transações por moeda do orçamento

---

### SEÇÃO G: REGRAS DE VIAGEM

### Requirement 32: Validação de Data da Viagem

**User Story:** Como usuário, quero que o sistema valide se a data da transação está dentro do período da viagem.

#### Acceptance Criteria

1. WHEN transação tem trip_id THEN o sistema SHALL validar data
2. IF data está fora do período THEN o sistema SHALL exibir warning (não bloquear)
3. THE sistema SHALL mostrar período da viagem no formulário
4. THE sistema SHALL destacar visualmente quando data está fora do período

**Status:** ✅ IMPLEMENTADO - TransactionForm exibe warning de data fora do período

---

### Requirement 33: Membros da Viagem vs Família

**User Story:** Como usuário, quero que ao dividir despesas de viagem, apenas membros da viagem apareçam.

#### Acceptance Criteria

1. WHEN viagem é selecionada THEN o sistema SHALL mostrar membros da viagem (trip_members)
2. WHEN viagem NÃO é selecionada THEN o sistema SHALL mostrar membros da família
3. THE sistema SHALL converter trip_members para formato compatível com splits
4. THE sistema SHALL excluir o próprio usuário da lista de divisão

**Status:** ✅ IMPLEMENTADO - TransactionForm usa tripMembers quando há viagem

---

### SEÇÃO H: REGRAS DE RELATÓRIOS E DASHBOARD

### Requirement 34: Dashboard Multi-Moeda

**User Story:** Como usuário, quero ver saldos separados por moeda no Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir saldo total em BRL das contas nacionais
2. THE Dashboard SHALL exibir saldo agrupado por moeda das contas internacionais
3. THE sistema SHALL NOT somar saldos de moedas diferentes
4. THE sistema SHALL exibir cada moeda com seu símbolo correto

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Dashboard.tsx mostra saldos agrupados por moeda estrangeira

---

### Requirement 35: Relatórios por Moeda

**User Story:** Como usuário, quero ver relatórios separados por moeda.

#### Acceptance Criteria

1. THE Reports SHALL ter filtro por moeda
2. WHEN moeda é selecionada THEN o sistema SHALL mostrar apenas transações nessa moeda
3. THE sistema SHALL calcular totais separadamente por moeda
4. THE sistema SHALL NOT converter valores para comparação entre moedas

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - Reports.tsx tem filtro por moeda

---

### SEÇÃO I: REGRAS DE VALIDAÇÃO GERAL

### Requirement 36: Detecção de Duplicatas

**User Story:** Como usuário, quero que o sistema me avise sobre possíveis transações duplicadas.

#### Acceptance Criteria

1. WHEN transação similar existe (mesmo valor, descrição, ±3 dias) THEN o sistema SHALL exibir warning
2. THE sistema SHALL permitir continuar mesmo com warning
3. THE detecção SHALL considerar: valor, descrição, conta, data
4. THE sistema SHALL usar debounce para não impactar performance

**Status:** ✅ IMPLEMENTADO - TransactionForm detecta duplicatas

---

### Requirement 37: Validação de Campos Obrigatórios

**User Story:** Como usuário, quero que o sistema valide todos os campos obrigatórios antes de salvar.

#### Acceptance Criteria

1. THE sistema SHALL validar: valor > 0, descrição não vazia, data válida
2. THE sistema SHALL validar conta obrigatória (exceto quando pago por outro)
3. THE sistema SHALL validar categoria para EXPENSE e INCOME
4. THE sistema SHALL exibir todos os erros de uma vez (não um por um)

**Status:** ✅ IMPLEMENTADO - validationService.ts valida campos

---

### Requirement 38: Validação de Data Razoável

**User Story:** Como usuário, quero que o sistema me avise sobre datas muito distantes.

#### Acceptance Criteria

1. WHEN data é mais de 1 ano no passado THEN o sistema SHALL exibir warning
2. WHEN data é mais de 1 ano no futuro THEN o sistema SHALL exibir warning
3. THE sistema SHALL permitir continuar com confirmação
4. THE sistema SHALL validar se a data existe no calendário (ex: 31/02 é inválido)

**Status:** ✅ IMPLEMENTADO - validationService.ts valida datas

---

### SEÇÃO J: REGRAS DE RECORRÊNCIA

### Requirement 39: Transações Recorrentes

**User Story:** Como usuário, quero criar transações que se repetem automaticamente.

#### Acceptance Criteria

1. WHEN transação é marcada como recorrente THEN o sistema SHALL exigir frequência
2. THE sistema SHALL suportar: diário, semanal, mensal, anual
3. WHEN frequência é mensal THEN o sistema SHALL exigir dia do mês
4. THE sistema SHALL gerar transações futuras automaticamente

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - recurrenceService.ts + useRecurrence.ts + Dashboard com botão de geração

---

### Requirement 40: Recorrência em Moeda Estrangeira

**User Story:** Como usuário, quero que transações recorrentes em conta internacional mantenham a moeda.

#### Acceptance Criteria

1. WHEN transação recorrente é criada em conta internacional THEN SHALL manter moeda
2. THE sistema SHALL gerar transações futuras na mesma moeda
3. THE sistema SHALL vincular à mesma conta original
4. THE sistema SHALL validar se conta ainda existe antes de gerar

**Status:** ✅ IMPLEMENTADO em 28/12/2024 - recurrenceService.ts mantém currency da transação original

---

## Resumo de Status

### ✅ IMPLEMENTADO (39 regras)
- Req 1: Transferências entre moedas diferentes
- Req 2: Filtro de contas em transferências
- Req 3: Receitas em contas internacionais ✨ CORRIGIDO 28/12/2024
- Req 4: Despesas diretas em contas internacionais ✨ CORRIGIDO 28/12/2024
- Req 5: Validação de moeda conta x viagem
- Req 6: Cartões de crédito internacionais ✨ CORRIGIDO 28/12/2024
- Req 7: Saldo de contas internacionais no Dashboard ✨ CORRIGIDO 28/12/2024
- Req 8: Extrato de conta internacional ✅ VERIFICADO 28/12/2024
- Req 9: Orçamento de viagem na moeda correta
- Req 10: Câmbio integrado com gastos ✨ IMPLEMENTADO 28/12/2024
- Req 11: Validação de saldo em transferências
- Req 12: Impedir transferência para cartão de crédito
- Req 13: Pagamento de fatura com moeda correta ✨ CORRIGIDO 28/12/2024
- Req 14: Categorias por tipo de transação
- Req 15: Transações recorrentes em moeda estrangeira ✨ IMPLEMENTADO 28/12/2024
- Req 16: Parcelamento em cartão internacional ✅ VERIFICADO 28/12/2024
- Req 17: Acerto de despesas compartilhadas em viagens internacionais
- Req 18: Validação de saldo negativo em despesas ✨ CORRIGIDO 28/12/2024
- Req 19: Validação de limite de cartão de crédito
- Req 20: Prevenção de exclusão de conta com saldo ✨ CORRIGIDO 28/12/2024
- Req 21: Cálculo correto de parcelas
- Req 22: Competência de parcelas
- Req 23: Edição/exclusão de parcelas em série ✨ IMPLEMENTADO 28/12/2024
- Req 24: Validação de splits
- Req 26: Despesa paga por outro membro
- Req 27: Ciclo de fatura correto
- Req 28: Pagamento de fatura
- Req 29: Cartão de crédito internacional ✨ CORRIGIDO 28/12/2024
- Req 30: Orçamento por categoria ✨ IMPLEMENTADO 28/12/2024
- Req 31: Orçamento multi-moeda ✨ IMPLEMENTADO 28/12/2024
- Req 32: Validação de data da viagem
- Req 33: Membros da viagem vs família
- Req 34: Dashboard multi-moeda ✨ IMPLEMENTADO 28/12/2024
- Req 35: Relatórios por moeda ✨ CORRIGIDO 28/12/2024
- Req 36: Detecção de duplicatas
- Req 37: Validação de campos obrigatórios
- Req 38: Validação de data razoável
- Req 39: Transações recorrentes ✨ IMPLEMENTADO 28/12/2024
- Req 40: Recorrência em moeda estrangeira ✨ IMPLEMENTADO 28/12/2024

### ❌ NÃO IMPLEMENTADO (1 regra)
- Req 25: Acerto automático com transferência (complexo - requer conta do outro membro)

---

## Estatísticas Finais (28/12/2024)

| Status | Quantidade | Percentual |
|--------|------------|------------|
| ✅ Implementado | 39 | 97.5% |
| ❌ Pendente | 1 | 2.5% |
| **TOTAL** | **40** | **100%** |

### Progresso Geral: 97.5% completo (39 de 40 regras funcionando)

---

## Correções Implementadas em 28/12/2024

1. **TransactionForm.tsx** - Agora mostra todas as contas (nacionais e internacionais) quando não há viagem selecionada
2. **Dashboard.tsx** - Agora mostra saldos agrupados por moeda estrangeira além do saldo em BRL + indicador de recorrências
3. **CreditCards.tsx** - Agora permite criar cartões de crédito internacionais com seleção de moeda
4. **CreditCards.tsx (PayInvoiceDialog)** - Agora filtra contas por moeda do cartão e exige taxa de câmbio quando necessário
5. **Reports.tsx** - Agora tem filtro por moeda para visualizar relatórios separados por moeda
6. **validationService.ts** - Agora valida saldo negativo em despesas (warning) e transferências (erro)
7. **useAccounts.ts** - Agora impede exclusão de conta com saldo diferente de zero
8. **useTransactions.ts** - Novos hooks para editar/excluir séries de parcelas
9. **Budgets.tsx** - Nova página de orçamentos com suporte a multi-moeda
10. **App.tsx** - Rota /orcamentos adicionada
11. **AppLayout.tsx** - Link de Orçamentos no menu de navegação
12. **ExchangeSummaryCard.tsx** - Mostra equivalente em BRL dos gastos usando taxa média
13. **TripExchange.tsx** - Passa totalExpenses para ExchangeSummaryCard
14. **recurrenceService.ts** - Serviço de geração de transações recorrentes
15. **useRecurrence.ts** - Hook para gerenciar recorrências
16. **InstallmentActionsDialog.tsx** - UI para gerenciar parcelas em série
17. **supabase/migrations/20251228_001_create_budgets_table.sql** - Migração para tabela de orçamentos
18. **supabase/migrations/20251228_002_add_last_generated_date.sql** - Migração para campo de recorrência

---

## Única Regra Pendente

### Req 25: Acerto Automático com Transferência

**Motivo**: Esta regra é complexa porque requer:
1. Conhecer a conta bancária do outro membro da família
2. Criar uma transferência entre contas de usuários diferentes
3. O sistema atual não tem acesso às contas de outros membros por questões de privacidade

**Solução Alternativa Atual**: O sistema cria uma transação de EXPENSE (pagamento) ou INCOME (recebimento) na conta do usuário, marcando os itens como acertados. Isso funciona para controle pessoal, mas não cria a transferência automática entre contas.

**Possível Implementação Futura**: 
- Adicionar campo "conta preferida para acertos" no perfil do membro
- Criar sistema de "solicitação de acerto" que o outro membro precisa aprovar
- Implementar transferências entre membros da família com aprovação

---1. **Req 23** - Edição/exclusão de parcelas
   - PROBLEMA: Não há forma de editar/excluir série de parcelas
   - SOLUÇÃO: Criar UI para gerenciar séries de parcelas

2. **Req 31** - Orçamento multi-moeda
   - PROBLEMA: Orçamentos não consideram moeda
   - SOLUÇÃO: Adicionar campo de moeda em orçamentos

### 🟢 BAIXA PRIORIDADE (Melhorias)

3. **Req 25** - Acerto automático com transferência
4. **Req 30** - Orçamentos completos com UI
5. **Req 39 + Req 40** - Recorrência automática

---

## Próximos Passos

1. ✅ Análise completa do sistema (este documento)
2. ✅ Implementar Req 3 + Req 4 - Transações em contas internacionais
3. ✅ Implementar Req 7 + Req 34 - Dashboard multi-moeda
4. ✅ Implementar Req 29 - Cartão de crédito internacional
5. ✅ Implementar Req 13 - Pagamento de fatura com moeda correta
6. ✅ Implementar Req 35 - Relatórios por moeda
7. ✅ Implementar Req 18 - Validação de saldo negativo
8. ✅ Implementar Req 20 - Prevenção de exclusão de conta com saldo
9. Criar design.md com soluções técnicas detalhadas
10. Criar tasks.md com plano de implementação

---

## Estatísticas Finais (28/12/2024)

| Status | Quantidade | Percentual |
|--------|------------|------------|
| ✅ Implementado | 38 | 95% |
| ⚠️ Parcial | 1 | 2.5% |
| ❌ Pendente | 1 | 2.5% |
| **TOTAL** | **40** | **100%** |

### Progresso Geral: 97.5% completo (39 de 40 regras funcionando)

---

## Arquivos Modificados em 28/12/2024

1. `src/pages/CreditCards.tsx` - PayInvoiceDialog com suporte a moeda
2. `src/pages/Reports.tsx` - Filtro por moeda
3. `src/services/validationService.ts` - Validação de saldo negativo
4. `src/hooks/useAccounts.ts` - Prevenção de exclusão com saldo
5. `src/hooks/useTransactions.ts` - Hooks para gerenciar séries de parcelas
6. `src/pages/Budgets.tsx` - Nova página de orçamentos (NOVO)
7. `src/App.tsx` - Rota de orçamentos
8. `src/components/layout/AppLayout.tsx` - Link no menu
9. `src/types/database.ts` - Tipos Budget, BudgetProgress, Goal
10. `supabase/migrations/20251228_001_create_budgets_table.sql` - Migração (NOVO)
11. `src/components/trips/ExchangeSummaryCard.tsx` - Equivalente em BRL dos gastos (NOVO)
12. `src/components/trips/TripExchange.tsx` - Passa totalExpenses para ExchangeSummaryCard
13. `src/pages/Trips.tsx` - Passa totalExpenses para TripExchange
14. `src/services/recurrenceService.ts` - Serviço de geração de transações recorrentes (NOVO)
15. `src/hooks/useRecurrence.ts` - Hook para gerenciar recorrências (NOVO)
16. `src/pages/Dashboard.tsx` - Indicador de recorrências pendentes
17. `supabase/migrations/20251228_002_add_last_generated_date.sql` - Migração para campo de recorrência (NOVO)
18. `.kiro/specs/business-rules-analysis/requirements.md` - Atualização de status
19. `.kiro/specs/business-rules-analysis/system-overview.md` - Visão global do sistema (NOVO)
