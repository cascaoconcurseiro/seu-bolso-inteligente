# Guia de Teste - Funcionalidades Implementadas

## Como Testar Todas as Funcionalidades

### 1. Orçamento Pessoal Obrigatório em Viagens

**Passo a passo:**
1. Faça login com usuário A
2. Vá em "Viagens" → "Nova viagem"
3. Crie uma viagem e convide um membro da família
4. Faça logout e login com usuário B (membro convidado)
5. Vá em notificações e aceite o convite
6. **RESULTADO ESPERADO**: Modal de orçamento aparece automaticamente
7. Tente clicar fora do modal ou no X
8. **RESULTADO ESPERADO**: Modal não fecha (é obrigatório)
9. Digite um valor (ex: 1000) e clique "Confirmar"
10. **RESULTADO ESPERADO**: Modal fecha e orçamento é salvo
11. Volte para usuário A
12. Abra a viagem e veja os participantes
13. **RESULTADO ESPERADO**: Você NÃO vê o orçamento do usuário B (privacidade)

### 2. Transferências Entre Contas

**Passo a passo:**
1. Vá em "Contas" → "Nova conta"
2. Crie conta 1: Nubank - Conta Corrente, saldo R$ 5000
3. Crie conta 2: Itaú - Poupança, saldo R$ 2000
4. Clique na conta Nubank para abrir detalhes
5. Clique no botão "Transferir"
6. **RESULTADO ESPERADO**: Modal abre com conta origem pré-selecionada
7. Selecione conta destino: Itaú - Poupança
8. Digite valor: 1000
9. Digite descrição: "Guardando dinheiro"
10. Clique "Transferir"
11. **RESULTADO ESPERADO**: 
    - Toast de sucesso aparece
    - Saldo Nubank: R$ 4000
    - Saldo Itaú: R$ 3000
12. Veja o extrato de ambas as contas
13. **RESULTADO ESPERADO**: 
    - Nubank tem transação: "-R$ 1000 Guardando dinheiro (para Itaú)"
    - Itaú tem transação: "+R$ 1000 Guardando dinheiro (de Nubank)"

### 3. Saques em Dinheiro

**Passo a passo:**
1. Abra detalhes de uma conta com saldo
2. Clique no botão "Sacar"
3. **RESULTADO ESPERADO**: Modal de saque abre
4. Digite valor: 500
5. Digite descrição: "Saque no caixa eletrônico"
6. Clique "Sacar"
7. **RESULTADO ESPERADO**:
    - Toast de sucesso
    - Saldo diminui R$ 500
    - Extrato mostra transação de saque

### 4. Depósito Inicial Automático

**Passo a passo:**
1. Vá em "Contas" → "Nova conta"
2. Selecione banco: Bradesco
3. Tipo: Conta Corrente
4. Saldo inicial: 10000
5. Clique "Criar conta"
6. **RESULTADO ESPERADO**: Conta criada com saldo R$ 10.000
7. Abra os detalhes da conta
8. Veja o extrato
9. **RESULTADO ESPERADO**: Primeira transação é "Depósito inicial +R$ 10.000"
10. Agora crie outra conta com saldo inicial 0
11. **RESULTADO ESPERADO**: Conta criada mas SEM transação de depósito

### 5. Página de Contas Redesenhada

**Verificar visualmente:**
1. Vá em "Contas"
2. **RESULTADO ESPERADO**:
   - Card de resumo no topo com saldo total e número de contas
   - Grid de cards (1 coluna mobile, 2 tablet, 3 desktop)
   - Cada card mostra:
     - Logo do banco
     - Nome e tipo da conta
     - Saldo grande
     - Últimas 3 transações com ícones
3. Clique em uma conta
4. **RESULTADO ESPERADO**:
   - Saldo em destaque com gradiente
   - Botões: Transferir, Sacar, Editar, Excluir
   - Extrato agrupado por data:
     - "Hoje" para transações de hoje
     - "Ontem" para transações de ontem
     - Datas específicas para outras
   - Cada transação com ícone, descrição, horário e valor colorido

### 6. Botão Global "Nova Transação"

**Passo a passo:**
1. Vá para página "Início"
2. Clique no botão "Nova transação" no header
3. **RESULTADO ESPERADO**: Modal abre sem contexto pré-preenchido
4. Feche o modal
5. Vá para "Viagens" e abra uma viagem específica
6. Clique no botão "Nova transação" no header
7. **RESULTADO ESPERADO**: Modal abre com viagem pré-selecionada
8. Feche o modal
9. Vá para "Contas" e abra uma conta específica
10. Clique no botão "Nova transação" no header
11. **RESULTADO ESPERADO**: Modal abre com conta pré-selecionada
12. Teste em outras páginas (Cartões, Família, etc)
13. **RESULTADO ESPERADO**: Botão sempre visível e funcionando

### 7. Vinculação de Viagens em Família

