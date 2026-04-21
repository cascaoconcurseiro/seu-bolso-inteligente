# 📱 PROMPT COMPLETO - Seu Bolso Inteligente APK

## 🎯 OBJETIVO
Criar um aplicativo Android (APK) completo que seja uma cópia fiel do sistema web "Seu Bolso Inteligente" com TODAS as funcionalidades existentes.

---

## 📋 ESPECIFICAÇÕES TÉCNICAS

### Stack Tecnológico
- **Framework:** React Native ou Flutter
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **State Management:** React Query / TanStack Query
- **UI Components:** React Native Paper ou Flutter Material
- **Navegação:** React Navigation ou Flutter Navigator
- **Gráficos:** Recharts Native ou FL Chart
- **Formulários:** React Hook Form ou Flutter Forms
- **Validação:** Zod
- **Notificações:** Firebase Cloud Messaging
- **Armazenamento Local:** AsyncStorage ou Hive
- **Idioma:** Português (Brasil)

---

## 🏗️ ARQUITETURA DO SISTEMA

### 1. AUTENTICAÇÃO E USUÁRIOS
**Funcionalidades:**
- ✅ Login com email e senha
- ✅ Cadastro de novo usuário
- ✅ Recuperação de senha
- ✅ Logout
- ✅ Sessão persistente
- ✅ Perfil do usuário (nome, avatar, email)
- ✅ Edição de perfil
- ✅ Troca de senha

**Telas:**
- Login/Cadastro
- Recuperar Senha
- Perfil do Usuário
- Configurações de Conta

---

### 2. DASHBOARD (Tela Principal)
**Funcionalidades:**
- ✅ Resumo financeiro do mês atual
  - Saldo total de todas as contas
  - Total de receitas do mês
  - Total de despesas do mês
  - Economia/Poupança do mês
- ✅ Seletor de mês (navegação entre meses)
- ✅ Gráfico de evolução mensal (últimos 12 meses)
- ✅ Gráfico de despesas por categoria (pizza)
- ✅ Lista de transações recentes (últimas 10)
- ✅ Alertas e notificações importantes
- ✅ Orçamentos em alerta (acima de 80%)
- ✅ Faturas de cartão próximas do vencimento
- ✅ Frases motivacionais financeiras
- ✅ Saudação personalizada (Bom dia/tarde/noite)

**Componentes:**
- Card de resumo financeiro
- Gráfico de linha (evolução)
- Gráfico de pizza (categorias)
- Lista de transações
- Cards de alertas
- Seletor de mês

---

### 3. TRANSAÇÕES
**Funcionalidades:**
- ✅ Listar todas as transações do mês
- ✅ Filtros:
  - Por tipo (Receita/Despesa/Transferência)
  - Por conta
  - Por categoria
  - Por período (data início/fim)
  - Por domínio (Pessoal/Compartilhado/Viagem)
- ✅ Criar nova transação
  - Tipo: Receita, Despesa, Transferência
  - Valor
  - Descrição
  - Data
  - Conta de origem
  - Conta de destino (para transferências)
  - Categoria
  - Notas/Observações
  - Parcelamento (número de parcelas)
  - Recorrência (diária/semanal/mensal/anual)
  - Compartilhamento (divisão com membros da família)
  - Viagem (associar a uma viagem)
- ✅ Editar transação existente
- ✅ Deletar transação
- ✅ Deletar série de parcelas
- ✅ Deletar parcelas futuras
- ✅ Antecipar parcelas
- ✅ Visualizar detalhes da transação
- ✅ Duplicar transação
- ✅ Busca por descrição
- ✅ Ordenação (data, valor, descrição)
- ✅ Paginação/Scroll infinito

**Telas:**
- Lista de Transações
- Nova Transação
- Editar Transação
- Detalhes da Transação

---

### 4. CONTAS BANCÁRIAS
**Funcionalidades:**
- ✅ Listar todas as contas ativas
- ✅ Tipos de conta:
  - Conta Corrente
  - Poupança
  - Cartão de Crédito
  - Investimentos
  - Dinheiro
  - Fundo de Emergência
