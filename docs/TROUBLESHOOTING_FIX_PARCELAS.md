# 🔧 TROUBLESHOOTING: FIX DE PARCELAS

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

---

## PROBLEMA 1: "column competence_date does not exist"

### Sintomas
- Erro no console do navegador
- Erro ao criar transações
- Queries falhando

### Causa
Migração não foi aplicada ou falhou

### Solução

#### Passo 1: Verificar se a coluna existe
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'competence_date';
```

#### Passo 2: Se não existir, aplicar migração
```bash
# Via CLI
supabase db push

# Ou via SQL Editor
# Executar: scripts/APLICAR_FIX_COMPETENCE_DATE.sql
```

#### Passo 3: Reiniciar frontend
```bash
# Parar (Ctrl+C)
npm run dev
```

---

## PROBLEMA 2: Parcelas ainda acumulam

### Sintomas
- Janeiro: 1 parcela
- Fevereiro: 2 parcelas
- Março: 3 parcelas

### Causa
Frontend não está usando o campo correto ou cache antigo

### Solução

#### Passo 1: Limpar cache do navegador
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

#### Passo 2: Verificar query no Network
1. Abrir DevTools (F12)
2. Aba Network
3. Filtrar por "transactions"
4. Verificar se query usa `competence_date`

#### Passo 3: Verificar código
```typescript
// src/hooks/useTransactions.ts
// Deve ter:
query.gte("competence_date", effectiveFilters.startDate);
query.lte("competence_date", effectiveFilters.endDate);

// NÃO deve ter:
query.gte("date", effectiveFilters.startDate); // ❌ ERRADO
```

#### Passo 4: Reiniciar servidor
```bash
# Parar completamente
Ctrl + C

# Limpar cache
rm -rf node_modules/.vite

# Reiniciar
npm run dev
```

---

## PROBLEMA 3: Erro "duplicate key value violates unique constraint"

### Sintomas
- Erro ao criar parcelas
- Mensagem: `idx_unique_installment_per_series`

### Causa
Tentativa de criar parcela duplicada (mesma série + mesmo número)

### Solução

#### Se for erro legítimo (bug)
```sql
-- Verificar parcelas duplicadas
SELECT 
  series_id,
  current_installment,
  COUNT(*) as duplicatas
FROM transactions
WHERE is_installment = TRUE
  AND series_id IS NOT NULL
GROUP BY series_id, current_installment
HAVING COUNT(*) > 1;
```

#### Se encontrar duplicatas, remover manualmente
```sql
-- CUIDADO: Backup antes!
-- Remove duplicatas mantendo a mais recente
DELETE FROM transactions t1
WHERE is_installment = TRUE
  AND EXISTS (
    SELECT 1 FROM transactions t2
    WHERE t2.series_id = t1.series_id
      AND t2.current_installment = t1.current_installment
      AND t2.created_at > t1.created_at
  );
```

#### Se for proteção funcionando (esperado)
- ✅ Isso é normal!
- ✅ Constraint está prevenindo duplicação
- ✅ Não criar a mesma parcela novamente

---

## PROBLEMA 4: Queries muito lentas

### Sintomas
- Carregamento demorado (> 2 segundos)
- Timeout em queries
- Interface travando

### Causa
Índice não foi criado ou não está sendo usado

### Solução

#### Passo 1: Verificar índice
```sql
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'transactions' 
  AND indexname = 'idx_transactions_competence_date';
```

#### Passo 2: Se não existir, criar
```sql
CREATE INDEX idx_transactions_competence_date 
ON transactions(user_id, competence_date);
```

#### Passo 3: Analisar query plan
```sql
EXPLAIN ANALYZE
SELECT * FROM transactions
WHERE user_id = 'user-id'
  AND competence_date >= '2026-01-01'
  AND competence_date < '2026-02-01';
```

#### Passo 4: Verificar uso do índice
- Deve aparecer: `Index Scan using idx_transactions_competence_date`
- NÃO deve aparecer: `Seq Scan` (scan sequencial)

---

## PROBLEMA 5: Competence_date com valor NULL

### Sintomas
- Transações sem competence_date
- Erro ao inserir: "null value in column competence_date"

### Causa
Trigger não está funcionando ou foi desabilitado

### Solução

#### Passo 1: Verificar trigger
```sql
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'transactions'
  AND trigger_name = 'ensure_competence_date';
```

#### Passo 2: Se não existir, recriar
```sql
CREATE OR REPLACE FUNCTION validate_competence_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.competence_date IS NOT NULL THEN
    NEW.competence_date := DATE_TRUNC('month', NEW.competence_date)::DATE;
  ELSE
    NEW.competence_date := DATE_TRUNC('month', NEW.date)::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ensure_competence_date ON transactions;
