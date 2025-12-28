# Análise de Regras de Negócio - Sistema Financeiro

## Introdução

Este documento identifica regras de negócio que estão faltando ou precisam ser implementadas/melhoradas no sistema financeiro.

## Glossário

- **Conta_Nacional**: Conta bancária em BRL (is_international = false)
- **Conta_Internacional**: Conta em moeda estrangeira (is_international = true)
- **Viagem_Internacional**: Viagem com currency diferente de BRL
- **Transferência_Cross_Currency**: Transferência entre contas de moedas diferentes

---

## Regras Identificadas

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

---

### Requirement 4: Despesas Diretas em Contas Internacionais (sem viagem)

**User Story:** Como usuário, quero registrar despesas diretamente em contas internacionais sem vincular a uma viagem, para controlar gastos em moeda estrangeira fora de viagens.

#### Acceptance Criteria

1. WHEN um usuário registra uma despesa sem viagem THEN o sistema SHALL permitir selecionar contas internacionais
2. WHEN uma conta internacional é selecionada THEN o sistema SHALL mudar o símbolo da moeda no campo valor
3. WHEN uma despesa é registrada em conta internacional sem viagem THEN o sistema SHALL salvar a currency da transação
4. THE sistema SHALL filtrar essas despesas da página principal (aparecem apenas no extrato da conta)

**Status:** ❌ NÃO IMPLEMENTADO - Sem viagem, só mostra contas nacionais

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

**Status:** ⚠️ PARCIAL - Página de cartões não tem opção de internacional (só Accounts.tsx tem)

---

### Requirement 7: Saldo de Contas Internacionais no Dashboard

**User Story:** Como usuário, quero ver o saldo das minhas contas internacionais separado no dashboard, para ter visão clara dos meus recursos em cada moeda.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir saldo total em BRL das contas nacionais
2. THE Dashboard SHALL exibir saldo agrupado por moeda das contas internacionais
3. WHEN o usuário visualiza o dashboard THEN o sistema SHALL mostrar cada moeda separadamente (ex: $500 USD, €200 EUR)
4. THE sistema SHALL NOT somar saldos de moedas diferentes

**Status:** ❌ NÃO IMPLEMENTADO - Dashboard só mostra saldo total em BRL

---

### Requirement 8: Extrato de Conta Internacional

**User Story:** Como usuário, quero ver o extrato da minha conta internacional na moeda correta, para acompanhar movimentações.

#### Acceptance Criteria

1. WHEN um usuário acessa o extrato de uma conta internacional THEN o sistema SHALL exibir valores na moeda da conta
2. THE sistema SHALL usar o símbolo correto da moeda ($ para USD, € para EUR, etc.)
3. THE sistema SHALL formatar números de acordo com a moeda (ex: 1,000.00 para USD)
4. WHEN uma transação é exibida no extrato THEN o sistema SHALL mostrar a moeda da transação

**Status:** ⚠️ PARCIAL - AccountDetail pode não estar formatando corretamente

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

**Status:** ⚠️ PARCIAL - TripExchange calcula média mas não integra com gastos

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

**Status:** ❌ NÃO IMPLEMENTADO - CreditCards.tsx não considera moeda

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

**Status:** ⚠️ NÃO VERIFICADO - Precisa testar se recorrência mantém moeda

---

### Requirement 16: Parcelamento em Cartão Internacional

**User Story:** Como usuário, quero parcelar compras no cartão internacional, para dividir gastos grandes.

#### Acceptance Criteria

1. WHEN uma compra é parcelada em cartão internacional THEN o sistema SHALL manter a moeda em todas as parcelas
2. THE sistema SHALL exibir valor da parcela na moeda do cartão
3. THE sistema SHALL calcular parcelas na moeda original (não converter para BRL)

**Status:** ⚠️ NÃO VERIFICADO - Precisa testar se parcelamento mantém moeda

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

## Resumo de Prioridades

### Alta Prioridade (Funcionalidade Core)
1. **Req 1** - ✅ Transferências entre moedas diferentes
2. **Req 3** - ❌ Receitas em contas internacionais
3. **Req 4** - ❌ Despesas diretas em contas internacionais
4. **Req 9** - ✅ Orçamento de viagem na moeda correta

### Média Prioridade (UX/Consistência)
5. **Req 2** - ✅ Filtro de contas em transferências
6. **Req 6** - ⚠️ Cartões de crédito internacionais
7. **Req 7** - ❌ Saldo de contas internacionais no dashboard
8. **Req 8** - ⚠️ Extrato de conta internacional
9. **Req 12** - ✅ Impedir transferência para cartão de crédito
10. **Req 17** - ✅ Acerto de despesas compartilhadas em viagens internacionais

### Baixa Prioridade (Melhorias)
11. **Req 10** - ⚠️ Câmbio integrado com gastos
12. **Req 13** - ❌ Pagamento de fatura com moeda correta
13. **Req 15** - ⚠️ Transações recorrentes em moeda estrangeira
14. **Req 16** - ⚠️ Parcelamento em cartão internacional

---

## Próximos Passos

1. ~~Revisar e priorizar requirements com o usuário~~
2. Implementar Req 3 e Req 4 - Permitir transações em contas internacionais sem viagem
3. Implementar Req 7 - Dashboard com saldos por moeda
2. Criar design.md com soluções técnicas
3. Criar tasks.md com plano de implementação