- ✅ Criar nova conta
  - Nome da conta
  - Tipo
  - Banco (com logos)
  - Saldo inicial
  - Moeda (BRL, USD, EUR, etc.)
  - Conta internacional (sim/não)
  - Dia de fechamento (cartão)
  - Dia de vencimento (cartão)
  - Limite de crédito (cartão)
- ✅ Editar conta
- ✅ Arquivar conta (soft delete)
- ✅ Desarquivar conta
- ✅ Deletar conta
- ✅ Ver extrato da conta
  - Todas as transações da conta
  - Saldo inicial
  - Entradas
  - Saídas
  - Saldo final
  - Filtros por período
- ✅ Transferência entre contas
- ✅ Visualizar saldo de cada conta
- ✅ Contas arquivadas (lista separada)

**Telas:**
- Lista de Contas
- Nova Conta
- Editar Conta
- Detalhes da Conta
- Extrato da Conta
- Contas Arquivadas

---

### 5. CARTÕES DE CRÉDITO
**Funcionalidades:**
- ✅ Listar todos os cartões
- ✅ Visualizar fatura do mês
  - Valor total da fatura
  - Valor pago
  - Valor pendente
  - Data de fechamento
  - Data de vencimento
  - Lista de transações da fatura
- ✅ Navegação entre faturas (meses)
- ✅ Marcar fatura como paga
- ✅ Pagar fatura parcialmente
- ✅ Visualizar histórico de faturas
- ✅ Alertas de vencimento
- ✅ Gráfico de gastos por categoria no cartão
- ✅ Limite disponível
- ✅ Percentual de uso do limite

**Telas:**
- Lista de Cartões
- Fatura do Cartão
- Histórico de Faturas
- Detalhes do Cartão

---

### 6. DESPESAS COMPARTILHADAS
**Funcionalidades:**
- ✅ Visualizar despesas compartilhadas com família
- ✅ Abas:
  - Regular (despesas mensais não pagas)
  - Viagem (despesas de viagens)
  - Histórico (despesas pagas)
- ✅ Para cada membro da família:
  - Créditos (valores que me devem)
  - Débitos (valores que eu devo)
  - Saldo líquido
- ✅ Criar despesa compartilhada
  - Selecionar membros
  - Definir percentual de cada um
  - Ou dividir igualmente
- ✅ Marcar como pago (acerto)
  - Credor marca como recebido
  - Devedor marca como pago
  - Ambos precisam confirmar
- ✅ Desfazer acerto
- ✅ Acerto múltiplo (várias despesas de uma vez)
- ✅ Filtro por mês
- ✅ Filtro por membro
- ✅ Filtro por viagem
- ✅ Resumo por moeda (BRL, USD, EUR, etc.)
- ✅ Validação de acertos (regras de negócio)
- ✅ Histórico de acertos

**Telas:**
- Despesas Compartilhadas
- Detalhes do Compartilhamento
- Acertar Despesas
- Histórico de Acertos

---

### 7. VIAGENS
**Funcionalidades:**
- ✅ Criar nova viagem
  - Nome da viagem
  - Destino
  - Data de início
  - Data de fim
  - Moeda principal
  - Orçamento total
  - Descrição
- ✅ Editar viagem
- ✅ Deletar viagem
- ✅ Adicionar membros à viagem
- ✅ Remover membros da viagem
- ✅ Criar transações de viagem
  - Associadas à viagem
  - Em moeda estrangeira
  - Compartilhadas entre membros
- ✅ Visualizar resumo da viagem
  - Orçamento vs Gasto
  - Gastos por categoria
  - Gastos por membro
  - Gastos por moeda
- ✅ Conversão de moedas
  - Taxa de câmbio manual
  - Conversão automática para BRL
- ✅ Acertos de viagem
  - Quem pagou o quê
  - Quem deve para quem
  - Cálculo automático de acertos
