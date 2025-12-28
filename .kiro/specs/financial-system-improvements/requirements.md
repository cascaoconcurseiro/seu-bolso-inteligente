# Requirements Document

## Introduction

Este documento especifica melhorias críticas para o sistema financeiro pessoal, garantindo conformidade com princípios contábeis de partidas dobradas, precisão em cálculos financeiros e interligação completa de dados entre todas as páginas e funcionalidades.

## Glossary

- **System**: O sistema financeiro pessoal completo
- **Transaction**: Registro de movimentação financeira (despesa, receita ou transferência)
- **Account**: Conta bancária, cartão de crédito, investimento ou dinheiro
- **Double_Entry**: Sistema de partidas dobradas onde cada transação afeta pelo menos duas contas
- **Balance**: Saldo de uma conta calculado a partir das transações
- **Ledger**: Livro-razão contábil com todas as entradas de débito e crédito
- **Competence_Date**: Data de competência da transação (mês de referência)
- **Split_Transaction**: Transação dividida entre múltiplas pessoas
- **Payer**: Pessoa que efetivamente pagou uma despesa compartilhada
- **Mirror_Transaction**: Transação espelhada para outro usuário em despesas compartilhadas
- **Installment**: Parcela de uma transação parcelada
- **Trial_Balance**: Balancete de verificação contábil

## Requirements

### Requirement 1: Partidas Dobradas Completas

**User Story:** Como usuário do sistema, quero que todas as transações sigam o princípio de partidas dobradas, para que minha contabilidade seja precisa e auditável.

#### Acceptance Criteria

1. WHEN uma despesa é criada, THE System SHALL registrar débito na categoria e crédito na conta
2. WHEN uma receita é criada, THE System SHALL registrar débito na conta e crédito na categoria
3. WHEN uma transferência é criada, THE System SHALL registrar débito na conta destino e crédito na conta origem
4. FOR ALL transactions, THE System SHALL garantir que a soma dos débitos seja igual à soma dos créditos
5. WHEN uma transação é excluída, THE System SHALL reverter os lançamentos contábeis correspondentes
6. THE System SHALL manter um ledger (livro-razão) completo com todas as entradas de débito e crédito
7. THE System SHALL gerar um trial balance (balancete de verificação) que sempre fecha em zero
8. WHEN uma transação parcelada é criada, THE System SHALL registrar cada parcela como lançamento separado
9. WHEN uma transação compartilhada é criada, THE System SHALL registrar splits como lançamentos contábeis
10. THE System SHALL validar integridade contábil antes de confirmar qualquer transação
11. THE System SHALL impedir transações que violem o princípio de partidas dobradas
12. THE System SHALL gerar relatório de auditoria contábil mostrando todos os lançamentos

### Requirement 2: Atualização Automática de Saldos

**User Story:** Como usuário, quero que os saldos das minhas contas sejam atualizados automaticamente quando eu criar, editar ou excluir transações, para que eu sempre veja valores corretos.

#### Acceptance Criteria

1. WHEN uma transação é criada, THE System SHALL atualizar o saldo da conta imediatamente
2. WHEN uma transação é editada, THE System SHALL recalcular e atualizar os saldos afetados
3. WHEN uma transação é excluída, THE System SHALL reverter o impacto no saldo
4. WHEN uma transferência é criada, THE System SHALL atualizar ambas as contas (origem e destino)
5. THE System SHALL usar triggers de banco de dados para garantir consistência dos saldos
6. THE System SHALL validar que o saldo calculado corresponde à soma das transações
7. WHEN um parcelamento é criado, THE System SHALL atualizar o saldo apenas da parcela do mês atual

### Requirement 3: Transações Sempre Vinculadas a Contas

**User Story:** Como usuário, quero que toda transação pessoal esteja vinculada a uma conta ou cartão, para que eu saiba de onde saiu ou para onde entrou cada valor.

#### Acceptance Criteria

1. WHEN criando uma despesa pessoal, THE System SHALL exigir seleção de conta ou cartão
2. WHEN criando uma receita pessoal, THE System SHALL exigir seleção de conta
3. WHEN criando uma transferência, THE System SHALL exigir conta origem e conta destino
4. THE System SHALL impedir criação de transações pessoais sem conta vinculada
5. WHEN uma transação é paga por outra pessoa, THE System SHALL permitir omitir a conta
6. THE System SHALL validar que a conta selecionada existe e está ativa
7. THE System SHALL mostrar erro claro quando conta não for selecionada

### Requirement 4: Transações Pagas por Outros

**User Story:** Como usuário, quero registrar despesas pagas por outras pessoas sem vincular a minhas contas, para que eu acompanhe gastos compartilhados sem afetar meu saldo.

#### Acceptance Criteria

