# ✅ CHECKLIST COMPLETO DE TESTES DE PRODUÇÃO

## 📋 INSTRUÇÕES
Este checklist deve ser executado manualmente antes do lançamento público. Marque cada item após testar.

---

## 🔐 1. AUTENTICAÇÃO E PERFIL

### 1.1 Registro e Login
- [ ] Criar nova conta com email válido
- [ ] Verificar email de confirmação
- [ ] Fazer login com credenciais corretas
- [ ] Tentar login com credenciais incorretas (deve falhar)
- [ ] Fazer logout
- [ ] Recuperar senha (esqueci minha senha)
- [ ] Verificar redirecionamento após login

### 1.2 Perfil do Usuário
- [ ] Visualizar perfil
- [ ] Editar nome completo
- [ ] Fazer upload de avatar
- [ ] Alterar email
- [ ] Alterar senha
- [ ] Verificar que mudanças são salvas

---

## 💰 2. CONTAS BANCÁRIAS

### 2.1 Criar Contas
- [ ] Criar conta corrente (CHECKING)
- [ ] Criar conta poupança (SAVINGS)
- [ ] Criar conta investimento (INVESTMENT)
- [ ] Criar conta dinheiro (CASH)
- [ ] Criar conta internacional (USD, EUR, etc.)
- [ ] Verificar que saldo inicial é aplicado corretamente

### 2.2 Gerenciar Contas
- [ ] Editar nome da conta
- [ ] Editar banco
- [ ] Editar saldo inicial
- [ ] Desativar conta
- [ ] Reativar conta
- [ ] Excluir conta (verificar se transações são mantidas ou removidas)
- [ ] Verificar que não é possível excluir conta com transações

### 2.3 Visualização
- [ ] Ver lista de todas as contas
- [ ] Ver saldo total consolidado
- [ ] Ver saldo por moeda (BRL, USD, EUR)
- [ ] Ver extrato de uma conta específica
- [ ] Filtrar extrato por período
- [ ] Verificar que saldo é calculado corretamente

---

## 💳 3. CARTÕES DE CRÉDITO

### 3.1 Criar Cartões
- [ ] Criar cartão de crédito
- [ ] Definir dia de vencimento
- [ ] Definir dia de fechamento
- [ ] Definir limite
- [ ] Associar a um banco

### 3.2 Gerenciar Cartões
- [ ] Editar informações do cartão
- [ ] Alterar limite
- [ ] Alterar datas de vencimento/fechamento
- [ ] Desativar cartão
- [ ] Excluir cartão

### 3.3 Faturas
- [ ] Ver fatura atual
- [ ] Ver fatura futura
- [ ] Ver histórico de faturas
- [ ] Verificar que transações aparecem na fatura correta
- [ ] Pagar fatura (criar transação de pagamento)
- [ ] Verificar que saldo do cartão zera após pagamento

---

## 📊 4. TRANSAÇÕES NORMAIS

### 4.1 Criar Transações
- [ ] Criar despesa simples
- [ ] Criar receita simples
- [ ] Criar despesa com categoria
- [ ] Criar despesa sem categoria
- [ ] Criar transação com data futura
- [ ] Criar transação com data passada
- [ ] Criar transação com notas/observações
- [ ] Verificar que saldo da conta é atualizado imediatamente

### 4.2 Editar Transações
- [ ] Editar descrição
- [ ] Editar valor
- [ ] Editar data
- [ ] Editar categoria
- [ ] Editar conta
- [ ] Verificar que saldo é recalculado corretamente

### 4.3 Excluir Transações
- [ ] Excluir transação simples
- [ ] Verificar que saldo é recalculado
- [ ] Verificar que não é possível recuperar após exclusão

### 4.4 Filtros e Busca
- [ ] Filtrar por tipo (receita/despesa)
- [ ] Filtrar por conta
- [ ] Filtrar por categoria
- [ ] Filtrar por período
- [ ] Buscar por descrição
- [ ] Combinar múltiplos filtros

---

## 🔄 5. TRANSFERÊNCIAS ENTRE CONTAS

### 5.1 Transferências Nacionais
- [ ] Transferir entre contas BRL
- [ ] Verificar que valor sai da conta origem
- [ ] Verificar que valor entra na conta destino
- [ ] Verificar que saldo total permanece o mesmo
- [ ] Editar transferência
- [ ] Excluir transferência (verificar efeito cascata)