- ✅ Exportar relatório da viagem
- ✅ Finalizar viagem
- ✅ Reabrir viagem

**Telas:**
- Lista de Viagens
- Nova Viagem
- Detalhes da Viagem
- Membros da Viagem
- Transações da Viagem
- Acertos da Viagem
- Resumo da Viagem

---

### 8. FAMÍLIA
**Funcionalidades:**
- ✅ Criar grupo familiar
- ✅ Convidar membros
  - Por email
  - Link de convite
- ✅ Aceitar/Rejeitar convites
- ✅ Listar membros da família
- ✅ Remover membro
- ✅ Sair da família
- ✅ Definir permissões por membro
  - Visualizar despesas
  - Criar despesas
  - Editar despesas
  - Deletar despesas
- ✅ Definir escopo de compartilhamento
  - Tudo
  - Apenas viagens
  - Período específico
  - Viagem específica
- ✅ Avatar personalizado por membro
- ✅ Nome de exibição
- ✅ Status (ativo/inativo)

**Telas:**
- Família
- Convidar Membro
- Detalhes do Membro
- Convites Pendentes
- Configurações da Família

---

### 9. ORÇAMENTOS
**Funcionalidades:**
- ✅ Criar orçamento
  - Nome
  - Categoria
  - Valor limite
  - Período (mensal/anual)
  - Moeda
- ✅ Editar orçamento
- ✅ Deletar orçamento
- ✅ Visualizar progresso do orçamento
  - Valor gasto
  - Valor restante
  - Percentual usado
  - Barra de progresso
  - Cores (verde/amarelo/vermelho)
- ✅ Alertas de orçamento
  - 80% usado (amarelo)
  - 100% usado (vermelho)
  - Acima de 100% (crítico)
- ✅ Histórico de orçamentos
- ✅ Comparação mês a mês
- ✅ Gráfico de evolução do orçamento

**Telas:**
- Lista de Orçamentos
- Novo Orçamento
- Editar Orçamento
- Detalhes do Orçamento
- Histórico do Orçamento

---

### 10. CATEGORIAS
**Funcionalidades:**
- ✅ Categorias padrão (pré-cadastradas)
  - Alimentação
  - Transporte
  - Moradia
  - Saúde
  - Educação
  - Lazer
  - Vestuário
  - Outros
- ✅ Criar categoria personalizada
  - Nome
  - Ícone (biblioteca de ícones)
  - Cor
  - Tipo (Receita/Despesa)
  - Categoria pai (hierarquia)
- ✅ Editar categoria
- ✅ Deletar categoria
- ✅ Hierarquia de categorias
  - Categoria pai
  - Subcategorias
- ✅ Predição de categoria
  - IA sugere categoria baseada na descrição
  - Aprendizado com histórico do usuário
- ✅ Estatísticas por categoria
  - Total gasto no mês
  - Percentual do total
  - Evolução mensal

**Telas:**
- Lista de Categorias
- Nova Categoria
- Editar Categoria
- Estatísticas da Categoria

---

### 11. RELATÓRIOS
**Funcionalidades:**
- ✅ Relatório de receitas e despesas
  - Por mês
  - Por categoria
  - Por conta
  - Por tipo
- ✅ Gráfico de evolução mensal
  - Últimos 6/12/24 meses
  - Receitas vs Despesas
  - Economia
- ✅ Gráfico de despesas por categoria
  - Pizza
  - Barras
  - Percentuais
- ✅ Relatório de fluxo de caixa
  - Entradas
  - Saídas
  - Saldo
- ✅ Relatório de orçamentos
  - Todos os orçamentos
  - Progresso
  - Alertas
- ✅ Relatório de investimentos
  - Saldo total
  - Rentabilidade
  - Evolução
- ✅ Exportar relatórios
  - PDF
  - Excel/CSV
  - Compartilhar
- ✅ Filtros avançados
  - Período personalizado
  - Múltiplas contas
  - Múltiplas categorias
  - Incluir/Excluir compartilhados

**Telas:**
- Relatórios
- Relatório Detalhado
- Exportar Relatório
- Filtros de Relatório

