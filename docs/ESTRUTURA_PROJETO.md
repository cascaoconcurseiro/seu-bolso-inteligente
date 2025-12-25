# 📁 Estrutura do Projeto

## 🌳 Árvore de Diretórios

```
seu-bolso-inteligente/
│
├── 📚 docs/                              # Documentação completa
│   ├── README.md                         # Índice da documentação
│   ├── INDICE.md                         # Índice visual
│   ├── GUIA_RAPIDO.md                   # 🚀 Início rápido
│   ├── CONFIGURACAO_SUPABASE.md         # 🔧 Configurar Supabase
│   ├── DEPLOY_VERCEL.md                 # 🚀 Deploy
│   ├── IMPLEMENTACAO_COMPLETA.md        # 📋 Documentação técnica
│   ├── PLANO_MIGRACAO_PE_PARA_NOVO.md  # 📊 Plano de migração
│   ├── MIGRACAO_APLICADA.md            # ✅ Status
│   ├── CHECKLIST_VERIFICACAO.md        # ✅ Checklist
│   ├── RESUMO_EXECUTIVO.md             # 📊 Resumo
│   ├── README_MIGRACAO.md              # 📖 README migração
│   └── ESTRUTURA_PROJETO.md            # 📁 Este arquivo
│
├── 🗄️ supabase/                          # Configuração Supabase
│   ├── config.toml                       # Configuração local
│   └── migrations/                       # Migrations SQL
│       ├── 20251226_001_consolidacao_schema.sql
│       ├── 20251226_002_constraints_e_auditoria.sql
│       └── 20251226_003_budgets_goals_investments.sql
│
├── 💻 src/                               # Código fonte
│   │
│   ├── 🎨 components/                    # Componentes React
│   │   ├── budgets/                     # 🐷 Orçamentos
│   │   │   ├── BudgetForm.tsx
│   │   │   └── BudgetCard.tsx
│   │   ├── goals/                       # 🎯 Metas
│   │   │   ├── GoalForm.tsx
│   │   │   └── GoalCard.tsx
│   │   ├── investments/                 # 📈 Investimentos
│   │   │   ├── AssetForm.tsx
│   │   │   ├── AssetCard.tsx
│   │   │   └── PortfolioChart.tsx
│   │   ├── layout/                      # Layout
│   │   │   ├── AppLayout.tsx
│   │   │   ├── MonthSelector.tsx
│   │   │   └── NotificationButton.tsx
│   │   └── ui/                          # Componentes base (shadcn)
│   │
│   ├── 🎣 hooks/                         # Hooks personalizados
│   │   ├── useAssets.ts                 # 📈 Investimentos
│   │   ├── useBudgets.ts                # 🐷 Orçamentos
│   │   ├── useGoals.ts                  # 🎯 Metas
│   │   ├── useAccounts.ts               # 🏦 Contas
│   │   ├── useTransactions.ts           # 💰 Transações
│   │   ├── useFamily.ts                 # 👨‍👩‍👧 Família
│   │   └── useTrips.ts                  # ✈️ Viagens
│   │
│   ├── 📄 pages/                         # Páginas
│   │   ├── Dashboard.tsx                # 📊 Dashboard
│   │   ├── Transactions.tsx             # 💰 Transações
│   │   ├── Accounts.tsx                 # 🏦 Contas
│   │   ├── CreditCards.tsx              # 💳 Cartões
│   │   ├── Budgets.tsx                  # 🐷 Orçamentos (NOVO)
│   │   ├── Goals.tsx                    # 🎯 Metas (NOVO)
│   │   ├── Investments.tsx              # 📈 Investimentos (NOVO)
│   │   ├── SharedExpenses.tsx           # 👥 Compartilhados
│   │   ├── Trips.tsx                    # ✈️ Viagens
│   │   ├── Family.tsx                   # 👨‍👩‍👧 Família
│   │   ├── Reports.tsx                  # 📊 Relatórios
│   │   ├── Settings.tsx                 # ⚙️ Configurações
│   │   └── Auth.tsx                     # 🔐 Autenticação
│   │
│   ├── 🔌 contexts/                      # Contextos React
│   │   ├── AuthContext.tsx              # Autenticação
│   │   └── MonthContext.tsx             # Seletor de mês
│   │
│   ├── 🔗 integrations/                  # Integrações
│   │   └── supabase/
│   │       ├── client.ts                # Cliente Supabase
│   │       └── types.ts                 # Tipos gerados
│   │
│   ├── 📝 types/                         # Tipos TypeScript
│   │   └── database.ts                  # Tipos do banco (NOVO)
│   │
│   ├── 🛠️ lib/                           # Utilitários
│   │   └── utils.ts
│   │
│   ├── App.tsx                          # App principal
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Estilos globais
│
├── 📦 public/                            # Arquivos públicos
│   ├── favicon.ico
│   └── placeholder.svg
│
├── ⚙️ Configuração
│   ├── .env.example                     # Exemplo de variáveis
│   ├── .gitignore                       # Git ignore
│   ├── package.json                     # Dependências
│   ├── tsconfig.json                    # TypeScript config
│   ├── vite.config.ts                   # Vite config
│   ├── tailwind.config.ts               # Tailwind config
│   └── components.json                  # shadcn config
│
└── 📖 README.md                          # README principal

```

## 📊 Estatísticas do Projeto

### Código Fonte
| Tipo | Quantidade | Linhas |
|------|------------|--------|
| Migrations SQL | 3 | ~1.500 |
| Hooks React | 8 | ~800 |
| Páginas | 13 | ~1.500 |
| Componentes | 20+ | ~2.000 |
| Tipos TypeScript | 10+ | ~200 |
| **Total** | **50+** | **~6.000** |

