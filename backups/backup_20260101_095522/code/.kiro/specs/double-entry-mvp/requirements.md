# Requirements Document

## Introduction

Este documento especifica melhorias MVP para garantir que o sistema financeiro pessoal tenha partidas dobradas funcionais, cálculos precisos e interligação correta de dados. O foco é corrigir problemas identificados e alinhar com práticas de sistemas similares (YNAB, Mobills, Organizze, Toshl).

## Análise do Sistema Atual

### O que já está implementado ✅

1. **Partidas Dobradas Básicas** (`ledger.ts`):
   - Geração de ledger com débito/crédito para despesas, receitas e transferências
   - Trial balance (balancete de verificação)
   - SafeFinancialCalculator para cálculos precisos

2. **Transações Vinculadas a Contas**:
   - Despesas e receitas podem ser vinculadas a contas
   - Transferências exigem origem e destino

3. **Pagamento por Terceiros**:
   - Campo `payer_id` existe na transação
   - SplitModal permite selecionar "Outro Pagou"

4. **Parcelamentos**:
   - Criação de múltiplas parcelas com `series_id`
   - Competence_date para filtrar por mês

### Problemas Identificados ❌

1. **Conta NÃO é desabilitada quando "Outro Pagou"**:
   - O formulário ainda mostra seleção de conta mesmo quando `payerId !== 'me'`
   - Deveria esconder/desabilitar completamente

2. **Saldos NÃO são atualizados automaticamente**:
   - Não há triggers de banco de dados
   - Saldo é calculado manualmente

3. **Transações pagas por outros APARECEM na listagem**:
   - Não há filtro para excluir `payer_id != user_id`

4. **Partidas dobradas NÃO afetam saldos reais**:
   - O ledger é apenas visualização
   - Não há integração com saldos das contas

5. **Validação de integridade ausente**:
   - Não valida se débitos = créditos
   - Não impede transações inconsistentes

### Comparação com Sistemas Similares

| Funcionalidade | YNAB | Mobills | Organizze | Nosso Sistema |
|----------------|------|---------|-----------|---------------|
| Partidas dobradas | ✅ | ❌ | ❌ | Parcial |
| Saldo automático | ✅ | ✅ | ✅ | ❌ |
| Conta obrigatória | ✅ | ✅ | ✅ | Parcial |
| Pago por outro | ❌ | ✅ | ✅ | Parcial |
| Parcelamentos | ✅ | ✅ | ✅ | ✅ |
| Divisão despesas | ❌ | ✅ | ❌ | ✅ |
| Viagens | ❌ | ❌ | ❌ | ✅ |

## Glossary

- **System**: O sistema financeiro pessoal
- **Transaction**: Registro de movimentação financeira
- **Account**: Conta bancária, cartão, investimento ou dinheiro
- **Double_Entry**: Sistema onde cada transação tem débito e crédito iguais
- **Payer**: Pessoa que efetivamente pagou uma despesa
- **Balance**: Saldo calculado de uma conta
- **Ledger**: Livro-razão com entradas de débito/crédito

## Requirements

### Requirement 1: Desabilitar Conta Quando Pago por Outro

**User Story:** Como usuário, quero que o campo de conta seja desabilitado quando seleciono que outra pessoa pagou, para não vincular erroneamente a despesa às minhas contas.

#### Acceptance Criteria

1. WHEN o usuário seleciona "Outro Pagou" no SplitModal, THE System SHALL esconder o campo de seleção de conta no formulário
2. WHEN o usuário seleciona "Outro Pagou", THE System SHALL definir account_id como null na transação
3. WHEN o usuário volta para "Eu Paguei", THE System SHALL mostrar novamente o campo de conta
4. THE System SHALL exibir mensagem explicativa quando conta estiver oculta: "Despesa paga por [nome] - não afeta suas contas"
5. WHEN salvando transação com payer_id diferente do usuário, THE System SHALL validar que account_id é null
6. THE System SHALL impedir seleção de conta quando payer_id != user_id

### Requirement 2: Transações Pagas por Outros como Débito Compartilhado

**User Story:** Como usuário, quero que transações pagas por outras pessoas apareçam na seção de compartilhados como débito meu com essa pessoa, para acompanhar quanto devo a cada um.

#### Acceptance Criteria

