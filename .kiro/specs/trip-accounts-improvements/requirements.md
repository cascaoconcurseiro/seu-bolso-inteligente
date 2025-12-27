# Requirements Document

## Introduction

Este documento especifica melhorias críticas para o sistema de viagens e contas, incluindo orçamento pessoal obrigatório, operações bancárias (transferências e saques), melhorias na página de contas, e correção do vínculo de viagens na família.

## Glossary

- **Trip_Member**: Membro de uma viagem (pode ser owner ou member)
- **Personal_Budget**: Orçamento pessoal de cada membro da viagem
- **Account**: Conta bancária ou carteira do usuário
- **Transfer**: Transferência de dinheiro entre contas
- **Withdrawal**: Saque de dinheiro da conta
- **Initial_Deposit**: Depósito inicial ao criar conta com saldo
- **Trip_Link**: Vínculo entre viagem e família no modo avançado

## Requirements

### Requirement 1: Orçamento Pessoal Obrigatório

**User Story:** Como participante de uma viagem, eu quero ser obrigado a definir meu orçamento pessoal ao entrar, para que eu possa gerenciar meus gastos individuais.

#### Acceptance Criteria

1. WHEN um participante aceita um convite de viagem THEN o sistema SHALL exibir um modal obrigatório para definir orçamento pessoal
2. WHEN o participante tenta fechar o modal sem definir orçamento THEN o sistema SHALL impedir o fechamento e manter o modal aberto
3. WHEN o participante define um orçamento válido (maior que zero) THEN o sistema SHALL salvar o orçamento e permitir acesso à viagem
4. WHEN um participante visualiza a viagem THEN o sistema SHALL exibir apenas seu próprio orçamento pessoal
5. WHEN um participante visualiza a viagem THEN o sistema SHALL ocultar os orçamentos pessoais de outros participantes

### Requirement 2: Permissões de Participante

**User Story:** Como participante (não-owner) de uma viagem, eu quero ter acesso limitado às funcionalidades, para que apenas o dono possa gerenciar membros.

#### Acceptance Criteria

1. WHEN um participante (não-owner) visualiza a aba de gastos THEN o sistema SHALL ocultar o botão "Adicionar Participante"
2. WHEN um participante (não-owner) visualiza a viagem THEN o sistema SHALL ocultar os botões "Editar Viagem" e "Excluir"
3. WHEN um participante (não-owner) visualiza a viagem THEN o sistema SHALL permitir visualizar gastos, compras, roteiro e checklist
4. WHEN um participante (não-owner) visualiza a viagem THEN o sistema SHALL permitir adicionar gastos pessoais
5. WHEN um participante (não-owner) adiciona item no roteiro THEN o sistema SHALL salvar o item com sucesso
6. WHEN um participante (não-owner) adiciona item no checklist THEN o sistema SHALL salvar o item com sucesso
7. WHEN um participante (não-owner) marca item do checklist THEN o sistema SHALL atualizar o status com sucesso
8. WHEN o owner visualiza a viagem THEN o sistema SHALL exibir todos os controles de gerenciamento

### Requirement 8: Botão Nova Transação Global

**User Story:** Como usuário, eu quero que o botão de nova transação funcione em todas as páginas, para que eu possa adicionar transações de qualquer lugar.

#### Acceptance Criteria

1. WHEN um usuário está em qualquer página THEN o sistema SHALL exibir botão "Nova Transação" no header
2. WHEN um usuário clica em "Nova Transação" na página inicial THEN o sistema SHALL abrir modal de transação
3. WHEN um usuário clica em "Nova Transação" na página de contas THEN o sistema SHALL abrir modal de transação
4. WHEN um usuário clica em "Nova Transação" na página de viagens THEN o sistema SHALL abrir modal de transação
5. WHEN um usuário clica em "Nova Transação" na página de família THEN o sistema SHALL abrir modal de transação
6. WHEN o modal de transação abre THEN o sistema SHALL pré-selecionar contexto apropriado (conta, viagem, etc)
7. WHEN o modal de transação abre em uma viagem THEN o sistema SHALL pré-selecionar a viagem atual

### Requirement 3: Transferências Entre Contas

**User Story:** Como usuário, eu quero transferir dinheiro entre minhas contas, para que eu possa organizar meu dinheiro de forma flexível.

#### Acceptance Criteria

1. WHEN um usuário acessa uma conta THEN o sistema SHALL exibir botão "Transferir"
2. WHEN um usuário clica em "Transferir" THEN o sistema SHALL exibir modal com lista de contas de destino
3. WHEN um usuário seleciona conta de destino e valor THEN o sistema SHALL validar que o saldo é suficiente
4. WHEN uma transferência é confirmada THEN o sistema SHALL debitar da conta origem e creditar na conta destino
5. WHEN uma transferência é concluída THEN o sistema SHALL criar duas transações (débito e crédito) vinculadas
6. WHEN um usuário visualiza o extrato THEN o sistema SHALL exibir transferências com indicação de origem/destino