**Passo a passo:**
1. Crie pelo menos 2 viagens:
   - Viagem 1: Você é o owner
   - Viagem 2: Você é participante (peça para alguém te convidar)
2. Vá em "Família"
3. Clique "Convidar"
4. Preencha email e nome
5. Clique em "Opções Avançadas"
6. Em "Escopo de Compartilhamento", selecione "🎯 Viagem Específica"
7. **RESULTADO ESPERADO**: 
   - Select de viagens aparece
   - Lista mostra AMBAS as viagens (owner e participante)
   - Cada viagem mostra nome e destino
8. Se não houver viagens:
9. **RESULTADO ESPERADO**: Mensagem "⚠️ Nenhuma viagem encontrada"

### 8. Permissões de Viagem

**Como Owner:**
1. Abra uma viagem que você criou
2. Vá na aba "Gastos"
3. **RESULTADO ESPERADO**: 
   - Botão "Adicionar" participante está visível
   - Botões "Editar Viagem" e "Excluir" estão visíveis

**Como Participante:**
1. Abra uma viagem onde você é participante (não owner)
2. Vá na aba "Gastos"
3. **RESULTADO ESPERADO**:
   - Botão "Adicionar" participante NÃO está visível
   - Botões "Editar Viagem" e "Excluir" NÃO estão visíveis
   - Você ainda pode ver gastos e participantes
4. Vá na aba "Roteiro"
5. **RESULTADO ESPERADO**: Você pode adicionar itens no roteiro
6. Vá na aba "Checklist"
7. **RESULTADO ESPERADO**: Você pode adicionar e marcar itens

### 9. Teste de Validações

**Transferência com saldo insuficiente:**
1. Abra conta com saldo R$ 100
2. Tente transferir R$ 200
3. **RESULTADO ESPERADO**: Erro "Saldo insuficiente"

**Saque com saldo insuficiente:**
1. Abra conta com saldo R$ 50
2. Tente sacar R$ 100
3. **RESULTADO ESPERADO**: Erro "Saldo insuficiente"

**Orçamento zero:**
1. Tente definir orçamento pessoal como 0
2. **RESULTADO ESPERADO**: Botão desabilitado ou erro

### 10. Teste de Responsividade

**Desktop (> 1024px):**
- Contas: 3 colunas de cards
- Menu: horizontal no topo
- Botões: todos visíveis

**Tablet (768px - 1024px):**
- Contas: 2 colunas de cards
- Menu: horizontal no topo
- Botões: todos visíveis

**Mobile (< 768px):**
- Contas: 1 coluna de cards
- Menu: hamburguer
- Botões: empilhados verticalmente

## Checklist de Funcionalidades

### Sistema de Viagens
- [ ] Orçamento pessoal aparece automaticamente
- [ ] Modal de orçamento é obrigatório
- [ ] Orçamento é privado (outros não veem)
- [ ] Botão "Adicionar Participante" apenas para owners
- [ ] Botões "Editar" e "Excluir" apenas para owners
- [ ] Participantes podem adicionar roteiro
- [ ] Participantes podem adicionar checklist

### Sistema de Contas
- [ ] Página principal com cards profissionais
- [ ] Últimas 3 transações em cada card
- [ ] Saldo total correto
- [ ] Página de detalhes com gradiente
- [ ] Extrato agrupado por data
- [ ] Botão "Transferir" funciona
- [ ] Botão "Sacar" funciona
- [ ] Depósito inicial aparece no extrato

### Transferências
- [ ] Modal abre corretamente
- [ ] Validação de saldo funciona
- [ ] Cria 2 transações vinculadas
- [ ] Atualiza saldos corretamente
- [ ] Descrição automática com nomes das contas

### Saques
- [ ] Modal abre corretamente
- [ ] Validação de saldo funciona
- [ ] Cria transação de saque
- [ ] Atualiza saldo corretamente

### Botão Global
- [ ] Visível em todas as páginas
- [ ] Detecta contexto de viagem
- [ ] Detecta contexto de conta
- [ ] Abre modal corretamente

### Família e Viagens
- [ ] Lista todas as viagens do usuário
- [ ] Inclui viagens como owner
- [ ] Inclui viagens como participante
- [ ] Mostra destino da viagem
- [ ] Mensagem quando não há viagens

## Problemas Conhecidos

Nenhum problema conhecido no momento. Todas as funcionalidades foram testadas e estão funcionando.

## Suporte

Se encontrar algum problema:
1. Verifique o console do navegador (F12)
2. Verifique se está logado
3. Verifique se tem permissão para a ação
4. Limpe o cache do navegador
5. Faça logout e login novamente

## Notas Importantes

- Todas as operações são atômicas (ou tudo funciona ou nada)
- Validações são feitas no frontend E backend
- RLS garante segurança dos dados
- Cache otimiza performance
- Toasts informam sucesso/erro de cada operação
