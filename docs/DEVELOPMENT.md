# Guia de Desenvolvimento

## Configuração Inicial

### 1. Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

### 2. Credenciais Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings > API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 3. Instale as Dependências

```bash
npm install
# ou
bun install
```

## Desenvolvimento Local

### Iniciar o Servidor

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Estrutura de Pastas

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes Shadcn/ui
│   ├── forms/          # Formulários
│   └── layout/         # Layout components
├── contexts/           # Context API
│   ├── AuthContext.tsx
│   └── MonthContext.tsx
├── hooks/              # Custom hooks
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   └── ...
├── integrations/       # Integrações externas
│   └── supabase/
│       └── client.ts
├── lib/                # Utilitários
│   ├── categoryKeywords.ts
│   └── ...
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   └── ...
├── services/           # Lógica de negócio
│   ├── settlementValidation.ts
│   ├── recurrenceService.ts
│   └── ...
├── types/              # Tipos TypeScript
│   └── database.ts
└── utils/              # Funções auxiliares
    ├── errorHandling.ts
    └── ...
```

## Padrões de Código

### Componentes

```typescript
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      {onAction && <button onClick={onAction}>Action</button>}
    </div>
  );
};
```

### Custom Hooks

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useMyData = () => {
  return useQuery({
    queryKey: ['myData'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });
};
```

### Serviços

```typescript
import { supabase } from '@/integrations/supabase/client';

export const myService = {
  async fetchData() {
    const { data, error } = await supabase
      .from('my_table')
      .select('*');
    
    if (error) throw error;
    return data;
  },
};
```

## Testes

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Debugging

### Console Logs

Use `console.log()` para debug rápido. Para logs estruturados, use o logger:

```typescript
import { logger } from '@/utils/logger';

logger.info('Mensagem de informação');
logger.error('Erro encontrado', error);
```

### React DevTools

Instale a extensão React DevTools no seu navegador para inspecionar componentes.

### Supabase Studio

Acesse [supabase.com/dashboard](https://supabase.com/dashboard) para:
- Visualizar dados do banco
- Executar queries SQL
- Verificar logs de autenticação

## Commits

Use mensagens de commit descritivas:

```bash
git commit -m "feat: adicionar nova funcionalidade"
git commit -m "fix: corrigir bug em componente"
git commit -m "refactor: melhorar performance"
git commit -m "docs: atualizar documentação"
```

## Deploy

### Vercel

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático em cada push para `main`

### Variáveis de Ambiente em Produção

No Vercel, adicione as mesmas variáveis do `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Troubleshooting

### Erro de Autenticação

Verifique se as credenciais Supabase estão corretas no `.env`

### Componentes não aparecem

Verifique se o Tailwind CSS está compilando corretamente:
```bash
npm run build
```

### Queries não retornam dados

Verifique as Row Level Security (RLS) policies no Supabase

## Recursos Úteis

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [React Query](https://tanstack.com/query/latest)

---

**Última atualização**: Maio 2026
