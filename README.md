# 🪙 Pé de Meia

> Um sistema moderno, rápido e seguro para gerenciamento financeiro pessoal e compartilhado. Criado para ser o seu "Pé de Meia" digital.

![Status do Projeto](https://img.shields.io/badge/status-PRODUCTION%20READY-success)
![Versão do React](https://img.shields.io/badge/React-18-blue)
![Banco de Dados](https://img.shields.io/badge/Supabase-PostgreSQL-green)

O **Pé de Meia** une o controle financeiro pessoal com viagens do tipo *travel spend*, sem a necessidade de conexões bancárias arriscadas. Desenvolvido com uma arquitetura front-end de alto padrão e precisão matemática de nível bancário.

---

## 🚀 Funcionalidades Principais

- 🏦 **Gerenciamento de Contas:** Controle múltiplas contas (Corrente, Poupança, Cartão de Crédito) e suporte internacional (multimoedas).
- 📊 **Transações & Categorização:** Sistema preditivo para categorias e lançamentos automatizados.
- 👨‍👩‍👧 **Despesas Compartilhadas:** Divida contas com a família e realize os acertos ("settlements") direto no aplicativo, sem perder nenhum centavo.
- ✈️ **Travel Spend (Viagens):** Controle rigoroso para viagens internacionais, com tracking de câmbio.
- 🛡️ **Precisão Matemática:** Uso do `SafeFinancialCalculator` interno para lidar com cálculos em centavos, prevenindo perdas financeiras (erros de floating-point do Javascript).

## 📱 Mobile First & UI/UX Premium

Construído com **Shadcn/ui** e **Tailwind CSS**, com foco máximo em responsividade e design minimalista. 
- Funcionalidade Dark Mode Nativo.
- Proteção total de interface para dispositivos com Notch (configuração nativa de **safe-area-inset** para iOS e Android).
- Zero "flickers" e "zooms" não intencionais no preenchimento de formulários via celular.

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
| --- | --- |
| **Frontend** | React 18 + TypeScript |
| **UI/UX** | Shadcn/ui + Radix UI + Tailwind CSS |
| **State & Cache** | React Query + Context API |
| **Backend & DB** | Supabase (PostgreSQL) com RLS |
| **Build & Deploy** | Vite + Vercel |

## 📁 Estrutura de Documentação

Nossa documentação completa está organizada na pasta `/docs`:
- [`/docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) - Status completo da última build.
- [`/docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) - Guias de como contribuir e arquitetura.
- [`/docs/CLEANUP_SUMMARY.md`](./docs/CLEANUP_SUMMARY.md) - Resumo das últimas limpezas de repositório.

## 📦 Como rodar localmente

Certifique-se de ter o **Node.js (18+)** e **npm/bun** instalados.

1. Clone o projeto:
```bash
git clone https://github.com/cascaoconcurseiro/seu-bolso-inteligente.git
```
2. Instale as dependências:
```bash
npm install
```
3. Copie o `.env.example` para `.env` e configure as credenciais do Supabase:
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```
4. Inicie o app:
```bash
npm run dev
```

## 🤝 Como contribuir

Este repositório possui templates padronizados para Issues e Pull Requests na pasta `.github/`.
1. Para bugs: Utilize o template de **Bug Report** e especifique o seu dispositivo.
2. Para features: Utilize o template de **Feature Request**.
3. Sempre abra um Pull Request detalhando os testes manuais feitos.

---
*© 2026 Pé de Meia.*
