# 🎯 COMO APLICAR NO SUPABASE SQL EDITOR

## 📋 PASSO A PASSO

### 1️⃣ Abrir Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### 2️⃣ Criar Nova Query
1. Clique no botão **"New query"** (ou ícone +)
2. Dê um nome: `Fix Competence Date`

### 3️⃣ Copiar o Script
1. Abra o arquivo: `scripts/APLICAR_TUDO_COMPETENCE_DATE.sql`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)

### 4️⃣ Executar
1. Clique no botão **"Run"** (ou pressione Ctrl+Enter)
2. Aguarde a execução (pode levar alguns segundos)
3. Verifique os resultados na aba "Results"

### 5️⃣ Verificar Sucesso
Você deve ver mensagens como:
```
✅ Campo competence_date adicionado
✅ Dados existentes populados
✅ Campo definido como NOT NULL
✅ Índice criado
✅ Constraint de unicidade criada
✅ Função de validação criada
✅ Trigger criado
✅ Função de espelhamento atualizada
✅ APLICAÇÃO COMPLETA COM SUCESSO!
```

---

## 🔍 VERIFICAÇÃO RÁPIDA

Após executar, rode esta query para confirmar:

```sql
-- Verificar se tudo foi aplicado
SELECT 
  'Campo competence_date' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'competence_date'
  ) THEN '✅ OK' ELSE '❌ FALHOU' END as status
UNION ALL
SELECT 
  'Índice idx_transactions_competence_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions' AND indexname = 'idx_transactions_competence_date'
  ) THEN '✅ OK' ELSE '❌ FALHOU' END
UNION ALL
SELECT 
  'Constraint idx_unique_installment_per_series',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions' AND indexname = 'idx_unique_installment_per_series'
  ) THEN '✅ OK' ELSE '❌ FALHOU' END
UNION ALL
SELECT 
  'Trigger ensure_competence_date',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_table = 'transactions' AND trigger_name = 'ensure_competence_date'
  ) THEN '✅ OK' ELSE '❌ FALHOU' END;
```

**Resultado esperado**: Todos os itens devem mostrar ✅ OK

---

## 🎯 PRÓXIMOS PASSOS

### 1. Reiniciar Frontend
```bash
# No terminal do projeto
npm run dev
# ou
bun run dev
```

### 2. Testar no Sistema
1. Criar uma despesa parcelada em 3x
2. Navegar para Janeiro → deve ver 1 parcela
3. Navegar para Fevereiro → deve ver 1 parcela
4. Navegar para Março → deve ver 1 parcela
5. Voltar para Janeiro → ainda deve ver 1 parcela

### 3. Verificar Dados
```sql
-- Ver parcelas com competência
SELECT 
  description,
  date,
  competence_date,
  current_installment || '/' || total_installments as parcela,
  amount
FROM transactions 
WHERE is_installment = TRUE
ORDER BY competence_date, current_installment
LIMIT 10;
```

---

## 🚨 SE ALGO DER ERRADO

### Erro: "column already exists"
✅ Isso é normal! Significa que o campo já foi criado. Continue a execução.

### Erro: "syntax error"
❌ Verifique se copiou TODO o script corretamente.

### Erro: "permission denied"
❌ Verifique se está usando o usuário correto (postgres ou service_role).

### Rollback (Reverter)
Se precisar desfazer tudo:

```sql
-- CUIDADO: Isso remove todas as alterações
DROP TRIGGER IF EXISTS ensure_competence_date ON transactions;
DROP FUNCTION IF EXISTS validate_competence_date();
DROP INDEX IF EXISTS idx_transactions_competence_date;
DROP INDEX IF EXISTS idx_unique_installment_per_series;
ALTER TABLE transactions DROP COLUMN IF EXISTS competence_date;
```

---

## 📞 PRECISA DE AJUDA?

1. **Erro na execução**: Consulte [TROUBLESHOOTING_FIX_PARCELAS.md](./TROUBLESHOOTING_FIX_PARCELAS.md)
2. **Dúvidas técnicas**: Consulte [CORRECAO_BUG_PARCELAS_ACUMULADAS.md](./CORRECAO_BUG_PARCELAS_ACUMULADAS.md)
3. **Guia completo**: Consulte [README_FIX_PARCELAS.md](./README_FIX_PARCELAS.md)

---

## ✅ CHECKLIST

- [ ] Abri o Supabase SQL Editor
- [ ] Copiei o script completo
- [ ] Executei o script
- [ ] Vi mensagens de sucesso
- [ ] Executei query de verificação
- [ ] Todos os itens mostraram ✅ OK
- [ ] Reiniciei o frontend
- [ ] Testei criação de parcelas
- [ ] Verifiquei navegação entre meses

---

**Tempo estimado**: 5-10 minutos  
**Dificuldade**: Fácil  
**Reversível**: Sim (com rollback)