CREATE TRIGGER ensure_competence_date
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_competence_date();
```

#### Passo 3: Corrigir registros existentes
```sql
UPDATE transactions
SET competence_date = DATE_TRUNC('month', date)::DATE
WHERE competence_date IS NULL;
```

---

## PROBLEMA 6: Transações espelhadas sem competence_date

### Sintomas
- Transações compartilhadas aparecem em todos os meses
- Espelhos não têm competence_date

### Causa
Função de espelhamento não foi atualizada

### Solução

#### Passo 1: Verificar função
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_transaction_mirroring';
```

#### Passo 2: Atualizar função
```bash
# Aplicar migração
# supabase/migrations/20251227200100_update_mirror_function_competence.sql
```

#### Passo 3: Corrigir espelhos existentes
```sql
UPDATE transactions t1
SET competence_date = t2.competence_date
FROM transactions t2
WHERE t1.source_transaction_id = t2.id
  AND t1.competence_date IS NULL;
```

---

## PROBLEMA 7: Totais financeiros incorretos

### Sintomas
- Soma de despesas não bate
- Valores diferentes do esperado

### Causa
Query de resumo não usa competence_date

### Solução

#### Verificar código
```typescript
// src/hooks/useTransactions.ts
// useFinancialSummary deve usar:
.gte("competence_date", startDate)
.lte("competence_date", endDate)
```

---

## PROBLEMA 8: Erro ao importar parcelas compartilhadas

### Sintomas
- Erro ao clicar em "Importar Parcelas"
- Parcelas não são criadas

### Causa
Componente não está passando competence_date

### Solução

#### Verificar código
```typescript
// src/components/shared/SharedInstallmentImport.tsx
// Deve calcular competence_date:
const competenceDate = format(
  new Date(installmentDate.getFullYear(), installmentDate.getMonth(), 1),
  'yyyy-MM-dd'
);
```

---

## 🔄 ROLLBACK COMPLETO

### Quando fazer rollback
- Múltiplos erros críticos
- Sistema instável
- Perda de dados

### Como fazer

#### 1. Reverter banco de dados
```sql
-- Remover trigger
DROP TRIGGER IF EXISTS ensure_competence_date ON transactions;

-- Remover função
DROP FUNCTION IF EXISTS validate_competence_date();

-- Remover índices
DROP INDEX IF EXISTS idx_transactions_competence_date;
DROP INDEX IF EXISTS idx_unique_installment_per_series;

-- Remover coluna (CUIDADO: perda de dados)
ALTER TABLE transactions DROP COLUMN IF EXISTS competence_date;
```

#### 2. Reverter frontend
```bash
git checkout HEAD -- src/hooks/useTransactions.ts
git checkout HEAD -- src/components/shared/SharedInstallmentImport.tsx
```

#### 3. Reiniciar
```bash
npm run dev
```

---

## 📞 SUPORTE AVANÇADO

### Logs do Supabase
1. Acessar Dashboard
2. Logs → Database
3. Filtrar por "error"
4. Procurar por "competence_date"

### Logs do Frontend
```javascript
// Adicionar debug temporário
console.log('Filters:', effectiveFilters);
console.log('Query:', query);
```

### Verificação de Integridade
```sql
-- Verificar transações sem competence_date
SELECT COUNT(*) 
FROM transactions 
WHERE competence_date IS NULL;

-- Verificar parcelas duplicadas
SELECT series_id, current_installment, COUNT(*)
FROM transactions
WHERE is_installment = TRUE
GROUP BY series_id, current_installment
HAVING COUNT(*) > 1;

-- Verificar espelhos sem competence_date
SELECT COUNT(*)
FROM transactions
WHERE source_transaction_id IS NOT NULL
  AND competence_date IS NULL;
```

---

## 🆘 EMERGÊNCIA

### Sistema completamente quebrado

1. **Parar tudo**
   ```bash
   Ctrl + C
   ```

2. **Fazer backup**
   ```bash
   supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Executar rollback**
   - Ver seção "ROLLBACK COMPLETO" acima

4. **Restaurar estado anterior**
   ```bash
   git checkout HEAD -- .
   npm run dev
   ```

5. **Reportar problema**
   - Coletar logs
   - Documentar erro
   - Buscar ajuda

---

## ✅ CHECKLIST DE DIAGNÓSTICO

Antes de pedir ajuda, verificar:

- [ ] Migração foi aplicada?
- [ ] Campo existe no banco?
- [ ] Índices foram criados?
- [ ] Trigger está ativo?
- [ ] Frontend foi reiniciado?
- [ ] Cache foi limpo?
- [ ] Código está correto?
- [ ] Logs foram verificados?
- [ ] Testes foram executados?
- [ ] Documentação foi lida?

---

**Última Atualização**: 27/12/2024  
**Versão**: 1.0.0