---

### 12. NOTIFICAÇÕES
**Funcionalidades:**
- ✅ Notificações push
- ✅ Notificações in-app
- ✅ Tipos de notificação:
  - Fatura de cartão próxima do vencimento
  - Orçamento em alerta (80%/100%)
  - Transação recorrente criada
  - Convite para família
  - Acerto de despesa compartilhada
  - Meta financeira atingida
  - Lembrete de transação
- ✅ Marcar como lida
- ✅ Marcar todas como lidas
- ✅ Deletar notificação
- ✅ Configurações de notificação
  - Ativar/Desativar por tipo
  - Horário de silêncio
  - Som
  - Vibração

**Telas:**
- Lista de Notificações
- Detalhes da Notificação
- Configurações de Notificações

---

### 13. CONFIGURAÇÕES
**Funcionalidades:**
- ✅ Perfil do usuário
  - Nome
  - Email
  - Avatar
  - Senha
- ✅ Preferências
  - Moeda padrão
  - Idioma
  - Formato de data
  - Formato de número
  - Tema (claro/escuro/automático)
- ✅ Notificações
  - Configurar tipos
  - Horários
  - Sons
- ✅ Segurança
  - Trocar senha
  - Autenticação de dois fatores (2FA)
  - Biometria (impressão digital/face)
  - PIN de acesso
- ✅ Backup e Sincronização
  - Backup automático
  - Restaurar backup
  - Sincronização em nuvem
- ✅ Exportar dados
  - Todas as transações
  - Relatórios
  - Formato CSV/Excel
- ✅ Importar dados
  - CSV
  - OFX
  - Planilha Excel
- ✅ Sobre o app
  - Versão
  - Termos de uso
  - Política de privacidade
  - Contato/Suporte
- ✅ Sair da conta
- ✅ Deletar conta

**Telas:**
- Configurações
- Editar Perfil
- Preferências
- Segurança
- Notificações
- Backup
- Sobre

---

## 🎨 DESIGN E UX

### Tema
- ✅ Tema claro
- ✅ Tema escuro
- ✅ Tema automático (sistema)
- ✅ Cores personalizáveis
- ✅ Modo daltônico

### Componentes UI
- ✅ Botões
- ✅ Cards
- ✅ Inputs
- ✅ Selects/Dropdowns
- ✅ Date Pickers
- ✅ Modais/Dialogs
- ✅ Bottom Sheets
- ✅ Tabs
- ✅ Accordions
- ✅ Progress Bars
- ✅ Badges
- ✅ Avatars
- ✅ Icons (Lucide React Native)
- ✅ Toasts/Snackbars
- ✅ Loading Spinners
- ✅ Empty States
- ✅ Error States
- ✅ Skeleton Loaders

### Navegação
- ✅ Bottom Tab Navigation (principal)
  - Dashboard
  - Transações
  - Adicionar (botão central)
  - Relatórios
  - Mais
- ✅ Stack Navigation (telas internas)
- ✅ Drawer Navigation (menu lateral - opcional)
- ✅ Gestos
  - Swipe para voltar
  - Pull to refresh
  - Swipe para deletar
  - Long press para opções

### Animações
- ✅ Transições suaves entre telas
- ✅ Animações de loading
- ✅ Animações de sucesso/erro
- ✅ Animações de gráficos
- ✅ Micro-interações

---

## 🔧 FUNCIONALIDADES TÉCNICAS

### Offline First
- ✅ Funcionar sem internet
- ✅ Sincronização automática quando online
- ✅ Fila de sincronização
- ✅ Indicador de status (online/offline)
- ✅ Conflitos de sincronização

### Performance
- ✅ Lazy loading de imagens
- ✅ Virtualização de listas longas
- ✅ Cache de dados
- ✅ Otimização de queries
- ✅ Debounce em buscas
- ✅ Throttle em scroll

