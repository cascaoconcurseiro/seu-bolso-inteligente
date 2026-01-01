# Requirements Document

## Introduction

Este documento especifica melhorias críticas na visibilidade e gestão de transações no sistema financeiro pessoal. O objetivo é garantir que o sistema funcione como um app financeiro padrão (estilo Nubank, Mobills, Organizze), onde todas as transações aparecem corretamente nas listagens, extratos, e o usuário tem controle total sobre edição, exclusão e gestão de parcelas.

## Glossary

- **System**: O sistema financeiro pessoal completo
- **Transaction**: Registro de movimentação financeira (despesa, receita ou transferência)
- **Transaction_List**: Lista principal de transações agrupadas por dia
- **Shared_Transaction**: Transação compartilhada entre membros da família
- **Payer**: Pessoa que efetivamente pagou uma despesa compartilhada
- **Account**: Conta bancária ou carteira digital
- **Credit_Card**: Cartão de crédito
- **Statement**: Extrato de movimentações de uma conta ou cartão
- **Installment**: Parcela de uma transação parcelada
- **Series**: Conjunto de parcelas de uma mesma compra (vinculadas por series_id)
- **Global_Account**: Conta internacional (is_international = true)
- **Trip**: Viagem com moeda específica (pode ser internacional)
- **Advance_Payment**: Adiantamento de parcelas futuras
- **Day_Group**: Agrupamento de transações por dia na listagem

## Requirements

### Requirement 1: Lista de Transações Completa e Agrupada por Dia

**User Story:** Como usuário, quero ver todas as minhas transações (despesas e receitas) agrupadas por dia, para ter uma visão clara do meu fluxo financeiro diário.

#### Acceptance Criteria

1. THE System SHALL exibir TODAS as despesas e receitas na lista principal de transações
2. THE System SHALL agrupar transações por dia (ex: "Hoje", "Ontem", "25 de dezembro")
3. WHEN exibindo um grupo de dia, THE System SHALL mostrar o total do dia (entradas - saídas)
4. THE System SHALL exibir receitas com indicador visual verde (+ valor)
5. THE System SHALL exibir despesas com indicador visual vermelho (- valor)
6. THE System SHALL ordenar transações dentro do dia por hora de criação (mais recente primeiro)
7. THE System SHALL NOT exibir transferências na lista principal (apenas no extrato da conta)
8. WHEN uma transação compartilhada foi paga pelo usuário, THE System SHALL exibir o valor INTEGRAL na lista

### Requirement 2: Transferências Apenas no Extrato da Conta

**User Story:** Como usuário, quero que transferências apareçam apenas no extrato das contas envolvidas, não na lista geral de transações.

#### Acceptance Criteria

1. THE System SHALL NOT exibir transações do tipo TRANSFER na lista principal de transações
2. WHEN o usuário acessa o extrato de uma conta, THE System SHALL exibir transferências de entrada e saída
3. WHEN uma transferência sai da conta, THE System SHALL exibir como saída (valor negativo)
4. WHEN uma transferência entra na conta, THE System SHALL exibir como entrada (valor positivo)
5. THE System SHALL exibir a conta de origem/destino na descrição da transferência

### Requirement 3: Extrato Completo de Conta e Cartão

**User Story:** Como usuário, quero que o extrato da conta/cartão mostre TODAS as transações vinculadas, para acompanhar movimentações.

#### Acceptance Criteria

1. WHEN o usuário acessa o extrato de uma conta, THE System SHALL exibir todas as transações onde account_id = conta
2. WHEN o usuário acessa o extrato de um cartão, THE System SHALL exibir todas as transações onde credit_card_id = cartão
3. THE System SHALL incluir despesas, receitas e transferências no extrato
4. THE System SHALL ordenar transações por data (mais recente primeiro)
5. THE System SHALL exibir saldo acumulado/running balance no extrato da conta
6. WHEN uma transação é criada/editada/excluída, THE System SHALL atualizar o extrato imediatamente
7. THE System SHALL permitir filtrar extrato por período (mês, semana, personalizado)

### Requirement 4: Transações Compartilhadas - Valor Integral para Quem Pagou

**User Story:** Como usuário, quero que quando eu pagar uma despesa compartilhada, o valor integral apareça nas minhas transações, pois a outra pessoa vai me ressarcir depois.

#### Acceptance Criteria

1. WHEN o usuário cria uma transação compartilhada onde ele é o pagador (payer_id = user_id ou payer_id = null), THE System SHALL exibir o valor INTEGRAL na lista de transações
2. THE System SHALL exibir indicador visual de "Compartilhada" na transação
3. THE System SHALL exibir quem deve ressarcir e quanto (ex: "Fran deve R$ 50,00")
4. WHEN o outro membro confirma o ressarcimento, THE System SHALL atualizar o status para "Ressarcido"
5. THE System SHALL impactar o saldo da conta com o valor INTEGRAL (não apenas a parte do usuário)

### Requirement 5: Histórico Completo e Editável de Transações

**User Story:** Como usuário, quero que toda transação tenha um histórico completo e seja editável ou excluível quando eu quiser.

#### Acceptance Criteria

1. THE System SHALL permitir editar qualquer transação (descrição, valor, data, categoria, conta)
2. THE System SHALL permitir excluir qualquer transação com confirmação
3. WHEN uma transação é editada, THE System SHALL registrar a alteração (updated_at)
4. THE System SHALL exibir data de criação e última modificação ao visualizar detalhes
5. WHEN uma transação é excluída, THE System SHALL reverter o impacto no saldo da conta
6. THE System SHALL permitir visualizar detalhes completos clicando na transação

### Requirement 6: Adiantamento de Parcelas (Estilo Nubank)

