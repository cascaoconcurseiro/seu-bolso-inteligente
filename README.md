# Seu Bolso Inteligente

Uma aplicação web moderna para gerenciamento financeiro pessoal e compartilhado, com suporte a múltiplas contas, categorias, viagens e análises financeiras.

## 🚀 Características

- **Gerenciamento de Contas**: Crie e gerencie múltiplas contas bancárias
- **Transações**: Registre despesas e receitas com categorização automática
- **Compartilhamento**: Divida despesas com família e amigos
- **Viagens**: Organize gastos compartilhados em viagens
- **Orçamentos**: Defina e acompanhe orçamentos por categoria
- **Projeções**: Visualize projeções financeiras futuras
- **Relatórios**: Gere relatórios detalhados de gastos
- **Responsivo**: Interface totalmente responsiva para desktop e mobile

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **State Management**: React Query + Context API
- **Deployment**: Vercel

## 📋 Pré-requisitos

- Node.js 18+
- npm ou bun
- Conta Supabase
- Conta Vercel (para deploy)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/cascaoconcurseiro/seu-bolso-inteligente.git
cd seu-bolso-inteligente
```

2. Instale as dependências:
```bash
npm install
# ou
bun install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Adicione suas credenciais Supabase no `.env`:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

## 🚀 Desenvolvimento

Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
bun run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 📦 Build

Para criar uma build de produção:
```bash
npm run build
# ou
bun run build
```

## 🧪 Linting

Verifique a qualidade do código:
```bash
npm run lint
# ou
bun run lint
```

## 📁 Estrutura do Projeto

```
src/
├── components/      # Componentes React reutilizáveis
├── contexts/        # Context API para estado global
├── hooks/           # Custom hooks
├── integrations/    # Integrações (Supabase, etc)
├── lib/             # Utilitários e helpers
├── pages/           # Páginas da aplicação
├── services/        # Serviços de negócio
├── styles/          # Estilos globais
├── types/           # Tipos TypeScript
└── utils/           # Funções utilitárias
```

## 🔐 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) no banco de dados
- Variáveis de ambiente protegidas
- Validação de entrada em formulários

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktop (1920px+)
- Tablet (768px - 1024px)
- Mobile (320px - 767px)

## 🚀 Deploy

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático em cada push para `main`

## 📝 Licença

Este projeto é privado.

## 👥 Contribuidores

- Wesley (Desenvolvedor Principal)

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.

---

**Última atualização**: Maio 2026
