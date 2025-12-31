# ✅ CHECKLIST: APLICAÇÃO DO FIX DE PARCELAS

## 📋 PRÉ-REQUISITOS

- [ ] Acesso ao Supabase Dashboard
- [ ] Supabase CLI instalado (opcional)
- [ ] Backup do banco de dados (recomendado)
- [ ] Ambiente de desenvolvimento rodando

---

## 🔧 APLICAÇÃO

### 1. Banco de Dados

- [ ] **Aplicar migração principal**
  - Via CLI: `supabase db push`
  - Ou via SQL Editor: executar `scripts/APLICAR_FIX_COMPETENCE_DATE.sql`

- [ ] **Verificar campo criado**
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'transactions' AND column_name = 'competence_date';
  ```
  - Deve retornar: `competence_date`

- [ ] **Verificar índices**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'transactions' AND indexname LIKE '%competence%';
  ```
  - Deve retornar: `idx_transactions_competence_date`

- [ ] **Verificar constraint de unicidade**
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'transactions' AND indexname = 'idx_unique_installment_per_series';
  ```
  - Deve retornar: `idx_unique_installment_per_series`

- [ ] **Verificar trigger**
  ```sql
  SELECT trigger_name FROM information_schema.triggers
  WHERE event_object_table = 'transactions' AND trigger_name = 'ensure_competence_date';
  ```
  - Deve retornar: `ensure_competence_date`

### 2. Frontend

- [ ] **Parar servidor de desenvolvimento**
  - Pressionar `Ctrl+C` no terminal

- [ ] **Limpar cache (opcional)**
  ```bash
  rm -rf node_modules/.vite
  # ou
  npm run clean
  ```

- [ ] **Reiniciar servidor**
  ```bash
  npm run dev
  # ou
  bun run dev
  ```

- [ ] **Verificar console do navegador**
  - Abrir DevTools (F12)
  - Verificar se não há erros relacionados a `competence_date`

---

## 🧪 TESTES

### Testes Automáticos

- [ ] **Executar script de teste**
  - No SQL Editor: executar `scripts/TESTE_COMPETENCE_DATE.sql`
  - Todos os testes devem passar ✅

### Testes Manuais

#### Teste 1: Criar Parcelamento
- [ ] Acessar página de transações
- [ ] Criar nova despesa parcelada em 3x
- [ ] Verificar que 3 registros foram criados no banco
- [ ] Cada registro deve ter `competence_date` diferente

#### Teste 2: Navegação Entre Meses
- [ ] Navegar para Janeiro
- [ ] Verificar que mostra APENAS 1 parcela
- [ ] Navegar para Fevereiro
- [ ] Verificar que mostra APENAS 1 parcela
- [ ] Navegar para Março
- [ ] Verificar que mostra APENAS 1 parcela
- [ ] Voltar para Janeiro
- [ ] Verificar que AINDA mostra apenas 1 parcela

#### Teste 3: Totais Financeiros
- [ ] Verificar total de despesas do mês
- [ ] Deve corresponder apenas às parcelas do mês
- [ ] Não deve acumular parcelas de outros meses

#### Teste 4: Importação de Parcelas Compartilhadas
- [ ] Acessar "Despesas Compartilhadas"
- [ ] Clicar em "Importar Parcelas"
- [ ] Criar parcelamento compartilhado 6x
- [ ] Verificar que 6 parcelas foram criadas
- [ ] Navegar entre meses
- [ ] Cada mês deve mostrar apenas sua parcela

#### Teste 5: Proteção Contra Duplicação
- [ ] Tentar criar parcela duplicada manualmente no SQL
  ```sql
  -- Deve retornar erro de constraint
  INSERT INTO transactions (
    user_id, amount, description, date, competence_date,
    type, domain, is_installment, current_installment,
    total_installments, series_id
  ) VALUES (
    'user-id', 100, 'Teste', '2026-01-15', '2026-01-01',
    'EXPENSE', 'PERSONAL', TRUE, 1, 3, 'series-id-existente'
  );
  ```
- [ ] Deve retornar erro: `duplicate key value violates unique constraint`

#### Teste 6: Transações Espelhadas
- [ ] Criar transação compartilhada parcelada
- [ ] Verificar que espelhos também têm `competence_date`
- [ ] Verificar que espelhos aparecem no mês correto

---

## 🔍 VERIFICAÇÕES FINAIS

### Banco de Dados

- [ ] **Verificar parcelas existentes**
  ```sql
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