### 5.2 Transferências Internacionais
- [ ] Transferir de BRL para USD
- [ ] Definir taxa de câmbio
- [ ] Verificar conversão correta
- [ ] Transferir de USD para EUR
- [ ] Verificar que saldos em moedas diferentes são mantidos separados

---

## 💸 6. TRANSAÇÕES PARCELADAS

### 6.1 Criar Parcelamento
- [ ] Criar despesa parcelada (3x, 6x, 12x)
- [ ] Verificar que todas as parcelas são criadas
- [ ] Verificar que datas estão corretas (mês a mês)
- [ ] Verificar que valores estão corretos
- [ ] Verificar que última parcela ajusta centavos
- [ ] Criar parcelamento com data no meio do mês (ex: dia 15)

### 6.2 Gerenciar Parcelamento
- [ ] Editar descrição de todas as parcelas
- [ ] Editar categoria de todas as parcelas
- [ ] Editar apenas parcelas futuras
- [ ] Excluir uma parcela individual
- [ ] Excluir todas as parcelas da série
- [ ] Excluir apenas parcelas futuras
- [ ] Verificar que saldo é recalculado corretamente

### 6.3 Parcelamento Compartilhado
- [ ] Criar despesa parcelada compartilhada
- [ ] Verificar que splits são criados para cada parcela
- [ ] Verificar que valores dos splits estão corretos
- [ ] Verificar que transações espelhadas são criadas para cada parcela

---

## 👥 7. SISTEMA DE FAMÍLIA

### 7.1 Criar Família
- [ ] Criar nova família
- [ ] Definir nome da família
- [ ] Verificar que criador é admin

### 7.2 Adicionar Membros
- [ ] Adicionar membro por email (usuário existente)
- [ ] Adicionar membro por email (usuário novo - convite)
- [ ] Definir permissões (admin/editor/viewer)
- [ ] Definir escopo de compartilhamento (all/trips_only/date_range/specific_trip)

### 7.3 Convites
- [ ] Enviar convite
- [ ] Verificar que notificação é criada
- [ ] Aceitar convite (como convidado)
- [ ] Recusar convite
- [ ] Cancelar convite (como remetente)
- [ ] Verificar convites pendentes

### 7.4 Gerenciar Membros
- [ ] Editar permissões de membro
- [ ] Editar escopo de compartilhamento
- [ ] Remover membro
- [ ] Sair da família (como membro)
- [ ] Transferir propriedade (como admin)

---

## 🤝 8. TRANSAÇÕES COMPARTILHADAS

### 8.1 Criar Despesa Compartilhada
- [ ] Criar despesa e marcar como compartilhada
- [ ] Selecionar membros para dividir
- [ ] Dividir igualmente (50/50, 33/33/33)
- [ ] Dividir por percentual customizado (60/40, 70/30)
- [ ] Verificar que soma dos percentuais = 100%
- [ ] Verificar que valores são calculados corretamente

### 8.2 Espelhamento de Transações
- [ ] Verificar que transação espelhada é criada para cada membro
- [ ] Verificar que membro vê a despesa na sua lista
- [ ] Verificar que descrição indica "Paga por [Nome]"
- [ ] Verificar que valor está correto
- [ ] Verificar que categoria é mantida

### 8.3 Ledger Financeiro
- [ ] Verificar que entradas de DEBIT são criadas para quem deve
- [ ] Verificar que entradas de CREDIT são criadas para quem pagou
- [ ] Calcular saldo entre dois usuários
- [ ] Verificar que saldo é simétrico (A deve X para B = B recebe X de A)

### 8.4 Visualização de Compartilhados
- [ ] Ver aba "Compartilhados"
- [ ] Ver lista de membros
- [ ] Ver saldo com cada membro (quanto devo / quanto me devem)
- [ ] Filtrar por mês
- [ ] Ver histórico de transações compartilhadas
- [ ] Ver detalhes de cada transação

### 8.5 Acerto de Contas
- [ ] Marcar split como pago
- [ ] Verificar que saldo é atualizado
- [ ] Marcar múltiplos splits como pagos
- [ ] Desfazer acerto de contas
- [ ] Criar transação de acerto (transferência)
- [ ] Verificar que ledger é atualizado

---

## 🧳 9. VIAGENS