### Segurança
- ✅ Criptografia de dados sensíveis
- ✅ HTTPS obrigatório
- ✅ Tokens JWT
- ✅ Refresh tokens
- ✅ Logout automático (inatividade)
- ✅ Validação de inputs
- ✅ Sanitização de dados

### Acessibilidade
- ✅ Screen reader support
- ✅ Contraste adequado
- ✅ Tamanhos de fonte ajustáveis
- ✅ Labels descritivos
- ✅ Navegação por teclado
- ✅ Feedback tátil (vibração)

---

## 📊 SERVIÇOS E INTEGRAÇÕES

### Supabase
- ✅ Autenticação
- ✅ Banco de dados PostgreSQL
- ✅ Storage (avatares, anexos)
- ✅ Realtime (sincronização)
- ✅ Edge Functions (se necessário)
- ✅ Row Level Security (RLS)

### Firebase (Opcional)
- ✅ Cloud Messaging (notificações push)
- ✅ Analytics
- ✅ Crashlytics
- ✅ Performance Monitoring

### APIs Externas
- ✅ API de cotação de moedas (para conversão)
- ✅ API de bancos (logos)
- ✅ API de categorização (IA - opcional)

---

## 🧮 CÁLCULOS E LÓGICA DE NEGÓCIO

### Cálculos Financeiros
- ✅ SafeFinancialCalculator (precisão decimal)
- ✅ Soma de valores
- ✅ Subtração de valores
- ✅ Multiplicação
- ✅ Divisão
- ✅ Percentuais
- ✅ Parcelamento
- ✅ Juros (se aplicável)
- ✅ Conversão de moedas

### Validações
- ✅ Valor maior que zero
- ✅ Data válida
- ✅ Descrição obrigatória
- ✅ Conta selecionada
- ✅ Categoria selecionada
- ✅ Splits somam 100%
- ✅ Saldo suficiente (opcional)
- ✅ Limite de crédito (cartão)

### Regras de Negócio
- ✅ Transação compartilhada deve ter splits
- ✅ Acerto requer confirmação de ambas as partes
- ✅ Transação acertada não pode ser editada
- ✅ Fatura fechada não pode ser alterada
- ✅ Parcela não pode ser deletada individualmente (série completa)
- ✅ Recorrência cria transações automaticamente
- ✅ Transferência cria 2 transações (origem e destino)

---

## 📱 FUNCIONALIDADES MOBILE ESPECÍFICAS

### Câmera
- ✅ Tirar foto de recibo/nota fiscal
- ✅ Anexar à transação
- ✅ OCR para extrair valor (opcional)

### Galeria
- ✅ Selecionar foto da galeria
- ✅ Anexar à transação

### Biometria
- ✅ Login com impressão digital
- ✅ Login com reconhecimento facial
- ✅ Confirmar transações com biometria

### Localização
- ✅ Detectar localização da transação
- ✅ Sugerir categoria baseada em local
- ✅ Mapa de gastos (opcional)

### Compartilhamento
- ✅ Compartilhar relatório
- ✅ Compartilhar transação
- ✅ Compartilhar extrato

### Widgets (Opcional)
- ✅ Widget de saldo
- ✅ Widget de despesas do mês
- ✅ Widget de próximas contas

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais
1. **users** - Usuários
2. **accounts** - Contas bancárias
3. **transactions** - Transações
4. **transaction_splits** - Divisão de transações compartilhadas
5. **categories** - Categorias
6. **budgets** - Orçamentos
7. **family_members** - Membros da família
8. **family_invitations** - Convites para família
9. **trips** - Viagens
10. **trip_members** - Membros de viagens
11. **notifications** - Notificações
12. **user_settings** - Configurações do usuário
13. **audit_log** - Log de auditoria

### Views
1. **shared_transactions_view** - Transações compartilhadas
2. **trip_budget_summary** - Resumo de orçamento de viagens
3. **monthly_financial_summary** - Resumo financeiro mensal