- [ ] **Verificar distribuição por mês**
  ```sql
  SELECT 
    TO_CHAR(competence_date, 'YYYY-MM') as mes,
    COUNT(*) as total_parcelas
  FROM transactions 
  WHERE is_installment = TRUE
  GROUP BY competence_date
  ORDER BY competence_date;
  ```
  - Deve mostrar distribuição uniforme, não acumulativa

### Frontend

- [ ] **Verificar queries no Network**
  - Abrir DevTools → Network
  - Filtrar por "transactions"
  - Verificar que queries usam `competence_date`

- [ ] **Verificar dados renderizados**
  - Inspecionar componente de lista de transações
  - Verificar que cada transação tem `competence_date`

---

## 📊 MÉTRICAS DE SUCESSO

### Critérios de Aceitação

- [ ] ✅ Campo `competence_date` existe e está populado
- [ ] ✅ Índices criados e funcionando
- [ ] ✅ Constraint de unicidade ativa
- [ ] ✅ Trigger de normalização funcionando
- [ ] ✅ Frontend filtra por competência
- [ ] ✅ Cada mês mostra apenas suas parcelas
- [ ] ✅ Totais financeiros corretos
- [ ] ✅ Sem erros no console
- [ ] ✅ Sem erros no Supabase
- [ ] ✅ Performance aceitável (< 100ms)

### Indicadores de Problema

- [ ] ❌ Parcelas ainda acumulam
- [ ] ❌ Erros de "column not found"
- [ ] ❌ Queries lentas (> 500ms)
- [ ] ❌ Duplicação de parcelas
- [ ] ❌ Totais incorretos

---

## 🚨 ROLLBACK (Se Necessário)

### Reverter Migração

```sql
-- 1. Remover trigger
DROP TRIGGER IF EXISTS ensure_competence_date ON transactions;

-- 2. Remover função
DROP FUNCTION IF EXISTS validate_competence_date();

-- 3. Remover índices
DROP INDEX IF EXISTS idx_transactions_competence_date;
DROP INDEX IF EXISTS idx_unique_installment_per_series;

-- 4. Remover coluna
ALTER TABLE transactions DROP COLUMN IF EXISTS competence_date;
```

### Reverter Frontend

```bash
git checkout HEAD -- src/hooks/useTransactions.ts
git checkout HEAD -- src/components/shared/SharedInstallmentImport.tsx
```

---

## 📝 DOCUMENTAÇÃO

- [ ] **Ler documentação completa**
  - `CORRECAO_BUG_PARCELAS_ACUMULADAS.md`

- [ ] **Ler guia rápido**
  - `APLICAR_FIX_PARCELAS_AGORA.md`

- [ ] **Ler resumo**
  - `RESUMO_FIX_PARCELAS.md`

- [ ] **Revisar scripts**
  - `scripts/APLICAR_FIX_COMPETENCE_DATE.sql`
  - `scripts/TESTE_COMPETENCE_DATE.sql`

---

## ✅ CONCLUSÃO

- [ ] **Todos os itens acima foram verificados**
- [ ] **Todos os testes passaram**
- [ ] **Sistema funcionando corretamente**
- [ ] **Documentação revisada**
- [ ] **Equipe notificada**

---

## 📅 REGISTRO

**Data de Aplicação**: ___/___/______  
**Aplicado por**: _________________  
**Ambiente**: [ ] Dev [ ] Staging [ ] Produção  
**Tempo de Aplicação**: _____ minutos  
**Problemas Encontrados**: _________________  
**Status Final**: [ ] ✅ Sucesso [ ] ❌ Falha [ ] ⚠️ Parcial

---

**Versão**: 1.0.0  
**Data de Criação**: 27/12/2024  
**Última Atualização**: 27/12/2024