**User Story:** Como usuário, quero poder adiantar parcelas de uma compra parcelada, para reduzir minha dívida futura.

#### Acceptance Criteria

1. WHEN o usuário visualiza uma transação parcelada, THE System SHALL exibir opção "Adiantar parcelas"
2. WHEN o usuário seleciona adiantar, THE System SHALL mostrar lista de parcelas futuras disponíveis
3. THE System SHALL permitir selecionar quais parcelas adiantar (uma ou várias)
4. WHEN parcelas são adiantadas, THE System SHALL mover a competência para o mês atual
5. WHEN parcelas são adiantadas, THE System SHALL atualizar o saldo/fatura do período atual
6. THE System SHALL manter o registro de que as parcelas foram adiantadas (campo advanced_at)
7. THE System SHALL recalcular o total da fatura atual após adiantamento

### Requirement 7: Exclusão em Série de Parcelas

**User Story:** Como usuário, quero que ao excluir uma transação parcelada, todas as parcelas da série sejam excluídas automaticamente.

#### Acceptance Criteria

1. WHEN o usuário exclui uma parcela, THE System SHALL perguntar se deseja excluir apenas esta ou toda a série
2. IF o usuário escolhe "Excluir toda a série", THE System SHALL remover todas as parcelas com mesmo series_id
3. IF o usuário escolhe "Excluir apenas esta", THE System SHALL remover apenas a parcela selecionada
4. WHEN uma série é excluída, THE System SHALL reverter o impacto no saldo de todas as parcelas
5. THE System SHALL exibir confirmação com quantidade de parcelas que serão excluídas
6. THE System SHALL oferecer opção "Excluir apenas parcelas futuras" (manter as já pagas)

### Requirement 8: Conta Global Apenas para Viagens Internacionais

**User Story:** Como usuário, quero que a conta global (internacional) só apareça como opção quando eu estiver criando uma transação vinculada a uma viagem com moeda diferente de BRL.

#### Acceptance Criteria

1. WHEN o usuário cria uma transação SEM viagem selecionada, THE System SHALL mostrar apenas contas nacionais (BRL)
2. WHEN o usuário seleciona uma viagem com moeda BRL, THE System SHALL mostrar apenas contas nacionais
3. WHEN o usuário seleciona uma viagem com moeda diferente de BRL (USD, EUR, etc.), THE System SHALL mostrar contas na moeda da viagem
4. THE System SHALL filtrar contas pelo campo is_international e currency
5. IF não existir conta compatível com a moeda da viagem, THE System SHALL exibir mensagem orientando criar conta
6. THE System SHALL exibir claramente a moeda de cada conta na lista de seleção

### Requirement 9: Confirmação de Ressarcimento em Transações Compartilhadas

**User Story:** Como usuário que pagou uma despesa compartilhada, quero confirmar quando recebi o ressarcimento da outra pessoa.

#### Acceptance Criteria

1. WHEN uma transação compartilhada está pendente de ressarcimento, THE System SHALL exibir botão "Confirmar recebimento"
2. WHEN o usuário confirma recebimento, THE System SHALL marcar o split como is_settled = true
3. WHEN o usuário confirma recebimento, THE System SHALL registrar a data do ressarcimento (settled_at)
4. THE System SHALL permitir confirmar ressarcimento parcial (apenas alguns membros)
5. THE System SHALL exibir status de ressarcimento na lista de transações (pendente/recebido)
6. WHEN todos os ressarcimentos são confirmados, THE System SHALL marcar a transação como totalmente acertada

### Requirement 10: Detalhes da Transação ao Clicar

**User Story:** Como usuário, quero ver todos os detalhes de uma transação ao clicar nela, para ter informações completas.

#### Acceptance Criteria

1. WHEN o usuário clica em uma transação, THE System SHALL abrir modal/tela de detalhes
2. THE System SHALL exibir: descrição, valor, data, categoria, conta/cartão, notas
3. IF a transação é parcelada, THE System SHALL exibir: parcela atual/total, série completa
4. IF a transação é compartilhada, THE System SHALL exibir: quem pagou, divisão, status de ressarcimento
5. THE System SHALL exibir botões de ação: Editar, Excluir, Adiantar (se parcelada)
6. THE System SHALL exibir data de criação e última modificação

### Requirement 11: Filtros Avançados na Lista de Transações

**User Story:** Como usuário, quero filtrar transações por diversos critérios, para encontrar o que preciso rapidamente.

#### Acceptance Criteria

1. THE System SHALL permitir filtrar por tipo (Despesa, Receita, Todos)
2. THE System SHALL permitir filtrar por categoria
3. THE System SHALL permitir filtrar por conta/cartão
4. THE System SHALL permitir filtrar por período (Este mês, Mês passado, Personalizado)
5. THE System SHALL permitir buscar por descrição
6. THE System SHALL exibir totais filtrados (entradas, saídas, resultado)
7. THE System SHALL permitir combinar múltiplos filtros

### Requirement 12: Indicadores Visuais Claros

**User Story:** Como usuário, quero identificar rapidamente o tipo e status de cada transação através de indicadores visuais.

#### Acceptance Criteria

1. THE System SHALL exibir receitas em cor verde com sinal de +
2. THE System SHALL exibir despesas em cor vermelha com sinal de -
3. THE System SHALL exibir ícone da categoria em cada transação
4. IF a transação é parcelada, THE System SHALL exibir badge "X/Y" (parcela atual/total)
5. IF a transação é compartilhada, THE System SHALL exibir badge "Dividido"
6. IF a transação aguarda ressarcimento, THE System SHALL exibir badge "Pendente"
7. IF a transação foi ressarcida, THE System SHALL exibir badge "Acertado"