### Requirement 4: Saques em Dinheiro

**User Story:** Como usuário, eu quero sacar dinheiro da minha conta, para que eu possa registrar retiradas de caixa eletrônico ou banco.

#### Acceptance Criteria

1. WHEN um usuário acessa uma conta THEN o sistema SHALL exibir botão "Sacar"
2. WHEN um usuário clica em "Sacar" THEN o sistema SHALL exibir modal para informar valor do saque
3. WHEN um usuário confirma um saque THEN o sistema SHALL validar que o saldo é suficiente
4. WHEN um saque é confirmado THEN o sistema SHALL debitar o valor da conta
5. WHEN um saque é concluído THEN o sistema SHALL criar transação tipo "WITHDRAWAL" no extrato
6. WHEN um usuário visualiza o extrato THEN o sistema SHALL exibir saques com ícone e descrição apropriados

### Requirement 5: Depósito Inicial no Extrato

**User Story:** Como usuário, eu quero ver o depósito inicial no extrato quando crio uma conta com saldo, para que eu tenha histórico completo das movimentações.

#### Acceptance Criteria

1. WHEN um usuário cria uma conta com saldo inicial maior que zero THEN o sistema SHALL criar transação tipo "DEPOSIT" com descrição "Depósito inicial"
2. WHEN um usuário cria uma conta com saldo zero THEN o sistema SHALL NOT criar transação de depósito inicial
3. WHEN um usuário visualiza o extrato de uma conta THEN o sistema SHALL exibir o depósito inicial como primeira transação
4. WHEN um usuário visualiza o depósito inicial THEN o sistema SHALL exibir data de criação da conta
5. WHEN um usuário visualiza o depósito inicial THEN o sistema SHALL exibir ícone de depósito e valor em positivo

### Requirement 6: Vínculo de Viagens na Família

**User Story:** Como usuário no modo avançado, eu quero vincular viagens à família, para que eu possa organizar gastos compartilhados.

#### Acceptance Criteria

1. WHEN um usuário acessa "Família > Avançado" THEN o sistema SHALL carregar lista de viagens do usuário
2. WHEN a lista de viagens está vazia THEN o sistema SHALL exibir mensagem "Nenhuma viagem disponível"
3. WHEN a lista de viagens tem itens THEN o sistema SHALL exibir cada viagem com nome, destino e datas
4. WHEN um usuário seleciona uma viagem THEN o sistema SHALL vincular a viagem à família
5. WHEN uma viagem está vinculada THEN o sistema SHALL exibir indicador visual de vínculo ativo

### Requirement 7: Melhorias na Página de Contas

**User Story:** Como usuário, eu quero uma página de contas profissional como a de um banco, para que eu possa gerenciar melhor minhas finanças.

#### Acceptance Criteria

1. WHEN um usuário acessa a página de contas THEN o sistema SHALL exibir resumo de saldo total no topo
2. WHEN um usuário visualiza a página THEN o sistema SHALL exibir lista de contas em cards organizados
3. WHEN um usuário visualiza um card de conta THEN o sistema SHALL exibir logo do banco, nome da conta, tipo, número e saldo destacado
4. WHEN um usuário visualiza um card de conta THEN o sistema SHALL exibir últimas 3 transações resumidas
5. WHEN um usuário clica em uma conta THEN o sistema SHALL navegar para página de detalhes da conta
6. WHEN um usuário visualiza detalhes da conta THEN o sistema SHALL exibir header com informações da conta e botões de ação
7. WHEN um usuário visualiza detalhes da conta THEN o sistema SHALL exibir extrato completo agrupado por data
8. WHEN um usuário visualiza o extrato THEN o sistema SHALL exibir cada transação com ícone, descrição, data, categoria e valor
9. WHEN um usuário visualiza o extrato THEN o sistema SHALL usar cores consistentes (verde para entradas, vermelho para saídas)
10. WHEN um usuário visualiza detalhes da conta THEN o sistema SHALL exibir botões "Transferir", "Sacar", "Editar" e "Excluir"
11. WHEN um usuário visualiza a página principal THEN o sistema SHALL exibir botão destacado "Nova Conta"
12. WHEN um usuário visualiza a página THEN o sistema SHALL usar design limpo e profissional similar a apps bancários

## Special Requirements Guidance

### Transferências e Saques

As transferências e saques são operações críticas que afetam o saldo das contas. É essencial:
- Validar saldo antes de permitir operação
- Criar transações atômicas (ambas ou nenhuma)
- Manter integridade referencial entre transações vinculadas
- Exibir claramente no extrato a natureza da operação

### Orçamento Pessoal

O orçamento pessoal é privado e deve:
- Ser obrigatório para participantes
- Ser visível apenas para o próprio usuário
- Não ser compartilhado com outros membros
- Permitir edição a qualquer momento

### Permissões

As permissões devem ser verificadas no frontend E backend:
- Frontend: Ocultar botões/ações não permitidas
- Backend: Validar permissões em todas as operações
- RLS: Garantir que queries respeitam permissões