1. WHEN uma despesa é paga por outra pessoa, THE System SHALL desabilitar seleção de conta/cartão
2. WHEN uma despesa é paga por outra pessoa, THE System SHALL não afetar o saldo de minhas contas
3. WHEN uma despesa é paga por outra pessoa, THE System SHALL registrar o pagador (payer_id)
4. THE System SHALL mostrar claramente na interface que a despesa foi paga por outro
5. WHEN uma despesa é paga por outra pessoa, THE System SHALL ainda registrar minha parte no split
6. THE System SHALL permitir filtrar transações por "pagas por mim" vs "pagas por outros"
7. WHEN exibindo transações, THE System SHALL diferenciar visualmente quem pagou

### Requirement 5: Registro Completo de Transações

**User Story:** Como usuário, quero ver todas as transações na página de transações, exceto aquelas pagas por outras pessoas, para ter uma visão clara do meu fluxo financeiro pessoal.

#### Acceptance Criteria

1. THE System SHALL exibir todas as transações pessoais na página de transações
2. THE System SHALL excluir da listagem transações onde payer_id != user_id
3. THE System SHALL incluir despesas, receitas e transferências na listagem
4. THE System SHALL incluir transações de viagens vinculadas ao usuário
5. THE System SHALL ordenar transações por data de competência (competence_date)
6. THE System SHALL permitir filtrar por tipo, conta, categoria e período
7. WHEN uma transação é compartilhada mas eu paguei, THE System SHALL exibi-la na listagem

### Requirement 6: Precisão em Cálculos Financeiros

**User Story:** Como usuário, quero que todos os cálculos financeiros sejam precisos até o centavo, para evitar erros de arredondamento e inconsistências.

#### Acceptance Criteria

1. THE System SHALL usar aritmética de ponto fixo para todos os cálculos monetários
2. THE System SHALL arredondar valores para 2 casas decimais usando ROUND_HALF_UP
3. WHEN dividindo valores, THE System SHALL distribuir centavos restantes corretamente
4. WHEN calculando parcelas, THE System SHALL garantir que a soma das parcelas seja igual ao total
5. WHEN calculando splits, THE System SHALL garantir que a soma dos splits seja igual ao total
6. THE System SHALL validar que não há diferenças de centavos em divisões
7. THE System SHALL usar SafeFinancialCalculator para todas as operações monetárias

### Requirement 7: Interligação de Dados Entre Páginas

**User Story:** Como usuário, quero que os dados sejam consistentes em todas as páginas do sistema, para que eu veja sempre as mesmas informações atualizadas.

#### Acceptance Criteria

1. WHEN uma transação é criada, THE System SHALL atualizar dashboard, contas e transações
2. WHEN um saldo é alterado, THE System SHALL refletir em todas as visualizações
3. WHEN uma categoria é usada, THE System SHALL mostrar o total correto em relatórios
4. THE System SHALL usar cache invalidation para manter dados sincronizados
5. THE System SHALL recarregar dados relacionados após mutações
6. WHEN navegando entre páginas, THE System SHALL mostrar dados consistentes
7. THE System SHALL usar React Query para gerenciar estado global de dados

### Requirement 8: Validação de Integridade Financeira

**User Story:** Como usuário, quero que o sistema valide a integridade dos meus dados financeiros, para detectar e prevenir inconsistências.

#### Acceptance Criteria

1. THE System SHALL validar que saldos calculados correspondem aos registrados
2. THE System SHALL validar que o trial balance sempre fecha em zero
3. THE System SHALL detectar transações órfãs (sem conta válida)
4. THE System SHALL detectar duplicatas de transações
5. THE System SHALL validar que parcelas de uma série somam o valor total
6. THE System SHALL validar que splits de uma transação somam 100%
7. THE System SHALL fornecer relatório de auditoria com inconsistências encontradas

### Requirement 9: Separação de Domínios Financeiros

**User Story:** Como usuário, quero que o sistema separe claramente transações pessoais, compartilhadas e de viagens, para melhor organização e análise.

#### Acceptance Criteria

1. THE System SHALL classificar transações em PERSONAL, SHARED ou TRAVEL
2. WHEN uma transação tem splits, THE System SHALL marcá-la como SHARED
3. WHEN uma transação está vinculada a viagem, THE System SHALL marcá-la como TRAVEL
4. THE System SHALL permitir filtrar por domínio (pessoal, compartilhado, viagem)
5. THE System SHALL calcular totais separados por domínio
6. THE System SHALL mostrar indicadores visuais do domínio na interface
7. WHEN gerando relatórios, THE System SHALL separar por domínio

### Requirement 10: Auditoria e Rastreabilidade

**User Story:** Como usuário, quero rastrear quem criou cada transação e quando, para ter histórico completo de alterações.

#### Acceptance Criteria

1. THE System SHALL registrar creator_user_id em todas as transações
2. THE System SHALL registrar created_at e updated_at automaticamente
3. WHEN uma transação é editada, THE System SHALL atualizar updated_at
4. THE System SHALL permitir visualizar histórico de alterações
5. THE System SHALL registrar quem reconciliou uma transação (reconciled_by)
6. THE System SHALL registrar quando uma transação foi reconciliada (reconciled_at)
7. THE System SHALL manter log de operações críticas (criação, edição, exclusão)

### Requirement 11: Alertas Financeiros