### Functions (RPC)
1. **get_monthly_financial_summary** - Resumo financeiro
2. **get_expenses_by_category** - Despesas por categoria
3. **get_monthly_evolution** - Evolução mensal
4. **calculate_budget_spent** - Calcular gasto do orçamento
5. **delete_installment_series** - Deletar série de parcelas

---

## 🎯 PRIORIDADES DE DESENVOLVIMENTO

### Fase 1 - MVP (Essencial)
1. ✅ Autenticação
2. ✅ Dashboard básico
3. ✅ Transações (CRUD)
4. ✅ Contas (CRUD)
5. ✅ Categorias básicas
6. ✅ Relatórios simples

### Fase 2 - Core Features
1. ✅ Cartões de crédito
2. ✅ Parcelamento
3. ✅ Recorrência
4. ✅ Orçamentos
5. ✅ Gráficos avançados
6. ✅ Filtros e buscas

### Fase 3 - Social Features
1. ✅ Família
2. ✅ Despesas compartilhadas
3. ✅ Viagens
4. ✅ Acertos
5. ✅ Notificações

### Fase 4 - Advanced Features
1. ✅ Múltiplas moedas
2. ✅ Importação/Exportação
3. ✅ Backup/Restore
4. ✅ Widgets
5. ✅ Biometria
6. ✅ OCR de recibos

---

## 📦 ENTREGÁVEIS

### Código
- ✅ Código fonte completo
- ✅ Documentação inline
- ✅ README com instruções
- ✅ Arquivo de configuração (.env.example)

### Build
- ✅ APK assinado para produção
- ✅ APK de debug para testes
- ✅ Bundle AAB para Google Play

### Documentação
- ✅ Manual do usuário
- ✅ Guia de instalação
- ✅ Documentação técnica
- ✅ Changelog

### Assets
- ✅ Ícone do app (múltiplos tamanhos)
- ✅ Splash screen
- ✅ Screenshots para loja
- ✅ Banner promocional

---

## ✅ CHECKLIST DE QUALIDADE

### Funcional
- [ ] Todas as funcionalidades implementadas
- [ ] Todas as telas criadas
- [ ] Navegação funcionando
- [ ] Formulários validando
- [ ] Cálculos corretos
- [ ] Sincronização funcionando

### Performance
- [ ] App inicia em < 3 segundos
- [ ] Listas renderizam suavemente
- [ ] Sem travamentos
- [ ] Consumo de bateria otimizado
- [ ] Tamanho do APK < 50 MB

### Segurança
- [ ] Dados criptografados
- [ ] Tokens seguros
- [ ] Validações no backend
- [ ] RLS configurado
- [ ] Sem vazamento de dados

### UX
- [ ] Interface intuitiva
- [ ] Feedback visual em ações
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Animações suaves

### Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Testes em múltiplos dispositivos
- [ ] Testes offline

---

## 🚀 DEPLOY

### Google Play Store
- ✅ Conta de desenvolvedor
- ✅ Ícone e screenshots
- ✅ Descrição do app
- ✅ Política de privacidade
- ✅ Termos de uso
- ✅ APK/AAB assinado
- ✅ Versão de produção

### Configurações
- ✅ Supabase URL e Keys
- ✅ Firebase configurado
- ✅ Variáveis de ambiente
- ✅ Certificados de assinatura

---

## 📞 SUPORTE E MANUTENÇÃO

### Monitoramento
- ✅ Crashlytics
- ✅ Analytics
- ✅ Performance monitoring
- ✅ Logs de erro

### Atualizações
- ✅ Versionamento semântico
- ✅ Changelog
- ✅ Notificação de atualização
- ✅ Atualização forçada (se crítico)

---

**Este prompt contém TODAS as funcionalidades do sistema web "Seu Bolso Inteligente" para ser replicado em um aplicativo Android nativo.**

**Tecnologias Recomendadas:**
- React Native + Expo (mais rápido)
- Flutter (melhor performance)
- Supabase (backend completo)
- Firebase (notificações)

**Tempo Estimado:** 3-6 meses para desenvolvimento completo
**Equipe Recomendada:** 2-3 desenvolvedores mobile + 1 designer