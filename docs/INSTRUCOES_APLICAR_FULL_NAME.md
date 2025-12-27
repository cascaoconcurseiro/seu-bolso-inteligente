# ⚠️ APLICAR AGORA - Correção Sistema Completo

## 🎯 Problema

O sistema está dizendo "Usuário não cadastrado" porque os profiles no banco estão com `full_name = NULL`.

## ✅ Solução (3 minutos)

### Passo 1: Abrir SQL Editor

Acesse: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql

### Passo 2: Copiar e Colar

1. Abra o arquivo: `APLICAR_AGORA_FULL_NAME.sql`
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)

### Passo 3: Executar

Clique em **"Run"** (ou pressione Ctrl+Enter)

### Passo 4: Verificar Resultado

Você deve ver no final:

```
✅ DEPOIS DA CORREÇÃO
total_profiles: 2
sem_nome: 0
com_nome: 2
```

Se `sem_nome: 0`, está tudo certo! ✅

## 🧪 Testar

Depois de aplicar:

1. Abra o aplicativo
2. Vá em "Família"
3. Clique em "Adicionar Membro"
4. Digite: `francy.von@gmail.com`
5. Aguarde 1.5 segundos
6. Deve aparecer: ✅ "Usuário cadastrado: [nome]"

## 🎉 O que o script faz

1. ✅ Corrige profiles existentes (Wesley, Fran, etc)
2. ✅ Configura trigger para novos usuários
3. ✅ Garante que TODOS os usuários (atuais e futuros) terão nome
4. ✅ Sistema funcionando para sempre

## 🚨 Se não funcionar

Execute manualmente no SQL Editor:

```sql
-- Ver profiles
SELECT email, full_name FROM profiles;

-- Se ainda tiver NULL, execute:
UPDATE profiles
SET full_name = INITCAP(SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL OR full_name = '';

-- Verificar novamente
SELECT email, full_name FROM profiles;
```

---

**IMPORTANTE**: Este script corrige o sistema TODO, não apenas para usuários específicos. Funciona para todos os usuários atuais e futuros!
