# 🚀 Deploy na Vercel - Guia Completo

## ✅ Sim! Pode Usar o Mesmo Supabase do PE

Você pode (e deve) usar o mesmo projeto Supabase do Pé de Meia. É mais simples e econômico!

## 📋 Pré-requisitos

- [ ] Conta no GitHub
- [ ] Conta na Vercel (pode criar com GitHub)
- [ ] Projeto commitado no GitHub
- [ ] Credenciais do Supabase do PE

## 🚀 Passo a Passo

### 1. Preparar o Repositório

#### 1.1. Commitar o Código

```bash
# Adicionar todos os arquivos
git add .

# Commitar
git commit -m "feat: adicionar budgets, goals e investments"

# Enviar para o GitHub
git push origin main
```

#### 1.2. Verificar .gitignore

Certifique-se que o `.env` está no `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.production
```

**⚠️ NUNCA commite o arquivo `.env` com as credenciais!**

### 2. Obter Credenciais do Supabase

#### Opção A: Copiar do PE

No projeto PE, abra o arquivo `.env` ou `.env.local` e copie:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Opção B: Pegar no Dashboard

1. Acesse https://supabase.com/dashboard
2. Selecione o projeto do **Pé de Meia**
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL**
   - **anon/public key**

### 3. Deploy na Vercel

#### 3.1. Acessar Vercel

1. Acesse https://vercel.com
2. Faça login com GitHub
3. Clique em **"Add New..."** → **"Project"**

#### 3.2. Importar Repositório

1. Selecione o repositório **seu-bolso-inteligente**
2. Clique em **"Import"**

#### 3.3. Configurar Projeto

**Framework Preset:** Vite
**Root Directory:** `./` (deixe vazio)
**Build Command:** `npm run build`
**Output Directory:** `dist`

#### 3.4. Adicionar Variáveis de Ambiente

**IMPORTANTE:** Adicione as variáveis ANTES de fazer o deploy!

1. Clique em **"Environment Variables"**
2. Adicione:

```
Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
```

```
Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Selecione **Production**, **Preview** e **Development**

#### 3.5. Deploy

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. 🎉 **Pronto!**

### 4. Acessar o Projeto

Após o deploy, você receberá uma URL:
```
https://seu-bolso-inteligente.vercel.app
```

Acesse e teste:
- [ ] Login funciona
- [ ] Dados do PE aparecem
- [ ] Criar orçamento funciona
- [ ] Criar meta funciona
- [ ] Criar investimento funciona

## 🔧 Configurações Adicionais

### Domínio Personalizado (Opcional)

1. Na Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure o DNS conforme instruções

### Variáveis de Ambiente por Ambiente

Você pode ter diferentes valores para:
- **Production** - Produção
- **Preview** - Branches de preview
- **Development** - Desenvolvimento local

### Configurar Redirects (Opcional)

Crie `vercel.json` na raiz:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Isso garante que as rotas do React Router funcionem corretamente.

## 🔄 Atualizações Automáticas

### Deploy Automático

Toda vez que você fizer push para o GitHub:
1. Vercel detecta automaticamente
2. Faz o build
3. Faz o deploy
4. Atualiza o site

### Branches de Preview

Cada branch no GitHub gera uma URL de preview:
```
https://seu-bolso-inteligente-git-feature-xyz.vercel.app
```

## 🎯 Verificar Deploy

### 1. Verificar Build

No dashboard da Vercel:
1. Vá em **Deployments**
2. Clique no último deploy
3. Veja os logs

**Logs esperados:**
```
✓ Building...
✓ Compiled successfully
✓ Deployment ready
```

### 2. Verificar Variáveis

No dashboard da Vercel:
1. Vá em **Settings** → **Environment Variables**
2. Verifique se as 2 variáveis estão lá

### 3. Testar Funcionalidades

Acesse o site e teste:
- [ ] Login
- [ ] Dashboard
- [ ] Transações
- [ ] Orçamentos (novo)
- [ ] Metas (novo)
- [ ] Investimentos (novo)

## 🐛 Problemas Comuns

### Build Falha

**Erro:** `Module not found`
**Solução:** Verifique se todas as dependências estão no `package.json`

```bash
npm install
git add package.json package-lock.json
git commit -m "fix: update dependencies"
git push
```

### Variáveis de Ambiente Não Funcionam

**Erro:** `undefined` ao acessar variáveis
**Solução:** 
1. Verifique se usou o prefixo `VITE_`
2. Verifique se adicionou na Vercel
3. Faça um novo deploy (Redeploy)

### Rotas 404

**Erro:** Página não encontrada ao recarregar
**Solução:** Adicione `vercel.json` com rewrites (veja acima)

### Supabase Não Conecta

**Erro:** `Failed to fetch`
**Solução:**
1. Verifique as credenciais
2. Verifique se o projeto Supabase está ativo
3. Verifique se a URL está correta

## 📊 Monitoramento

### Analytics da Vercel

A Vercel fornece analytics gratuitos:
1. Vá em **Analytics**
2. Veja:
   - Visitantes
   - Pageviews
   - Performance
   - Erros

### Logs

Para ver logs em tempo real:
1. Vá em **Deployments**
2. Clique no deploy ativo
3. Vá em **Functions** → **Logs**

## 🔐 Segurança

### HTTPS

✅ A Vercel fornece HTTPS automaticamente

### Variáveis de Ambiente

✅ As variáveis são criptografadas e seguras

### Supabase RLS

✅ O RLS do Supabase protege os dados

## 💰 Custos

### Vercel

**Plano Hobby (Gratuito):**
- ✅ Projetos ilimitados
- ✅ 100 GB bandwidth/mês
- ✅ Deploy automático
- ✅ HTTPS
- ✅ Domínio personalizado

**Suficiente para uso pessoal!**

### Supabase

Como você já usa o PE, **não há custo adicional**!

## 🎉 Checklist Final

- [ ] Código commitado no GitHub
- [ ] Projeto importado na Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Site acessível
- [ ] Login funciona
- [ ] Dados do PE aparecem
- [ ] Orçamentos funcionam
- [ ] Metas funcionam
- [ ] Investimentos funcionam
- [ ] Responsivo (mobile)
- [ ] Dark mode funciona

## 🚀 Próximos Passos

### 1. Compartilhar

Compartilhe a URL com outras pessoas:
```
https://seu-bolso-inteligente.vercel.app
```

### 2. Domínio Personalizado (Opcional)

Configure um domínio próprio:
```
https://meubolso.com.br
```

### 3. Monitorar

Acompanhe o uso no dashboard da Vercel

### 4. Atualizar

Faça push no GitHub para atualizar automaticamente

## 📚 Recursos

### Documentação
- [Vercel Docs](https://vercel.com/docs)
- [Vite Docs](https://vitejs.dev)
- [Supabase Docs](https://supabase.com/docs)

### Suporte
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Supabase Discord](https://discord.supabase.com)

## 🎊 Parabéns!

Seu projeto está no ar! 🚀

Agora você tem:
- ✅ Sistema financeiro completo
- ✅ Deploy automático
- ✅ HTTPS gratuito
- ✅ Usando o mesmo Supabase do PE
- ✅ Pronto para usar!

---

**URL do Projeto:** https://seu-bolso-inteligente.vercel.app

**Status:** 🟢 Online

**Última Atualização:** Automática via GitHub