1. WHEN uma transação é paga por outro, THE System SHALL excluí-la da listagem principal de Transações
2. WHEN uma transação é paga por outro, THE System SHALL exibi-la na página de Despesas Compartilhadas
3. WHEN uma transação é paga por outro, THE System SHALL registrar como débito do usuário com o pagador
4. THE System SHALL calcular saldo devedor/credor com cada pessoa da família
5. WHEN exibindo resumo mensal compartilhado, THE System SHALL mostrar total que devo a cada pessoa
6. THE System SHALL permitir marcar débitos como "quitados" quando eu pagar a pessoa
7. WHEN calculando totais na página Transações, THE System SHALL excluir valores pagos por outros

### Requirement 3: Atualização Automática de Saldos

**User Story:** Como usuário, quero que os saldos das minhas contas sejam atualizados automaticamente quando eu criar ou excluir transações, para sempre ver valores corretos.

#### Acceptance Criteria

1. WHEN uma despesa é criada com account_id, THE System SHALL decrementar o saldo da conta
2. WHEN uma receita é criada com account_id, THE System SHALL incrementar o saldo da conta
3. WHEN uma transferência é criada, THE System SHALL decrementar origem e incrementar destino
4. WHEN uma transação é excluída, THE System SHALL reverter o impacto no saldo
5. THE System SHALL usar triggers de banco de dados para garantir atomicidade
6. WHEN uma transação é paga por outro (payer_id != user_id), THE System SHALL não afetar saldos
7. THE System SHALL recalcular saldo como soma de todas as transações da conta

### Requirement 4: Validação de Integridade Contábil

**User Story:** Como usuário, quero que o sistema valide a integridade das minhas transações, para garantir que meus dados financeiros estão corretos.

#### Acceptance Criteria

1. WHEN criando transação pessoal (domain=PERSONAL), THE System SHALL exigir account_id
2. WHEN criando transação com payer_id != user_id, THE System SHALL permitir account_id null
3. THE System SHALL validar que soma de débitos = soma de créditos no ledger
4. THE System SHALL detectar e alertar sobre transações órfãs (conta excluída)
5. WHEN calculando trial balance, THE System SHALL verificar que resultado é zero
6. THE System SHALL impedir criação de transação que viole partidas dobradas

### Requirement 5: Indicadores Visuais de Pagador

**User Story:** Como usuário, quero ver claramente quem pagou cada despesa compartilhada, para entender minha situação financeira com outras pessoas.

#### Acceptance Criteria

1. WHEN exibindo transação na lista, THE System SHALL mostrar ícone/badge indicando pagador
2. WHEN eu paguei uma despesa compartilhada, THE System SHALL mostrar "Você pagou"
3. WHEN outro pagou, THE System SHALL mostrar "Pago por [nome]"
4. THE System SHALL usar cores diferentes para "Eu paguei" vs "Outro pagou"
5. WHEN exibindo detalhes da transação, THE System SHALL mostrar divisão completa
6. THE System SHALL mostrar quanto cada pessoa deve/recebe

### Requirement 6: Sincronização de Dados Entre Páginas

**User Story:** Como usuário, quero que os dados sejam consistentes em todas as páginas, para não ver informações conflitantes.

#### Acceptance Criteria

1. WHEN uma transação é criada, THE System SHALL invalidar cache de transações, contas e dashboard
2. WHEN navegando para Dashboard, THE System SHALL mostrar saldos atualizados
3. WHEN navegando para Contas, THE System SHALL mostrar saldos consistentes com transações
4. THE System SHALL usar React Query para gerenciar estado global
5. WHEN uma conta é atualizada, THE System SHALL refletir em todas as visualizações
6. THE System SHALL garantir que totais no Dashboard = soma das transações filtradas

### Requirement 7: Cálculos Financeiros Precisos

**User Story:** Como usuário, quero que todos os cálculos sejam precisos até o centavo, para evitar erros de arredondamento.

#### Acceptance Criteria

1. THE System SHALL usar SafeFinancialCalculator para todas as operações monetárias
2. WHEN dividindo valores, THE System SHALL distribuir centavos restantes no último split
3. WHEN calculando parcelas, THE System SHALL garantir soma = total original
4. THE System SHALL arredondar usando ROUND_HALF_UP (0.005 → 0.01)
5. WHEN exibindo valores, THE System SHALL formatar com 2 casas decimais
6. THE System SHALL validar que splits somam exatamente 100%

