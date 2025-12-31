# ✅ CHECKLIST DE TESTES - SISTEMA DE COMPARTILHAMENTO

**Data:** 31/12/2024  
**Objetivo:** Validar correções aplicadas

---

## 🔧 PRÉ-REQUISITOS

- [ ] Migrations aplicadas no Supabase
- [ ] Código atualizado no frontend
- [ ] Dois usuários de teste criados (User A e User B)
- [ ] Usuários vinculados como família

---

## 📝 TESTES FUNCIONAIS

### TESTE 1: Criar Despesa Compartilhada Simples

**Objetivo:** Verificar criação de splits e espelhamento

**Passos:**
1. [ ] Login como User A
2. [ ] Criar transação:
   - [ ] Valor: R$ 100
   - [ ] Descrição: "Teste Compartilhado 1"
   - [ ] Categoria: Alimentação
   - [ ] Conta: Qualquer
3. [ ] Clicar "Dividir despesa"
4. [ ] Selecionar "Eu Paguei"
5. [ ] Selecionar User B
6. [ ] Escolher 50/50
7. [ ] Clicar "Confirmar"
8. [ ] **VERIFICAR:** Resumo mostra "1 pessoa · Eu paguei"
9. [ ] Clicar "Salvar"
10. [ ] **VERIFICAR:** Toast de sucesso

**Validações no Banco:**
```sql
-- Deve ter 1 transação original
SELECT * FROM transactions 
WHERE description = 'Teste Compartilhado 1' 
  AND user_id = 'user_a_id'
  AND is_shared = TRUE;
-- Resultado esperado: 1 linha

-- Deve ter 1 split
SELECT * FROM transaction_splits 
WHERE transaction_id = (
  SELECT id FROM transactions 
  WHERE description = 'Teste Compartilhado 1'
);
-- Resultado esperado: 1 linha, amount = 50

-- Deve ter 1 transação espelhada
SELECT * FROM transactions 
WHERE description = 'Teste Compartilhado 1' 
  AND user_id = 'user_b_id'
  AND source_transaction_id IS NOT NULL;
-- Resultado esperado: 1 linha, amount = 50

-- Deve ter 3 entradas no ledger
SELECT * FROM financial_ledger 
WHERE description LIKE '%Teste Compartilhado 1%';
-- Resultado esperado: 3 linhas
--   1 DEBIT user_a 100
--   1 CREDIT user_a 50
--   1 DEBIT user_b 50
```

**Validações na UI:**
- [ ] User A vê transação de R$ 100 em "Transações"
- [ ] User A vê "User B me deve R$ 50" em "Compartilhados"

**Login como User B:**
- [ ] User B vê transação de R$ 50 em "Transações"
- [ ] Nota diz "Despesa compartilhada - Paga por [User A]"
- [ ] User B vê "Devo R$ 50 para User A" em "Compartilhados"

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 2: Despesa Paga por Outro

**Objetivo:** Verificar registro de dívida quando outro paga

**Passos:**
1. [ ] Login como User A
2. [ ] Criar transação:
   - [ ] Valor: R$ 40
   - [ ] Descrição: "Teste Outro Pagou"
3. [ ] Clicar "Dividir despesa"
4. [ ] Selecionar "Outro Pagou"
5. [ ] Selecionar User B como pagador
6. [ ] **NÃO** selecionar ninguém para dividir
7. [ ] Clicar "Confirmar" e "Salvar"

**Validações:**
```sql
-- Transação deve ter payer_id
SELECT * FROM transactions 
WHERE description = 'Teste Outro Pagou'
  AND payer_id IS NOT NULL;
```

**UI:**
- [ ] User A vê "Devo R$ 40 para User B"
- [ ] User B vê "User A me deve R$ 40"

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 3: Divisão Personalizada (70/30)

**Objetivo:** Verificar cálculo correto de percentuais

**Passos:**
1. [ ] Login como User A
2. [ ] Criar transação R$ 150 "Teste 70/30"
3. [ ] Dividir com User B
4. [ ] Clicar preset "70/30"
5. [ ] **VERIFICAR:** User B paga 30% = R$ 45
6. [ ] Salvar

**Validações:**
```sql
SELECT amount, percentage FROM transaction_splits
WHERE transaction_id = (
  SELECT id FROM transactions WHERE description = 'Teste 70/30'
);
-- Resultado: amount = 45, percentage = 30
```

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 4: Cálculo de Saldo Líquido