**User Story:** Como usuário, quero receber alertas sobre situações financeiras importantes, para tomar decisões informadas e evitar problemas.

#### Acceptance Criteria

1. WHEN o saldo de uma conta ficar negativo, THE System SHALL exibir alerta
2. WHEN o limite do cartão estiver próximo (>80%), THE System SHALL exibir alerta
3. WHEN uma transação duplicada for detectada, THE System SHALL exibir alerta
4. WHEN gastos do mês ultrapassarem média histórica, THE System SHALL exibir alerta
5. WHEN uma parcela estiver próxima do vencimento, THE System SHALL exibir alerta
6. THE System SHALL permitir configurar limites personalizados por categoria
7. THE System SHALL mostrar alertas no dashboard e enviar notificações

### Requirement 12: Validação de Transações Compartilhadas

**User Story:** Como usuário, quero que transações compartilhadas sejam validadas corretamente, garantindo que splits e espelhamentos funcionem perfeitamente.

#### Acceptance Criteria

1. WHEN criando split, THE System SHALL validar que soma de percentagens é 100%
2. WHEN criando split, THE System SHALL validar que todos os membros existem
3. WHEN criando split, THE System SHALL criar transaction_splits corretamente
4. WHEN criando split, THE System SHALL espelhar transação para outros usuários
5. THE System SHALL validar que mirror_transactions referenciam transação original
6. THE System SHALL sincronizar alterações entre transação original e espelhos
7. WHEN excluindo transação compartilhada, THE System SHALL excluir espelhos

### Requirement 13: Gestão de Parcelamentos

**User Story:** Como usuário, quero que parcelamentos sejam gerenciados corretamente, com cada parcela aparecendo no mês correto.

#### Acceptance Criteria

1. WHEN criando parcelamento, THE System SHALL gerar todas as parcelas
2. WHEN criando parcelamento, THE System SHALL calcular competence_date corretamente
3. WHEN criando parcelamento, THE System SHALL vincular parcelas via series_id
4. THE System SHALL mostrar apenas parcela do mês atual no saldo
5. THE System SHALL permitir visualizar todas as parcelas de uma série
6. THE System SHALL permitar editar ou cancelar parcelas futuras
7. WHEN navegando entre meses, THE System SHALL mostrar parcela correspondente

### Requirement 14: Transferências Internacionais

**User Story:** Como usuário, quero registrar transferências entre contas de moedas diferentes, aplicando taxa de câmbio correta.

#### Acceptance Criteria

1. WHEN transferindo entre moedas diferentes, THE System SHALL exigir exchange_rate
2. WHEN transferindo entre moedas diferentes, THE System SHALL calcular destination_amount
3. THE System SHALL validar que exchange_rate é maior que zero
4. THE System SHALL registrar ambas as moedas (origem e destino)
5. THE System SHALL mostrar valores em ambas as moedas na interface
6. THE System SHALL permitir editar taxa de câmbio posteriormente
7. THE System SHALL validar que contas têm moedas compatíveis com viagens

### Requirement 15: Projeções Financeiras

**User Story:** Como usuário, quero ver projeções do meu saldo futuro, para planejar melhor minhas finanças.

#### Acceptance Criteria

1. THE System SHALL calcular projeção de saldo para os próximos 3 meses
2. WHEN calculando projeção, THE System SHALL considerar transações recorrentes
3. WHEN calculando projeção, THE System SHALL considerar parcelas futuras
4. THE System SHALL mostrar gráfico de projeção de saldo
5. THE System SHALL alertar se projeção indicar saldo negativo futuro
6. THE System SHALL permitir simular cenários (adicionar/remover despesas)
7. THE System SHALL considerar média de gastos por categoria na projeção

### Requirement 16: Reconciliação Bancária

**User Story:** Como usuário, quero reconciliar minhas transações com extratos bancários, para garantir que meus registros estão corretos.

#### Acceptance Criteria

1. THE System SHALL permitir marcar transações como reconciliadas
2. WHEN reconciliando, THE System SHALL registrar reconciled_at e reconciled_by
3. THE System SHALL calcular diferença entre saldo reconciliado e saldo atual
4. THE System SHALL permitir filtrar transações não reconciliadas
5. THE System SHALL alertar sobre transações antigas não reconciliadas
6. THE System SHALL impedir edição de transações reconciliadas sem confirmação
7. THE System SHALL gerar relatório de reconciliação com discrepâncias

### Requirement 17: Exportação de Dados

**User Story:** Como usuário, quero exportar meus dados financeiros, para análise externa ou backup.

#### Acceptance Criteria

1. THE System SHALL permitir exportar transações em formato CSV
2. THE System SHALL permitir exportar relatórios em formato PDF
3. THE System SHALL permitir exportar ledger completo
4. THE System SHALL incluir filtros na exportação (período, conta, categoria)
5. THE System SHALL gerar nome de arquivo com data e tipo de exportação
6. THE System SHALL incluir todos os campos relevantes na exportação
7. THE System SHALL formatar valores monetários corretamente no CSV
