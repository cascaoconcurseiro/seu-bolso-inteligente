# Requirements Document

## Introduction

Este documento especifica os requisitos para corrigir três bugs críticos no sistema de gerenciamento financeiro:
1. Viagens desaparecem após aceitar convite
2. Ausência de notificação quando convite de viagem é rejeitado
3. Loop infinito ao abrir formulário de nova transação

## Glossary

- **System**: O sistema de gerenciamento financeiro pessoal e compartilhado
- **Trip**: Viagem criada por um usuário para rastrear despesas
- **Trip_Invitation**: Convite enviado para outro usuário participar de uma viagem
- **Trip_Member**: Registro de membro participante de uma viagem
- **Transaction_Form**: Formulário para criar nova transação financeira
- **Query_Client**: Cliente de cache do React Query para gerenciar estado de dados
- **Dialog_Content**: Componente de interface para exibir conteúdo em modal

## Requirements

### Requirement 1: Visibilidade de Viagens Após Aceitar Convite

**User Story:** Como um usuário que aceita um convite de viagem, eu quero ver a viagem na minha lista de viagens, para que eu possa acessar e gerenciar as despesas da viagem.

#### Acceptance Criteria

1. WHEN um usuário aceita um convite de viagem, THE System SHALL adicionar o usuário à tabela trip_members com role 'member'
2. WHEN um usuário aceita um convite de viagem, THE System SHALL invalidar o cache de queries ['trips'] e ['trip-members'] para forçar atualização
3. WHEN a query de trips é executada, THE System SHALL buscar viagens onde o usuário é membro através da tabela trip_members
4. WHEN um convite é aceito, THE System SHALL garantir que tanto o criador quanto o convidado vejam a viagem em suas listas
5. WHEN um usuário visualiza a lista de viagens, THE System SHALL incluir todas as viagens onde o usuário aparece em trip_members

### Requirement 2: Notificação de Convite Rejeitado

**User Story:** Como um usuário que criou uma viagem e enviou convites, eu quero ser notificado quando alguém rejeita meu convite, para que eu saiba quem não participará da viagem.

#### Acceptance Criteria

1. WHEN um usuário rejeita um convite de viagem, THE System SHALL atualizar o status do convite para 'rejected'
2. WHEN um convite é rejeitado, THE System SHALL buscar dados da viagem e do usuário que rejeitou
3. WHEN um convite é rejeitado, THE System SHALL exibir uma notificação toast informando o nome da viagem e do usuário
4. WHEN um convite é rejeitado, THE System SHALL invalidar o cache de convites pendentes
5. WHEN um convite é rejeitado, THE System SHALL manter o registro no banco de dados para histórico

### Requirement 3: Prevenção de Loop Infinito no Formulário de Transação

**User Story:** Como um usuário que deseja criar uma nova transação, eu quero abrir o formulário sem que o sistema entre em loop infinito, para que eu possa registrar minhas despesas normalmente.

#### Acceptance Criteria

1. WHEN o formulário de transação é montado, THE System SHALL configurar staleTime e refetchOnWindowFocus nas queries para evitar re-buscas excessivas
2. WHEN a query de convites pendentes é executada, THE System SHALL limitar retentativas (retry) para evitar loops agressivos
3. WHEN o useEffect de detecção de duplicatas é executado, THE System SHALL usar debounce de 500ms para evitar execuções excessivas
4. WHEN o useEffect de detecção de duplicatas é executado, THE System SHALL verificar se allTransactions está carregado antes de processar
5. WHEN o DialogContent é renderizado, THE System SHALL incluir aria-describedby ou Description para eliminar warnings de acessibilidade
6. WHEN múltiplas queries são invalidadas simultaneamente, THE System SHALL usar batch updates para evitar re-renders excessivos

### Requirement 4: Correção da Query de Viagens

**User Story:** Como desenvolvedor, eu quero que a query de viagens busque corretamente através da tabela trip_members, para que o sistema funcione conforme o modelo de dados.

#### Acceptance Criteria

1. WHEN a query useTrips é executada, THE System SHALL buscar trip_ids da tabela trip_members onde user_id corresponde ao usuário atual
2. WHEN trip_ids são obtidos, THE System SHALL buscar viagens completas da tabela trips usando os IDs encontrados
3. WHEN nenhum trip_member é encontrado, THE System SHALL retornar array vazio sem erro
4. WHEN a query falha, THE System SHALL configurar retry como false para evitar loops
5. WHEN a query é bem-sucedida, THE System SHALL cachear resultados por 30 segundos (staleTime)

### Requirement 5: Melhoria no Hook de Aceitar Convite

**User Story:** Como desenvolvedor, eu quero que o hook useAcceptTripInvitation adicione o usuário como membro da viagem, para que a viagem apareça na lista do usuário.

#### Acceptance Criteria

1. WHEN um convite é aceito, THE System SHALL atualizar o status do convite para 'accepted'
2. WHEN o status é atualizado, THE System SHALL inserir registro em trip_members com user_id do convidado
3. WHEN o registro em trip_members é criado, THE System SHALL definir role como 'member'
4. WHEN o registro em trip_members é criado, THE System SHALL definir can_manage_expenses como true
5. WHEN todas operações são concluídas, THE System SHALL invalidar queries de trips, trip-members e pending-trip-invitations

### Requirement 6: Melhoria no Hook de Rejeitar Convite

**User Story:** Como desenvolvedor, eu quero que o hook useRejectTripInvitation notifique o criador da viagem, para que ele saiba que o convite foi recusado.

#### Acceptance Criteria

1. WHEN um convite é rejeitado, THE System SHALL buscar dados completos do convite incluindo trip e inviter
2. WHEN os dados são obtidos, THE System SHALL extrair nome da viagem e nome do usuário que rejeitou
3. WHEN a rejeição é bem-sucedida, THE System SHALL exibir toast com mensagem personalizada incluindo nomes
4. WHEN o toast é exibido, THE System SHALL usar duração de 5000ms para dar tempo de leitura
5. WHEN o toast é exibido, THE System SHALL incluir ícone apropriado para indicar rejeição

### Requirement 7: Otimização de Performance de Queries

**User Story:** Como desenvolvedor, eu quero que as queries sejam otimizadas para evitar loops e re-buscas desnecessárias, para que o sistema seja responsivo e estável.

#### Acceptance Criteria

1. WHEN queries são configuradas, THE System SHALL definir staleTime apropriado (30-60 segundos) para cachear dados
2. WHEN queries são configuradas, THE System SHALL definir refetchOnWindowFocus como false em queries propensas a loops
3. WHEN queries são configuradas, THE System SHALL limitar retry a 1 ou false em queries críticas
4. WHEN múltiplas invalidações ocorrem, THE System SHALL usar batch updates do React Query
5. WHEN useEffect depende de arrays, THE System SHALL incluir verificação de length antes de processar
