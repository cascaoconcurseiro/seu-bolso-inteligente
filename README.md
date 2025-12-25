# 💰 Seu Bolso Inteligente

Sistema completo de gestão financeira pessoal com orçamentos, metas e investimentos.

## 🚀 Início Rápido

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# Executar em desenvolvimento
npm run dev
```

Acesse: http://localhost:5173

## ✨ Funcionalidades

- 📊 **Dashboard** - Visão geral das finanças
- 💰 **Transações** - Receitas, despesas e transferências
- 🏦 **Contas** - Gestão de contas bancárias
- 💳 **Cartões** - Controle de cartões de crédito
- 🐷 **Orçamentos** - Controle de gastos por categoria
- 🎯 **Metas** - Objetivos financeiros
- 📈 **Investimentos** - Gestão de carteira
- 👥 **Compartilhados** - Despesas compartilhadas
- ✈️ **Viagens** - Controle de gastos em viagens
- 👨‍👩‍👧 **Família** - Gestão familiar
- 📊 **Relatórios** - Análises e gráficos

## 🛠️ Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Estado:** React Query
- **Formulários:** React Hook Form + Zod
- **Gráficos:** Recharts

## 📚 Documentação

Toda a documentação está na pasta [`docs/`](./docs/):

### 🚀 Começar
- [**Guia Rápido**](./docs/GUIA_RAPIDO.md) - Início em 3 passos
- [**Configuração Supabase**](./docs/CONFIGURACAO_SUPABASE.md) - Usar o mesmo do PE
- [**Deploy Vercel**](./docs/DEPLOY_VERCEL.md) - Colocar no ar

### 📖 Referência
- [**Implementação Completa**](./docs/IMPLEMENTACAO_COMPLETA.md) - Documentação técnica
- [**Plano de Migração**](./docs/PLANO_MIGRACAO_PE_PARA_NOVO.md) - Plano detalhado
- [**Status da Migração**](./docs/MIGRACAO_APLICADA.md) - O que foi feito

### ✅ Verificação
- [**Checklist**](./docs/CHECKLIST_VERIFICACAO.md) - Verificar implementação
- [**Resumo Executivo**](./docs/RESUMO_EXECUTIVO.md) - Visão geral

## 🎯 Estrutura do Projeto

```
seu-bolso-inteligente/
├── docs/                    # 📚 Documentação
├── public/                  # Arquivos públicos
├── src/
│   ├── components/         # Componentes React
│   │   ├── budgets/       # 🐷 Orçamentos
│   │   ├── goals/         # 🎯 Metas
│   │   ├── investments/   # 📈 Investimentos
│   │   ├── layout/        # Layout
│   │   └── ui/            # Componentes base
│   ├── contexts/          # Contextos React
│   ├── hooks/             # Hooks personalizados
│   ├── pages/             # Páginas
│   ├── types/             # Tipos TypeScript
│   └── integrations/      # Integrações (Supabase)
├── supabase/
│   └── migrations/        # Migrations SQL
└── ...
```

## 🔐 Segurança

- ✅ Autenticação obrigatória
- ✅ Row Level Security (RLS)
- ✅ Validações no banco e frontend
- ✅ Auditoria de mudanças
- ✅ HTTPS (em produção)

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte o repositório no GitHub
2. Importe na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

[Ver guia completo](./docs/DEPLOY_VERCEL.md)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado.

## 🆘 Suporte

Consulte a [documentação](./docs/) ou abra uma issue.

---

**Desenvolvido com ❤️ usando React + Supabase**