### 9.1 Criar Viagem
- [ ] Criar nova viagem
- [ ] Definir nome e destino
- [ ] Definir datas (início e fim)
- [ ] Definir moeda da viagem
- [ ] Definir orçamento total
- [ ] Adicionar notas
- [ ] Fazer upload de foto de capa

### 9.2 Adicionar Participantes
- [ ] Adicionar membros da família
- [ ] Adicionar participantes externos (não usuários)
- [ ] Definir orçamento pessoal para cada participante
- [ ] Enviar convites

### 9.3 Convites de Viagem
- [ ] Enviar convite para viagem
- [ ] Verificar notificação
- [ ] Aceitar convite
- [ ] Recusar convite
- [ ] Cancelar convite

### 9.4 Transações de Viagem
- [ ] Criar despesa na viagem
- [ ] Criar despesa compartilhada na viagem
- [ ] Criar despesa em moeda estrangeira
- [ ] Registrar câmbio (compra de moeda)
- [ ] Verificar que transações aparecem no resumo da viagem

### 9.5 Abas da Viagem
- [ ] **Resumo**: Ver orçamento total, gasto, restante
- [ ] **Transações**: Ver todas as transações da viagem
- [ ] **Membros**: Ver lista de participantes e orçamentos pessoais
- [ ] **Câmbio**: Ver histórico de câmbio
- [ ] **Compartilhados**: Ver divisões entre participantes
- [ ] **Configurações**: Editar informações da viagem

### 9.6 Cálculos de Viagem
- [ ] Verificar que gasto total está correto
- [ ] Verificar que orçamento restante está correto
- [ ] Verificar que gasto pessoal está correto
- [ ] Verificar que conversões de moeda estão corretas
- [ ] Verificar que divisões entre participantes estão corretas

### 9.7 Finalizar Viagem
- [ ] Marcar viagem como concluída
- [ ] Verificar que não é possível adicionar transações
- [ ] Gerar relatório final
- [ ] Arquivar viagem

---

## 💱 10. CÂMBIO E MOEDAS ESTRANGEIRAS

### 10.1 Contas Internacionais
- [ ] Criar conta em USD
- [ ] Criar conta em EUR
- [ ] Criar conta em outras moedas
- [ ] Verificar que saldos são exibidos separadamente

### 10.2 Transações em Moeda Estrangeira
- [ ] Criar despesa em USD
- [ ] Criar receita em EUR
- [ ] Verificar que valor é mantido na moeda original
- [ ] Verificar conversão para BRL (se aplicável)

### 10.3 Câmbio em Viagens
- [ ] Registrar compra de moeda estrangeira
- [ ] Definir taxa de câmbio
- [ ] Verificar que saldo em moeda estrangeira aumenta
- [ ] Verificar que saldo em BRL diminui
- [ ] Registrar venda de moeda estrangeira

---

## 📈 11. CÁLCULOS FINANCEIROS

### 11.1 Saldo Atual
- [ ] Verificar saldo total em BRL
- [ ] Verificar saldo por conta
- [ ] Verificar saldo por moeda
- [ ] Verificar que saldo é calculado corretamente após cada transação
- [ ] Verificar que transferências não alteram saldo total

### 11.2 Receitas e Despesas
- [ ] Verificar total de receitas do mês
- [ ] Verificar total de despesas do mês
- [ ] Verificar saldo do mês (receitas - despesas)
- [ ] Filtrar por categoria
- [ ] Filtrar por período

### 11.3 Projeção Mensal
- [ ] Ver projeção de saldo no fim do mês
- [ ] Verificar que inclui receitas futuras
- [ ] Verificar que inclui despesas futuras
- [ ] Verificar que inclui parcelas futuras
- [ ] Verificar que inclui faturas de cartão
- [ ] Verificar que inclui dívidas compartilhadas

### 11.4 Faturas de Cartão
- [ ] Verificar valor da fatura atual
- [ ] Verificar que inclui todas as transações do período
- [ ] Verificar que respeita data de fechamento
- [ ] Verificar que parcelas futuras não aparecem na fatura atual

### 11.5 Compartilhados
- [ ] Calcular total que me devem
- [ ] Calcular total que eu devo
- [ ] Calcular saldo líquido
- [ ] Verificar por membro
- [ ] Verificar por moeda

---

## 🎯 12. ORÇAMENTOS

### 12.1 Criar Orçamento
- [ ] Criar orçamento mensal por categoria
- [ ] Definir valor limite
- [ ] Definir período (mensal/anual)
- [ ] Ativar alertas