### Documentação
| Tipo | Quantidade | Páginas |
|------|------------|---------|
| Guias | 3 | ~30 |
| Referência | 4 | ~50 |
| Verificação | 3 | ~30 |
| **Total** | **11** | **~100** |

## 🎯 Arquivos Principais

### Backend (Supabase)
```
supabase/migrations/
├── 001_consolidacao_schema.sql      # Constraints e índices
├── 002_constraints_e_auditoria.sql  # Auditoria completa
└── 003_budgets_goals_investments.sql # Novas tabelas
```

### Frontend (React)
```
src/
├── hooks/
│   ├── useAssets.ts      # 📈 Investimentos
│   ├── useBudgets.ts     # 🐷 Orçamentos
│   └── useGoals.ts       # 🎯 Metas
│
├── pages/
│   ├── Investments.tsx   # 📈 Página de investimentos
│   ├── Goals.tsx         # 🎯 Página de metas
│   └── Budgets.tsx       # 🐷 Página de orçamentos
│
└── components/
    ├── budgets/          # Componentes de orçamentos
    ├── goals/            # Componentes de metas
    └── investments/      # Componentes de investimentos
```

### Documentação
```
docs/
├── README.md                    # Índice principal
├── INDICE.md                    # Índice visual
├── GUIA_RAPIDO.md              # Início rápido
├── CONFIGURACAO_SUPABASE.md    # Configurar Supabase
├── DEPLOY_VERCEL.md            # Deploy
└── ...
```

## 🔍 Navegação Rápida

### Por Funcionalidade

**Orçamentos (Budgets)**
```
src/
├── hooks/useBudgets.ts
├── pages/Budgets.tsx
└── components/budgets/
    ├── BudgetForm.tsx
    └── BudgetCard.tsx
```

**Metas (Goals)**
```
src/
├── hooks/useGoals.ts
├── pages/Goals.tsx
└── components/goals/
    ├── GoalForm.tsx
    └── GoalCard.tsx
```

**Investimentos (Assets)**
```
src/
├── hooks/useAssets.ts
├── pages/Investments.tsx
└── components/investments/
    ├── AssetForm.tsx
    ├── AssetCard.tsx
    └── PortfolioChart.tsx
```

## 📦 Dependências Principais

### Frontend
- **React** 18.3.1 - Framework
- **TypeScript** 5.8.3 - Tipagem
- **Vite** 5.4.19 - Build tool
- **React Query** 5.83.0 - Estado do servidor
- **React Hook Form** 7.61.1 - Formulários
- **Zod** 3.25.76 - Validação
- **shadcn/ui** - Componentes
- **Tailwind CSS** 3.4.17 - Estilos
- **Recharts** 2.15.4 - Gráficos

### Backend
- **Supabase** 2.89.0 - Backend as a Service
- **PostgreSQL** - Banco de dados

## 🎨 Padrões de Código

### Estrutura de Componentes
```typescript
// Componente típico
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useHook } from '@/hooks/useHook';

export const Component = () => {
  const { data, isLoading } = useHook();
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Estrutura de Hooks
```typescript
// Hook típico
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useHook = () => {
  const { data } = useQuery({
    queryKey: ['key'],
    queryFn: async () => {
      // Fetch data
    },
  });
  
  return { data };
};
```

### Estrutura de Páginas
```typescript
// Página típica
import { useState } from 'react';
import { useHook } from '@/hooks/useHook';
import { Component } from '@/components/Component';

export const Page = () => {
  const { data } = useHook();
  
  return (
    <div className="container mx-auto p-6">
      <h1>Título</h1>
      <Component data={data} />
    </div>
  );
};
```

## 🔐 Segurança

### Arquivos Sensíveis (Não Commitar)
```
.env
.env.local
.env.production
node_modules/
dist/
```

### Arquivos de Configuração (Commitar)
```
.env.example
.gitignore
package.json
tsconfig.json
```

## 🚀 Scripts Disponíveis

```bash
npm run dev        # Desenvolvimento
npm run build      # Build para produção
npm run preview    # Preview do build
npm run lint       # Lint do código
```

## 📝 Convenções

### Nomenclatura
- **Componentes:** PascalCase (`BudgetCard.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useBudgets.ts`)
- **Páginas:** PascalCase (`Budgets.tsx`)
- **Tipos:** PascalCase (`Budget`, `Goal`)
- **Funções:** camelCase (`createBudget`)

### Estrutura de Pastas
- **Componentes:** Por funcionalidade (`budgets/`, `goals/`)
- **Hooks:** Por recurso (`useBudgets`, `useGoals`)
- **Páginas:** Por rota (`Budgets`, `Goals`)

## 🎯 Próximos Passos

Para adicionar uma nova funcionalidade:

1. **Criar migration** em `supabase/migrations/`
2. **Criar tipos** em `src/types/database.ts`
3. **Criar hook** em `src/hooks/`
4. **Criar componentes** em `src/components/`
5. **Criar página** em `src/pages/`
6. **Adicionar rota** em `src/App.tsx`
7. **Adicionar navegação** em `src/components/layout/AppLayout.tsx`
8. **Documentar** em `docs/`

## 📚 Recursos

- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**Última Atualização:** 25 de Dezembro de 2025

**Total de Arquivos:** 50+
**Total de Linhas:** ~6.000
**Status:** ✅ Completo e Organizado
