# 🚀 APLICAR FIX DE PARCELAS - GUIA RÁPIDO

## ⚡ PASSOS PARA APLICAR

### 1️⃣ Aplicar Migração no Supabase

**Opção A: Via Supabase CLI (Recomendado)**
```bash
supabase db push
```

**Opção B: Via SQL Editor**
1. Abra o Supabase Dashboard
2. Vá em SQL Editor
3. Copie e cole o conteúdo de: `scripts/APLICAR_FIX_COMPETENCE_DATE.sql`
4. Execute (Run)

### 2️⃣ Verificar Aplicação

Execute no SQL Editor:
```sql
-- Verificar se o campo existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'competence_date';

-- Deve retornar: competence_date | date
```

### 3️⃣ Executar Testes (Opcional)

```bash
# No SQL Editor, execute:
# scripts/TESTE_COMPETENCE_DATE.sql
```

### 4️⃣ Reiniciar Frontend

```bash
# Parar o servidor (Ctrl+C)
# Reiniciar
npm run dev
# ou
bun run dev
```

---

## ✅ VERIFICAÇÃO RÁPIDA

### No Supabase SQL Editor:

```sql
-- Ver parcelas com competência
SELECT 
  description,
  date,
  competence_date,
  current_installment || '/' || total_installments as parcela
FROM transactions 
WHERE is_installment = TRUE
ORDER BY competence_date, current_installment
LIMIT 10;
```

### No Frontend:

1. Crie uma despesa parcelada em 3x
2. Navegue para o mês atual → deve ver 1 parcela
3. Navegue para o próximo mês → deve ver 1 parcela
4. Navegue para o mês seguinte → deve ver 1 parcela
5. Volte para o mês atual → ainda deve ver 1 parcela

---

## 🐛 PROBLEMAS COMUNS

### Erro: "column competence_date does not exist"
**Solução**: A migração não foi aplicada. Execute o passo 1 novamente.

### Erro: "duplicate key value violates unique constraint"
**Solução**: Isso é esperado! Significa que a proteção contra duplicação está funcionando.

### Parcelas ainda acumulam
**Solução**: 
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o frontend foi reiniciado
3. Verifique se a migração foi aplicada corretamente

---

## 📁 ARQUIVOS MODIFICADOS

### Banco de Dados
- ✅ `supabase/migrations/20251227200000_add_competence_date_field.sql`
- ✅ `scripts/APLICAR_FIX_COMPETENCE_DATE.sql`
- ✅ `scripts/TESTE_COMPETENCE_DATE.sql`

### Frontend
- ✅ `src/hooks/useTransactions.ts`
- ✅ `src/components/shared/SharedInstallmentImport.tsx`

### Documentação
- ✅ `CORRECAO_BUG_PARCELAS_ACUMULADAS.md`
- ✅ `APLICAR_FIX_PARCELAS_AGORA.md` (este arquivo)

---

## 🎯 RESULTADO ESPERADO

### Antes (❌ ERRADO)
```
Janeiro:   1 parcela
Fevereiro: 2 parcelas (acumulou)
Março:     3 parcelas (acumulou)
```

### Depois (✅ CORRETO)
```
Janeiro:   1 parcela
Fevereiro: 1 parcela
Março:     1 parcela
```

---

## 📞 SUPORTE

Se precisar de ajuda:

1. Verifique os logs do Supabase
2. Verifique o console do navegador (F12)
3. Execute o script de teste: `scripts/TESTE_COMPETENCE_DATE.sql`
4. Consulte a documentação completa: `CORRECAO_BUG_PARCELAS_ACUMULADAS.md`

---

**Data**: 27/12/2024  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para Aplicar
