# 🚀 Como Aplicar a Migration de Exclusão de Séries

## ⚠️ IMPORTANTE: Leia Antes de Aplicar

Esta migration corrige o erro de **"infinite recursion"** ao excluir séries de parcelas.

**Arquivo:** `supabase/migrations/20251231120000_fix_delete_installment_series.sql`

---

## 📋 Opção 1: Via Supabase Dashboard (Recomendado)

### Passo 1: Acessar SQL Editor

1. Abrir [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecionar seu projeto **Pé de Meia**
3. No menu lateral, clicar em **SQL Editor**

### Passo 2: Copiar SQL

1. Abrir o arquivo `supabase/migrations/20251231120000_fix_delete_installment_series.sql`
2. Copiar **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### Passo 3: Executar

1. Colar no SQL Editor (Ctrl+V)
2. Clicar em **Run** (ou pressionar Ctrl+Enter)
3. Aguardar mensagem de sucesso

### Passo 4: Verificar

```sql
-- Verificar se a função foi criada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'delete_installment_series';

-- Deve retornar 1 linha
```

---

## 📋 Opção 2: Via Supabase CLI

### Passo 1: Verificar CLI

```bash
# Verificar se CLI está instalado
supabase --version

# Se não estiver instalado:
# npm install -g supabase
```

### Passo 2: Login

```bash
# Fazer login no Supabase
supabase login

# Seguir instruções no navegador
```

### Passo 3: Link ao Projeto

```bash
cd seu-bolso-inteligente

# Linkar ao projeto remoto
supabase link --project-ref SEU_PROJECT_REF

# Encontre o project-ref em:
# https://supabase.com/dashboard/project/SEU_PROJECT_REF
```

### Passo 4: Aplicar Migration

```bash
# Aplicar todas as migrations pendentes
supabase db push

# Ou aplicar apenas esta migration
supabase db push --include-all
```

### Passo 5: Verificar

```bash
# Listar migrations aplicadas
supabase migration list

# Deve mostrar 20251231120000_fix_delete_installment_series.sql
```

---

## 🧪 Como Testar Após Aplicar

### Teste 1: Criar Série

1. Acessar `http://localhost:5173/transacoes`
2. Criar transação parcelada:
   - Descrição: "Teste Exclusão"
   - Valor: R$ 100,00
   - Parcelas: 5x
3. Confirmar

### Teste 2: Verificar Criação

```sql
-- No Supabase SQL Editor
SELECT 
  description,
  current_installment,
  total_installments,
  series_id
FROM transactions
WHERE description LIKE '%Teste Exclusão%'
ORDER BY current_installment;

-- Deve mostrar 5 parcelas (1/5 até 5/5)
```

### Teste 3: Excluir Série

1. Clicar em qualquer parcela
2. Clicar em "Excluir"
3. Selecionar "Excluir série completa"
4. Confirmar

### Teste 4: Verificar Exclusão

```sql
-- No Supabase SQL Editor
SELECT COUNT(*) as restantes
FROM transactions
WHERE description LIKE '%Teste Exclusão%';

-- Deve retornar 0
```

---

## ✅ Resultado Esperado

### Antes da Migration
```
❌ Erro: infinite recursion detected in policy for relation "transactions"
❌ Parcelas não são excluídas
❌ Sistema trava
```

### Depois da Migration
```
✅ Toast: "5 parcelas removidas com sucesso!"
✅ Todas as parcelas excluídas
✅ Sem erros
✅ Sistema funciona perfeitamente
```

---

## 🔍 Troubleshooting

### Erro: "permission denied for function delete_installment_series"

**Solução:** A função precisa ser criada com `SECURITY DEFINER`. Verifique se a migration foi aplicada corretamente.

```sql
-- Verificar permissões
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'delete_installment_series';

-- prosecdef deve ser 't' (true)
```

### Erro: "policy already exists"

**Solução:** A migration já foi aplicada. Não precisa aplicar novamente.

```sql
-- Verificar políticas existentes
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'transactions' 
AND policyname = 'Users can delete transactions';

-- Deve retornar 1 linha
```

### Erro: "function already exists"

**Solução:** A migration já foi aplicada. Não precisa aplicar novamente.

```sql
-- Verificar se função existe
SELECT COUNT(*) 
FROM pg_proc 
WHERE proname = 'delete_installment_series';

-- Deve retornar 1
```

---

## 📝 Notas Importantes

### 1. Backup

Antes de aplicar, faça backup do banco de dados:

```bash
# Via Supabase Dashboard
1. Ir em Database > Backups
2. Clicar em "Create backup"
3. Aguardar conclusão
```

### 2. Horário

Aplique a migration em horário de baixo uso:
- ✅ Madrugada
- ✅ Fim de semana
- ❌ Horário de pico

### 3. Monitoramento

Após aplicar, monitore os logs:

```bash
# Via Supabase Dashboard
1. Ir em Logs
2. Selecionar "Postgres"
3. Verificar se há erros
```

### 4. Rollback

Se algo der errado, você pode reverter:

```sql
-- Remover função
DROP FUNCTION IF EXISTS delete_installment_series;

-- Restaurar política antiga
-- (consultar migration anterior)
```

---

## 🎉 Conclusão

Após aplicar esta migration, o sistema estará **100% funcional** para exclusão de séries de parcelas!

**Próximos passos:**
1. ✅ Aplicar migration
2. ✅ Testar exclusão de séries
3. ✅ Monitorar logs
4. ✅ Coletar feedback dos usuários

---

**Desenvolvido por:** Kiro AI  
**Projeto:** Pé de Meia - Sistema de Gestão Financeira  
**Data:** 31 de Dezembro de 2024