**Objetivo:** Verificar compensação automática

**Cenário:**
- User A pagou R$ 100 → User B deve R$ 50
- User B pagou R$ 40 → User A deve R$ 40
- Saldo líquido: User B deve R$ 10

**Validação:**
```sql
SELECT * FROM calculate_balance_between_users(
  'user_a_id',
  'user_b_id',
  'BRL'
);
-- Resultado esperado:
-- user1_owes: 40
-- user2_owes: 50
-- net_balance: -10 (User B deve 10)
```

**UI:**
- [ ] User A vê "User B me deve R$ 10"
- [ ] User B vê "Devo R$ 10 para User A"

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 5: Acertar Contas

**Objetivo:** Verificar marcação de acerto

**Passos:**
1. [ ] Login como User A
2. [ ] Acessar "Compartilhados" > User B
3. [ ] Clicar "Acertar Contas"
4. [ ] Confirmar

**Validações:**
```sql
-- Todas as entradas devem estar acertadas
SELECT COUNT(*) FROM financial_ledger
WHERE (user_id = 'user_a_id' AND related_user_id = 'user_b_id')
   OR (user_id = 'user_b_id' AND related_user_id = 'user_a_id')
  AND is_settled = FALSE;
-- Resultado esperado: 0

-- Splits devem estar acertados
SELECT COUNT(*) FROM transaction_splits
WHERE is_settled = FALSE
  AND (user_id = 'user_a_id' OR user_id = 'user_b_id');
-- Resultado esperado: 0
```

**UI:**
- [ ] Saldo zerado
- [ ] Histórico mostra "✓ Acertado"

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 6: Editar Transação Compartilhada

**Objetivo:** Verificar atualização de espelhamento

**Passos:**
1. [ ] Editar transação "Teste Compartilhado 1"
2. [ ] Mudar descrição para "Teste Editado"
3. [ ] Mudar valor para R$ 120
4. [ ] Salvar

**Validações:**
```sql
-- Transação original atualizada
SELECT * FROM transactions 
WHERE description = 'Teste Editado'
  AND user_id = 'user_a_id';
-- amount deve ser 120

-- Transação espelhada atualizada
SELECT * FROM transactions 
WHERE description = 'Teste Editado'
  AND user_id = 'user_b_id';
-- amount deve ser 60 (50% de 120)

-- Split atualizado
SELECT amount FROM transaction_splits
WHERE transaction_id = (
  SELECT id FROM transactions 
  WHERE description = 'Teste Editado' 
    AND user_id = 'user_a_id'
);
-- amount deve ser 60
```

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 7: Deletar Transação Compartilhada

**Objetivo:** Verificar remoção em cascata

**Passos:**
1. [ ] Deletar transação "Teste Editado"
2. [ ] Confirmar

**Validações:**
```sql
-- Transação original deletada
SELECT COUNT(*) FROM transactions 
WHERE description = 'Teste Editado';
-- Resultado: 0

-- Splits deletados (CASCADE)
SELECT COUNT(*) FROM transaction_splits
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE description = 'Teste Editado'
);
-- Resultado: 0

-- Transação espelhada deletada (trigger)
SELECT COUNT(*) FROM transactions 
WHERE source_transaction_id IN (
  SELECT id FROM transactions WHERE description = 'Teste Editado'
);
-- Resultado: 0
```

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 8: Viagem com Moeda Estrangeira

**Objetivo:** Verificar compartilhamento em EUR

**Pré-requisito:**
- [ ] Criar viagem "Paris" com moeda EUR
- [ ] Adicionar User B como participante
- [ ] Criar conta internacional em EUR

**Passos:**
1. [ ] Criar transação:
   - [ ] Valor: EUR 120
   - [ ] Viagem: Paris
   - [ ] Conta: Cartão EUR
2. [ ] Dividir 50/50 com User B
3. [ ] Salvar

**Validações:**
```sql
-- Transação em EUR
SELECT currency FROM transactions 
WHERE trip_id = 'paris_trip_id';
-- Resultado: EUR

-- Ledger em EUR
SELECT currency FROM financial_ledger
WHERE transaction_id IN (
  SELECT id FROM transactions WHERE trip_id = 'paris_trip_id'
);
-- Resultado: EUR (todas as linhas)
```

