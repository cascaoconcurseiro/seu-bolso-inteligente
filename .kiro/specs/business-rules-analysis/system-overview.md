# Visão Global do Sistema Financeiro

## Resumo Executivo

Sistema financeiro pessoal/familiar completo desenvolvido em React + TypeScript + Supabase, com suporte a:
- Multi-moeda (BRL, USD, EUR, etc.)
- Viagens internacionais
- Compartilhamento de despesas
- Cartões de crédito com parcelamento
- Orçamentos e metas

---

## Arquitetura do Sistema

### Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel

### Estrutura de Diretórios

```
src/
├── components/          # Componentes React
│   ├── accounts/        # TransferModal, WithdrawalModal
│   ├── auth/            # ProtectedRoute
│   ├── family/          # Membros da família, convites
│   ├── financial/       # BalanceCard, BankIcon, etc.
│   ├── layout/          # AppLayout, MonthSelector
│   ├── modals/          # TransactionModal
│   ├── shared/          # Despesas compartilhadas
│   ├── transactions/    # TransactionForm, SplitModal
│   ├── trips/           # Viagens, câmbio, itinerário
│   └── ui/              # shadcn/ui components
├── contexts/            # AuthContext, MonthContext
├── hooks/               # Custom hooks (useAccounts, useTransactions, etc.)
├── integrations/        # Supabase client
├── lib/                 # Utilitários (banks, invoiceUtils)
├── pages/               # Páginas principais
├── services/            # Lógica de negócio
├── types/               # TypeScript types
└── utils/               # Helpers
```

---

## Módulos do Sistema

### 1. Autenticação (Auth)
- Login/Registro via Supabase Auth
- Proteção de rotas
- Contexto de usuário

### 2. Contas Bancárias (Accounts)
- Tipos: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, CASH
- Suporte a contas internacionais (is_international + currency)
- Transferências entre contas (incluindo cross-currency)
- Saques

### 3. Transações (Transactions)
- Tipos: EXPENSE, INCOME, TRANSFER
- Domínios: PERSONAL, SHARED, TRAVEL
- Parcelamento com competência mensal
- Divisão entre membros (splits)
- Recorrência (planejado)
- Validação completa (20+ regras)

### 4. Cartões de Crédito (CreditCards)
- Ciclo de fatura (fechamento/vencimento)
- Limite de crédito
- Suporte a cartões internacionais
- Pagamento de fatura com validação de moeda

### 5. Viagens (Trips)
- Viagens com moeda específica
- Membros da viagem (trip_members)
- Orçamento pessoal por membro
- Câmbio (compra de moeda estrangeira)
- Itinerário e checklist

### 6. Família (Family)
- Membros da família
- Convites por email
- Escopo de compartilhamento
- Despesas compartilhadas

### 7. Relatórios (Reports)
- Resumo mensal (entradas/saídas)
- Gastos por categoria
- Gastos por pessoa
- Evolução mensal
- Filtro por moeda

### 8. Dashboard
- Saldo atual (BRL)
- Saldos em moedas estrangeiras
- Faturas pendentes
- Divisões pendentes
- Atividade recente

---

## Fluxos Principais

### Fluxo de Transação
```
1. Usuário abre TransactionForm
2. Seleciona tipo (EXPENSE/INCOME/TRANSFER)
3. Preenche valor, descrição, data
4. Seleciona conta (filtrada por moeda se viagem)
5. Opcionalmente: parcelamento, divisão, viagem
6. Validação completa (validationService)
7. Criação via useCreateTransaction
8. Trigger no Supabase cria espelhos se compartilhado
```

### Fluxo de Viagem Internacional
```
1. Criar viagem com moeda (ex: USD)
2. Adicionar membros
3. Comprar câmbio (TripExchange)
4. Registrar despesas (filtradas por moeda)
5. Dividir despesas entre membros
6. Acertar no final (SharedExpenses)
```

### Fluxo de Cartão de Crédito
```
1. Criar cartão (nacional ou internacional)
2. Registrar despesas (com parcelamento opcional)
3. Visualizar fatura por mês
4. Pagar fatura (com validação de moeda)
```

---

## Banco de Dados (Supabase)

### Tabelas Principais
- `profiles` - Perfis de usuário
- `accounts` - Contas bancárias
- `transactions` - Transações
- `transaction_splits` - Divisões de transações
- `categories` - Categorias
- `families` - Famílias
- `family_members` - Membros da família
- `family_invitations` - Convites pendentes
- `trips` - Viagens
- `trip_members` - Membros de viagens
- `trip_invitations` - Convites de viagem
- `trip_exchange_purchases` - Compras de câmbio
- `budgets` - Orçamentos
- `goals` - Metas financeiras

### RLS (Row Level Security)
- Todas as tabelas têm políticas RLS
- Usuários só veem seus próprios dados
- Membros da família veem dados compartilhados
- Membros de viagem veem dados da viagem

---

## Serviços de Negócio

### validationService.ts
- 20+ validações de transação
- Validação de campos obrigatórios
- Validação de data
- Validação de limite de cartão
- Validação de saldo negativo
- Validação de parcelamento
- Validação de divisão
- Detecção de duplicatas

### SafeFinancialCalculator.ts
- Cálculos financeiros seguros
- Evita erros de ponto flutuante
- Soma, subtração, divisão seguras

### exchangeCalculations.ts
- Cálculo de taxa efetiva
- Média ponderada de câmbio
- Formatação de moeda

### invoiceUtils.ts
- Cálculo de ciclo de fatura
- Determinação de status (aberta/fechada)
- Agrupamento de transações por fatura

---

## Status de Implementação

### ✅ Implementado (27 regras)
- Transferências multi-moeda
- Contas internacionais
- Cartões internacionais
- Dashboard multi-moeda
- Relatórios com filtro de moeda
- Validação completa de transações
- Parcelamento com competência
- Divisão de despesas
- Viagens com moeda específica
- Pagamento de fatura com validação de moeda

### ⚠️ Parcial (6 regras)
- Extrato de conta internacional
- Câmbio integrado com gastos
- Acerto automático com transferência
- Orçamento por categoria
- Transações recorrentes

### ❌ Pendente (2 regras)
- Edição/exclusão de parcelas em série
- Orçamento multi-moeda

---

## Próximas Melhorias Sugeridas

### Alta Prioridade
1. Edição/exclusão de séries de parcelas
2. Orçamento com suporte a moeda

### Média Prioridade
3. Acerto automático com criação de transferência
4. Integração de câmbio com gastos da viagem
5. Geração automática de transações recorrentes

### Baixa Prioridade
6. Exportação de relatórios (PDF/Excel)
7. Gráficos mais detalhados
8. Notificações push
9. Modo offline

---

## Métricas do Projeto

- **Páginas**: 14
- **Componentes**: 50+
- **Hooks**: 20+
- **Serviços**: 5
- **Migrações SQL**: 60+
- **Regras de Negócio**: 40

---

*Documento gerado em 28/12/2024*
