# Requirements Document

## Introduction

O sistema de viagens não está funcionando corretamente. As viagens não aparecem nem para o criador nem para os participantes adicionados. Há um erro de constraint de chave duplicada ao criar viagens. O sistema de compartilhamento de transações funciona perfeitamente e deve servir como modelo para corrigir o sistema de viagens.

## Glossary

- **Trip**: Viagem criada por um usuário para organizar despesas
- **Trip_Members**: Tabela que armazena os membros de uma viagem
- **Owner**: Criador da viagem
- **Member**: Participante da viagem
- **RLS**: Row Level Security - políticas de segurança do Supabase
- **Trigger**: Função automática executada no banco de dados
- **Mirror_Transaction**: Transação espelhada no sistema de compartilhamento
- **Shared_Transaction**: Transação compartilhada entre membros da família

## Requirements

### Requirement 1: Corrigir Inserção Automática do Owner

**User Story:** Como criador de uma viagem, quero que eu seja automaticamente adicionado como membro owner da viagem, para que eu possa visualizar e gerenciar a viagem sem erros.

#### Acceptance Criteria

1. WHEN um usuário cria uma viagem THEN o sistema SHALL adicionar automaticamente o criador como owner em trip_members sem causar erro de chave duplicada
2. WHEN o trigger add_trip_owner é executado THEN o sistema SHALL verificar se o owner já existe antes de inserir
3. WHEN há tentativa de inserção duplicada THEN o sistema SHALL ignorar silenciosamente o erro usando ON CONFLICT DO NOTHING
4. WHEN a viagem é criada THEN o sistema SHALL garantir que exatamente um registro de owner existe em trip_members

### Requirement 2: Garantir Visibilidade das Viagens

**User Story:** Como usuário do sistema, quero ver todas as viagens das quais sou membro (owner ou participante), para que eu possa acessar e gerenciar minhas viagens.

#### Acceptance Criteria

1. WHEN um usuário acessa a lista de viagens THEN o sistema SHALL retornar todas as viagens onde o usuário é membro em trip_members
2. WHEN as políticas RLS são avaliadas THEN o sistema SHALL permitir SELECT em trips para usuários que têm registro em trip_members
3. WHEN um owner cria uma viagem THEN o sistema SHALL garantir que a viagem apareça imediatamente na lista do owner
4. WHEN um membro é adicionado à viagem THEN o sistema SHALL garantir que a viagem apareça na lista desse membro

### Requirement 3: Simplificar Sistema de Convites

**User Story:** Como desenvolvedor, quero remover triggers e scripts desnecessários do sistema de convites, para que o código seja mais simples e manutenível.

#### Acceptance Criteria

1. WHEN o sistema de convites é revisado THEN o sistema SHALL manter apenas a funcionalidade essencial de criar e aceitar convites
2. WHEN um convite é aceito THEN o sistema SHALL adicionar o usuário em trip_members através de código da aplicação, não trigger
3. WHEN triggers obsoletos são identificados THEN o sistema SHALL removê-los do banco de dados
4. WHEN scripts de correção antigos são identificados THEN o sistema SHALL removê-los do repositório

### Requirement 4: Alinhar com Sistema de Compartilhamento

**User Story:** Como desenvolvedor, quero que o sistema de viagens funcione de forma similar ao sistema de compartilhamento de transações, para que haja consistência e confiabilidade.

#### Acceptance Criteria

1. WHEN o sistema de viagens é implementado THEN o sistema SHALL seguir os mesmos padrões de RLS do sistema de compartilhamento
2. WHEN transações de viagem são criadas THEN o sistema SHALL usar a mesma lógica de espelhamento do sistema de compartilhamento
3. WHEN membros são adicionados THEN o sistema SHALL usar INSERT direto via código da aplicação, similar ao sistema de compartilhamento
4. WHEN políticas RLS são criadas THEN o sistema SHALL evitar ambiguidades usando aliases explícitos nas queries

### Requirement 5: Limpar Banco de Dados

**User Story:** Como administrador do sistema, quero remover triggers, funções e scripts obsoletos, para que o banco de dados seja limpo e eficiente.

#### Acceptance Criteria

1. WHEN triggers obsoletos são identificados THEN o sistema SHALL criar script para removê-los
2. WHEN funções não utilizadas são identificadas THEN o sistema SHALL criar script para removê-las
3. WHEN scripts de correção antigos existem THEN o sistema SHALL documentar quais podem ser removidos
4. WHEN a limpeza é executada THEN o sistema SHALL manter apenas migrations essenciais e funcionais

### Requirement 6: Corrigir Frontend para Não Inserir Duplicatas

**User Story:** Como desenvolvedor frontend, quero que o código não tente inserir o owner manualmente em trip_members, para que não haja conflito com o trigger automático.

#### Acceptance Criteria

1. WHEN o hook useCreateTrip é executado THEN o sistema SHALL confiar no trigger do banco para adicionar o owner
2. WHEN membros adicionais são selecionados THEN o sistema SHALL criar apenas convites, não inserções diretas em trip_members
3. WHEN o código frontend é revisado THEN o sistema SHALL remover comentários sobre inserção manual do owner
4. WHEN a viagem é criada THEN o sistema SHALL invalidar as queries corretas para atualizar a UI

### Requirement 7: Garantir Funcionamento de Convites

**User Story:** Como usuário, quero convidar outros membros para minhas viagens, para que possamos compartilhar despesas de forma organizada.

#### Acceptance Criteria

1. WHEN um convite é criado THEN o sistema SHALL armazenar inviter_id, invitee_id e trip_id
2. WHEN um convite é aceito THEN o sistema SHALL adicionar o invitee_id em trip_members com role 'member'
3. WHEN um convite é aceito THEN o sistema SHALL atualizar o status do convite para 'accepted'
4. WHEN um usuário tem convites pendentes THEN o sistema SHALL exibi-los na interface

### Requirement 8: Validar Integridade dos Dados

**User Story:** Como administrador, quero garantir que não há dados inconsistentes no banco, para que o sistema funcione corretamente.

#### Acceptance Criteria

1. WHEN viagens existem THEN o sistema SHALL garantir que cada viagem tem pelo menos um owner em trip_members
2. WHEN trip_members são consultados THEN o sistema SHALL garantir que não há registros duplicados de (trip_id, user_id)
3. WHEN convites aceitos existem THEN o sistema SHALL garantir que há registro correspondente em trip_members
4. WHEN dados inconsistentes são encontrados THEN o sistema SHALL fornecer script de correção
