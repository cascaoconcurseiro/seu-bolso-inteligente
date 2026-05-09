# Setup Keep-Alive com cron-job.org (Gratuito)

## 🎯 Objetivo
Manter Supabase e Vercel acordados fazendo um ping automático a cada 1-2 dias.

## 📋 Pré-requisitos
- Conta no [cron-job.org](https://cron-job.org) (gratuito, sem cartão)
- URL do seu app no Vercel (ex: `https://seu-bolso-inteligente.vercel.app`)

## 🔧 Passo 1: Configurar Variável de Ambiente

Adicione no seu `.env.production`:
```
KEEP_ALIVE_TOKEN=seu-token-secreto-aqui
```

Ou configure diretamente no Vercel:
1. Vá para https://vercel.com/seu-usuario/seu-bolso-inteligente/settings/environment-variables
2. Adicione: `KEEP_ALIVE_TOKEN` = `seu-token-secreto-aqui`

## 🔧 Passo 2: Criar Conta no cron-job.org

1. Acesse https://cron-job.org
2. Clique em "Sign Up" (gratuito)
3. Confirme seu email
4. Faça login

## 🔧 Passo 3: Criar Novo Cron Job

1. Clique em "Create Cronjob"
2. Preencha os campos:

### Configuração Básica
- **Title**: `Keep Alive - Seu Bolso Inteligente`
- **URL**: `https://seu-bolso-inteligente.vercel.app/api/keep-alive?token=seu-token-secreto-aqui`
- **Execution time**: Escolha um horário (ex: 14:00 UTC)
- **Interval**: `Every 2 days` (a cada 2 dias)

### Configuração Avançada
- **Request method**: GET
- **Timeout**: 30 segundos
- **Notifications**: Ative para receber alertas se falhar

## ✅ Passo 4: Testar

1. Clique em "Test Execution" para testar imediatamente
2. Verifique se recebeu resposta `200 OK`
3. Veja os logs em "Execution Log"

## 📊 Monitoramento

### Ver Logs
1. Vá para "Cronjobs" → seu job
2. Clique em "Execution Log"
3. Veja histórico de execuções

### Alertas
- Ative notificações por email
- Receba alertas se o job falhar

## 🔐 Segurança

O token `KEEP_ALIVE_TOKEN` protege seu endpoint:
- Apenas requisições com o token correto funcionam
- Mude o token periodicamente
- Não compartilhe o token

## 📱 Alternativa: Usar Seu Celular

Se preferir, pode usar um app como:
- **Tasker** (Android) - Automação local
- **Shortcuts** (iOS) - Automação nativa
- **IFTTT** - Automação na nuvem

## 🆘 Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se o token está correto
- Confirme que está na URL

### Erro 500 (Server Error)
- Verifique se Supabase está online
- Veja os logs do Vercel

### Erro de Timeout
- Aumente o timeout para 60 segundos
- Verifique conexão do Vercel

## 📈 Próximos Passos

Depois que estiver funcionando:
1. Monitore os logs por 1 semana
2. Ajuste o intervalo se necessário
3. Configure alertas por email

## 💡 Dicas

- Use intervalo de **2 dias** (não precisa ser diário)
- Escolha um horário fora do pico de uso
- Mantenha o token seguro
- Teste regularmente

---

**Status**: ✅ Pronto para configurar
**Custo**: 🆓 Gratuito
**Tempo de Setup**: ⏱️ 5 minutos