**UI:**
- [ ] User A vê "User B me deve EUR 60"
- [ ] Saldo em EUR separado de saldo em BRL

**Status:** [ ] PASSOU [ ] FALHOU

---

## 🚨 TESTES DE VALIDAÇÃO

### TESTE 9: Impedir Transação Compartilhada Sem Splits

**Objetivo:** Validação deve bloquear

**Passos:**
1. [ ] Criar transação R$ 50
2. [ ] Clicar "Dividir despesa"
3. [ ] Selecionar "Eu Paguei"
4. [ ] **NÃO** selecionar nenhum membro
5. [ ] Clicar "Confirmar"
6. [ ] Clicar "Salvar"

**Resultado esperado:**
- [ ] Toast de erro: "Selecione pelo menos um membro para dividir"
- [ ] Modal reabre automaticamente
- [ ] Transação NÃO é criada

**Status:** [ ] PASSOU [ ] FALHOU

---

### TESTE 10: Validar Valor Positivo

**Objetivo:** Não permitir valor zero ou negativo

**Passos:**
1. [ ] Tentar criar transação com valor R$ 0
2. [ ] Clicar "Salvar"

**Resultado esperado:**
- [ ] Toast de erro: "O valor deve ser maior que zero"

**Status:** [ ] PASSOU [ ] FALHOU

---

## 📊 TESTES DE PERFORMANCE

### TESTE 11: Múltiplas Transações Compartilhadas

**Objetivo:** Verificar performance com volume

**Passos:**
1. [ ] Criar 10 transações compartilhadas
2. [ ] Verificar tempo de resposta
3. [ ] Verificar integridade dos dados

**Validações:**
```sql
-- Deve ter 10 originais + 10 espelhadas = 20
SELECT COUNT(*) FROM transactions 
WHERE is_shared = TRUE;
-- Resultado: 20

-- Deve ter 10 splits
SELECT COUNT(*) FROM transaction_splits;
-- Resultado: 10

-- Deve ter 30 entradas no ledger (3 por transação)
SELECT COUNT(*) FROM financial_ledger;
-- Resultado: 30
```

**Status:** [ ] PASSOU [ ] FALHOU

---

## 🔍 TESTES DE INTEGRIDADE

### TESTE 12: Consistência Ledger vs Splits

**Objetivo:** Garantir que ledger e splits estão sincronizados

**Validação:**
```sql
-- Soma de splits deve bater com soma de créditos no ledger
WITH split_totals AS (
  SELECT SUM(amount) as total FROM transaction_splits
  WHERE user_id = 'user_b_id'
),
ledger_totals AS (
  SELECT SUM(amount) as total FROM financial_ledger
  WHERE user_id = 'user_b_id' AND entry_type = 'DEBIT'
)
SELECT 
  s.total as split_total,
  l.total as ledger_total,
  s.total = l.total as is_consistent
FROM split_totals s, ledger_totals l;
-- is_consistent deve ser TRUE
```

**Status:** [ ] PASSOU [ ] FALHOU

---

## 📋 RESUMO DOS TESTES

| # | Teste | Status | Observações |
|---|-------|--------|-------------|
| 1 | Criar compartilhada simples | [ ] | |
| 2 | Outro pagou | [ ] | |
| 3 | Divisão 70/30 | [ ] | |
| 4 | Saldo líquido | [ ] | |
| 5 | Acertar contas | [ ] | |
| 6 | Editar compartilhada | [ ] | |
| 7 | Deletar compartilhada | [ ] | |
| 8 | Viagem EUR | [ ] | |
| 9 | Validação sem splits | [ ] | |
| 10 | Validação valor | [ ] | |
| 11 | Performance | [ ] | |
| 12 | Integridade | [ ] | |

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

Para considerar o sistema pronto para produção:

- [ ] Todos os testes funcionais passaram
- [ ] Todos os testes de validação passaram
- [ ] Testes de performance aceitáveis (< 2s)
- [ ] Testes de integridade 100% consistentes
- [ ] Sem erros no console
- [ ] Sem warnings no banco de dados

---

## 🐛 REGISTRO DE BUGS

| # | Descrição | Severidade | Status |
|---|-----------|------------|--------|
| | | | |

---

**Checklist completo. Executar testes após aplicar migrations.**