### 12.2 Acompanhar Orçamento
- [ ] Ver progresso do orçamento
- [ ] Ver percentual gasto
- [ ] Ver valor restante
- [ ] Receber alerta ao atingir 80%
- [ ] Receber alerta ao atingir 100%

### 12.3 Gerenciar Orçamentos
- [ ] Editar valor do orçamento
- [ ] Desativar orçamento
- [ ] Excluir orçamento
- [ ] Renovar orçamento automaticamente

---

## 🔔 13. NOTIFICAÇÕES

### 13.1 Tipos de Notificações
- [ ] Notificação de convite de família
- [ ] Notificação de convite de viagem
- [ ] Notificação de despesa compartilhada
- [ ] Notificação de acerto de contas
- [ ] Notificação de orçamento (80%, 100%)
- [ ] Notificação de fatura próxima do vencimento

### 13.2 Gerenciar Notificações
- [ ] Ver lista de notificações
- [ ] Marcar como lida
- [ ] Marcar todas como lidas
- [ ] Excluir notificação
- [ ] Configurar preferências de notificação

---

## 📊 14. RELATÓRIOS

### 14.1 Relatórios Disponíveis
- [ ] Relatório de receitas e despesas
- [ ] Relatório por categoria
- [ ] Relatório por conta
- [ ] Relatório de viagens
- [ ] Relatório de compartilhados
- [ ] Gráfico de evolução patrimonial

### 14.2 Filtros e Exportação
- [ ] Filtrar por período
- [ ] Filtrar por categoria
- [ ] Filtrar por conta
- [ ] Exportar para CSV
- [ ] Exportar para PDF
- [ ] Imprimir relatório

---

## 🔒 15. SEGURANÇA E PERMISSÕES

### 15.1 Row Level Security (RLS)
- [ ] Verificar que usuário só vê suas próprias transações
- [ ] Verificar que usuário só vê suas próprias contas
- [ ] Verificar que membro de família vê transações compartilhadas
- [ ] Verificar que membro de viagem vê transações da viagem
- [ ] Tentar acessar dados de outro usuário (deve falhar)

### 15.2 Permissões de Família
- [ ] Admin pode adicionar/remover membros
- [ ] Admin pode editar permissões
- [ ] Editor pode criar transações compartilhadas
- [ ] Viewer só pode visualizar
- [ ] Verificar que permissões são respeitadas

### 15.3 Permissões de Viagem
- [ ] Owner pode editar viagem
- [ ] Owner pode adicionar/remover participantes
- [ ] Participante pode criar transações
- [ ] Participante pode ver transações da viagem
- [ ] Não participante não vê a viagem

---

## 🧪 16. TESTES DE INTEGRIDADE

### 16.1 Efeito Cascata
- [ ] Excluir transação compartilhada (verificar que splits são removidos)
- [ ] Excluir transação compartilhada (verificar que espelhadas são removidas)
- [ ] Excluir transação compartilhada (verificar que ledger é atualizado)
- [ ] Excluir conta (verificar que transações são mantidas ou removidas)
- [ ] Excluir membro de família (verificar que transações compartilhadas são mantidas)

### 16.2 Consistência de Dados
- [ ] Verificar que soma dos splits = valor total da transação
- [ ] Verificar que saldo da conta = soma das transações
- [ ] Verificar que ledger está balanceado (débitos = créditos)
- [ ] Verificar que não há transações duplicadas
- [ ] Verificar que não há splits órfãos

### 16.3 Validações
- [ ] Tentar criar transação com valor zero (deve falhar)
- [ ] Tentar criar transação com valor negativo (deve falhar)
- [ ] Tentar criar transação sem descrição (deve falhar)
- [ ] Tentar criar transação compartilhada sem splits (deve falhar)
- [ ] Tentar criar splits com soma > 100% (deve falhar)

---

## 🌐 17. INTERFACE E UX

### 17.1 Responsividade
- [ ] Testar em desktop (1920x1080)
- [ ] Testar em laptop (1366x768)
- [ ] Testar em tablet (768x1024)
- [ ] Testar em mobile (375x667)
- [ ] Verificar que todos os elementos são acessíveis

### 17.2 Navegação
- [ ] Testar menu principal
- [ ] Testar navegação entre páginas
- [ ] Testar botão voltar
- [ ] Testar breadcrumbs
- [ ] Verificar que URLs são amigáveis

