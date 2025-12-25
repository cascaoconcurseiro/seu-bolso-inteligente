# 🔧 Configuração do Supabase - Usar o Mesmo do PE

## ✅ Sim, Você Pode Usar o Mesmo Supabase!

É **totalmente possível** e até **recomendado** usar o mesmo projeto Supabase do Pé de Meia. Isso traz várias vantagens:

### Vantagens
- ✅ **Dados já existem** - Todas as tabelas e dados do PE
- ✅ **Migrations já aplicadas** - Tudo já está configurado
- ✅ **Economia** - Um projeto em vez de dois
- ✅ **Usuários compartilhados** - Mesma base de usuários
- ✅ **Sem duplicação** - Dados centralizados

## 🚀 Passo a Passo

### 1. Obter Credenciais do Supabase

#### Opção A: Copiar do Projeto PE

Se você tem o projeto PE rodando, copie as credenciais do arquivo `.env` ou `.env.local`:

```bash
# No projeto PE, procure por:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# ou
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

#### Opção B: Pegar no Dashboard do Supabase

1. Acesse https://supabase.com/dashboard
2. Faça login
3. Selecione o projeto do **Pé de Meia**
4. Vá em **Settings** → **API**
5. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 2. Criar Arquivo `.env` no Projeto Novo

Na raiz do projeto **seu-bolso-inteligente**, crie o arquivo `.env`:

```bash
# .env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE:**
- Substitua pelos valores reais do seu projeto
- **NÃO** commite este arquivo no Git (já está no .gitignore)
- Use `VITE_SUPABASE_PUBLISHABLE_KEY` (não `ANON_KEY`)

### 3. Verificar Conexão

Execute o projeto:

```bash
npm run dev
```

Acesse http://localhost:5173 e tente fazer login com um usuário do PE.

Se funcionar, **está tudo certo!** ✅

## 📊 O Que Acontece Agora?

### Tabelas Existentes (do PE)
Você já tem acesso a:
- ✅ `accounts` - Contas
- ✅ `transactions` - Transações
- ✅ `trips` - Viagens
- ✅ `family_members` - Família
- ✅ `budgets` - Orçamentos (se já existir no PE)
- ✅ `goals` - Metas (se já existir no PE)
- ✅ `assets` - Investimentos (se já existir no PE)
- ✅ E todas as outras tabelas do PE

### Novas Tabelas (Se Não Existirem)

Se o PE não tiver as tabelas de Budgets, Goals e Assets, você precisa aplicar apenas a migration 003:

```sql
-- Execute no SQL Editor do Supabase
-- Copie e cole o conteúdo de:
supabase/migrations/20251226_003_budgets_goals_investments.sql
```

### Verificar Quais Tabelas Existem