### 17.3 Feedback Visual
- [ ] Verificar loading states
- [ ] Verificar mensagens de sucesso
- [ ] Verificar mensagens de erro
- [ ] Verificar tooltips
- [ ] Verificar animações

### 17.4 Acessibilidade
- [ ] Testar navegação por teclado
- [ ] Testar com leitor de tela
- [ ] Verificar contraste de cores
- [ ] Verificar tamanho de fontes
- [ ] Verificar labels de formulários

---

## ⚡ 18. PERFORMANCE

### 18.1 Tempo de Carregamento
- [ ] Dashboard carrega em < 2s
- [ ] Lista de transações carrega em < 2s
- [ ] Filtros aplicam em < 1s
- [ ] Criação de transação em < 1s
- [ ] Cálculos financeiros em < 1s

### 18.2 Otimizações
- [ ] Verificar que queries são otimizadas
- [ ] Verificar que índices estão criados
- [ ] Verificar que cache está funcionando
- [ ] Verificar que imagens são otimizadas
- [ ] Verificar que bundle JS é minificado

---

## 🐛 19. TESTES DE EDGE CASES

### 19.1 Valores Extremos
- [ ] Criar transação com valor muito alto (R$ 1.000.000,00)
- [ ] Criar transação com valor muito baixo (R$ 0,01)
- [ ] Criar transação com muitas casas decimais
- [ ] Criar parcelamento com muitas parcelas (24x, 36x)

### 19.2 Datas Extremas
- [ ] Criar transação com data muito antiga (10 anos atrás)
- [ ] Criar transação com data muito futura (10 anos à frente)
- [ ] Criar transação no dia 29/02 (ano bissexto)
- [ ] Criar transação no dia 31 (meses com 30 dias)

### 19.3 Textos Longos
- [ ] Criar transação com descrição muito longa (500 caracteres)
- [ ] Criar conta com nome muito longo
- [ ] Criar categoria com nome muito longo
- [ ] Adicionar notas muito longas

### 19.4 Caracteres Especiais
- [ ] Criar transação com emojis na descrição
- [ ] Criar conta com caracteres especiais
- [ ] Criar categoria com acentos
- [ ] Testar SQL injection (deve ser bloqueado)
- [ ] Testar XSS (deve ser bloqueado)

---

## 🔄 20. TESTES DE CONCORRÊNCIA

### 20.1 Múltiplos Usuários
- [ ] Dois usuários editam mesma transação compartilhada
- [ ] Dois usuários acertam contas simultaneamente
- [ ] Dois usuários adicionam transações na mesma conta
- [ ] Verificar que não há race conditions

### 20.2 Múltiplas Sessões
- [ ] Abrir sistema em duas abas
- [ ] Criar transação em uma aba
- [ ] Verificar que outra aba atualiza
- [ ] Fazer logout em uma aba
- [ ] Verificar que outra aba redireciona

---

## ✅ CRITÉRIOS DE APROVAÇÃO

Para aprovar o sistema para produção, TODOS os itens devem estar marcados e funcionando corretamente.

### Problemas Críticos (Bloqueiam lançamento)
- [ ] Nenhum erro de autenticação
- [ ] Nenhum erro de cálculo financeiro
- [ ] Nenhum erro de integridade de dados
- [ ] Nenhuma vulnerabilidade de segurança
- [ ] Nenhum erro de RLS

### Problemas Graves (Devem ser corrigidos antes do lançamento)
- [ ] Nenhum erro de interface crítico
- [ ] Nenhum erro de performance grave
- [ ] Nenhum erro de responsividade crítico

### Problemas Menores (Podem ser corrigidos após lançamento)
- [ ] Pequenos ajustes de UX
- [ ] Melhorias de performance não críticas
- [ ] Ajustes de texto e tradução

---

## 📝 NOTAS E OBSERVAÇÕES

### Problemas Encontrados
```
[Listar aqui todos os problemas encontrados durante os testes]
```

### Melhorias Sugeridas
```
[Listar aqui sugestões de melhorias]
```

### Decisões Tomadas
```
[Documentar decisões importantes tomadas durante os testes]
```

---

**Data da Auditoria:** 31/12/2024  
**Responsável:** [Nome]  
**Status:** [ ] Aprovado [ ] Reprovado [ ] Aprovado com ressalvas