Execute no SQL Editor do Supabase:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('budgets', 'goals', 'assets', 'financial_snapshots', 'transaction_audit')
ORDER BY table_name;
```

**Resultado esperado:**
- Se aparecer `budgets`, `goals`, `assets` → **Já tem tudo!** ✅
- Se não aparecer → **Aplicar migration 003**

## 🔄 Compatibilidade

### Schema do PE vs Projeto Novo

O projeto novo foi desenhado para ser **100% compatível** com o PE:

| Tabela | PE | Novo | Status |
|--------|----|----|--------|
| accounts | ✅ | ✅ | Compatível |
| transactions | ✅ | ✅ | Compatível |
| trips | ✅ | ✅ | Compatível |
| family_members | ✅ | ✅ | Compatível |
| budgets | ✅ | ✅ | Compatível |
| goals | ✅ | ✅ | Compatível |
| assets | ✅ | ✅ | Compatível |

### Diferenças (Se Houver)

Se houver pequenas diferenças no schema, você pode:

1. **Opção A:** Ajustar o código do projeto novo
2. **Opção B:** Adicionar colunas faltantes no Supabase
3. **Opção C:** Usar o schema do PE como está

## 🚀 Deploy na Vercel

### 1. Conectar Repositório

1. Acesse https://vercel.com
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. Selecione o projeto **seu-bolso-inteligente**

### 2. Configurar Variáveis de Ambiente

Na Vercel, adicione as variáveis:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Como adicionar:**
1. No projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione cada variável
4. Clique em **Save**

### 3. Deploy

1. Clique em **Deploy**
2. Aguarde o build
3. Acesse a URL gerada

**Pronto!** Seu projeto está no ar usando o mesmo Supabase do PE! 🎉

## 🔐 Segurança

### RLS (Row Level Security)

Como você está usando o mesmo Supabase, as políticas de segurança do PE já estão ativas:

- ✅ Usuários veem apenas seus dados
- ✅ Autenticação obrigatória
- ✅ Policies configuradas

### Verificar RLS

Execute no SQL Editor:

```sql
-- Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('accounts', 'transactions', 'budgets', 'goals', 'assets');
```

**Resultado esperado:** `rowsecurity = true` para todas as tabelas

## 🎯 Cenários Comuns

### Cenário 1: PE Tem Tudo
Se o PE já tem budgets, goals e assets:
- ✅ **Não precisa fazer nada!**
- ✅ Apenas configure o `.env`
- ✅ Execute o projeto

### Cenário 2: PE Não Tem Budgets/Goals/Assets
Se o PE não tem essas tabelas:
1. ✅ Configure o `.env`
2. ✅ Aplique a migration 003
3. ✅ Execute o projeto

### Cenário 3: PE Tem Schema Diferente
Se o schema do PE for diferente:
1. ✅ Configure o `.env`
2. ✅ Ajuste os tipos TypeScript
3. ✅ Ajuste os hooks se necessário

## 🧪 Testar Conexão

### Teste Rápido

1. Execute o projeto:
```bash
npm run dev
```

2. Abra o console do navegador (F12)

3. Execute no console:
```javascript
// Testar conexão
const { data, error } = await supabase.from('accounts').select('count');
console.log('Conexão:', error ? 'ERRO' : 'OK', data);
```

**Resultado esperado:** `Conexão: OK`

## 📝 Checklist

- [ ] Copiei as credenciais do Supabase do PE
- [ ] Criei o arquivo `.env` no projeto novo
- [ ] Coloquei as credenciais corretas
- [ ] Executei `npm run dev`
- [ ] Consegui fazer login
- [ ] Vejo os dados do PE
- [ ] Testei criar um orçamento
- [ ] Testei criar uma meta
- [ ] Testei criar um investimento
- [ ] Configurei as variáveis na Vercel
- [ ] Fiz o deploy

## 🆘 Problemas Comuns

### "Failed to fetch"
- Verifique se a URL do Supabase está correta
- Verifique se a key está correta
- Verifique se o projeto Supabase está ativo

### "Invalid API key"
- Verifique se copiou a key completa
- Verifique se não tem espaços extras
- Use `VITE_SUPABASE_PUBLISHABLE_KEY` (não `ANON_KEY`)

### "Table does not exist"
- Verifique se a tabela existe no Supabase
- Aplique as migrations se necessário
- Verifique o nome da tabela (case-sensitive)

### "Row Level Security"
- Verifique se está autenticado
- Verifique se as policies estão configuradas
- Verifique se o RLS está habilitado

## 🎉 Conclusão

Usar o mesmo Supabase do PE é:
- ✅ **Possível**
- ✅ **Recomendado**
- ✅ **Fácil de configurar**
- ✅ **Econômico**

Basta copiar as credenciais e pronto! 🚀

---

**Dúvidas?** Consulte:
- `GUIA_RAPIDO.md` - Início rápido
- `IMPLEMENTACAO_COMPLETA.md` - Documentação técnica
- `CHECKLIST_VERIFICACAO.md` - Checklist completo
