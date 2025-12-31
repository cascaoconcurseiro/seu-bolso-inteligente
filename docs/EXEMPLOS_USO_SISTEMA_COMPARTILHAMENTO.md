# 💡 EXEMPLOS PRÁTICOS - SISTEMA DE COMPARTILHAMENTO

**Data:** 31/12/2024

---

## 📖 CENÁRIOS DE USO

### CENÁRIO 1: Almoço Dividido 50/50

**Situação:**
Wesley e Fran almoçam juntos. Conta: R$ 100. Wesley paga e divide 50/50.

**Fluxo:**
```
1. Wesley cria transação:
   - Valor: R$ 100
   - Descrição: "Almoço"
   - Conta: Cartão Wesley
   - Categoria: Alimentação

2. Wesley clica "Dividir despesa"

3. No modal:
   - "Quem pagou?" → Eu Paguei
   - "Dividir com quem?" → Seleciona Fran
   - "Divisão Rápida" → 50/50

4. Wesley clica "Confirmar" e "Salvar"
```

**O que acontece no banco:**

```sql
-- 1. Transação de Wesley (original)
INSERT INTO transactions (
  user_id: wesley_id,
  amount: 100,
  description: 'Almoço',
  is_shared: TRUE
)

-- 2. Split (Fran deve)
INSERT INTO transaction_splits (
  transaction_id: tx_wesley,
  user_id: fran_id,
  amount: 50,
  percentage: 50
)

-- 3. Transação espelhada para Fran (AUTOMÁTICO)
INSERT INTO transactions (
  user_id: fran_id,
  amount: 50,
  description: 'Almoço',
  source_transaction_id: tx_wesley,
  notes: 'Paga por Wesley'
)

-- 4. Ledger (AUTOMÁTICO)
INSERT INTO financial_ledger VALUES
  (wesley_id, 'DEBIT', 100),   -- Wesley pagou
  (wesley_id, 'CREDIT', 50),   -- Wesley tem a receber
  (fran_id, 'DEBIT', 50)       -- Fran deve
```

**Resultado:**

**Wesley vê:**
- Transações: "Almoço R$ 100" (débito no cartão)
- Compartilhados: "Fran me deve R$ 50"

**Fran vê:**
- Transações: "Almoço R$ 50" (nota: "Paga por Wesley")
- Compartilhados: "Devo R$ 50 para Wesley"

---

### CENÁRIO 2: Uber Pago por Fran

**Situação:**
Wesley e Fran pegam Uber. Conta: R$ 40. Fran paga e divide 50/50.

**Fluxo:**
```
1. Wesley cria transação:
   - Valor: R$ 40
   - Descrição: "Uber"

2. Wesley clica "Dividir despesa"

3. No modal:
   - "Quem pagou?" → Outro Pagou
   - Seleciona: Fran
   - "Dividir com quem?" → (não seleciona ninguém, só registra que Fran pagou)

4. Wesley clica "Confirmar" e "Salvar"
```

**O que acontece:**

```sql
-- 1. Transação de Wesley (registra dívida)
INSERT INTO transactions (
  user_id: wesley_id,
  amount: 40,
  description: 'Uber',
  is_shared: TRUE,
  payer_id: fran_member_id  -- Fran pagou
)

-- 2. Ledger
INSERT INTO financial_ledger VALUES
  (wesley_id, 'DEBIT', 40)  -- Wesley deve para Fran
```

**Resultado:**

**Wesley vê:**
- Transações: "Uber R$ 40" (nota: "Pago por Fran")
- Compartilhados: "Devo R$ 40 para Fran"

**Fran vê:**
- Compartilhados: "Wesley me deve R$ 40"

---

### CENÁRIO 3: Compensação de Saldos

**Situação:**
- Wesley pagou almoço R$ 100 → Fran deve R$ 50
- Fran pagou Uber R$ 40 → Wesley deve R$ 40
- Saldo líquido: Fran deve R$ 10 para Wesley

**Cálculo automático:**

```sql
SELECT * FROM calculate_balance_between_users(
  wesley_id, 
  fran_id, 
  'BRL'
);

-- Resultado:
-- user1_owes: 40  (Wesley deve)
-- user2_owes: 50  (Fran deve)
-- net_balance: -10 (Fran deve 10 para Wesley)
```

**Na UI:**

**Wesley vê:**
```
Compartilhados > Fran
├─ Saldo: Fran me deve R$ 10
├─ Histórico:
│  ├─ Almoço R$ 100 (você pagou) → +R$ 50
│  └─ Uber R$ 40 (Fran pagou) → -R$ 40
└─ [Botão: Acertar Contas]
```

---

### CENÁRIO 4: Acertar Contas

**Situação:**
Fran paga os R$ 10 que deve para Wesley em dinheiro.

**Fluxo:**
```
1. Wesley acessa "Compartilhados" > Fran

2. Wesley clica "Acertar Contas"

3. Sistema pergunta:
   "Fran pagou os R$ 10?"
   [Sim, acertar] [Cancelar]

4. Wesley confirma
```

**O que acontece:**

```sql
-- Marcar todas as entradas como acertadas
UPDATE financial_ledger
SET is_settled = TRUE, settled_at = NOW()
WHERE (user_id = wesley_id AND related_user_id = fran_id)
   OR (user_id = fran_id AND related_user_id = wesley_id);

UPDATE transaction_splits
SET is_settled = TRUE, settled_at = NOW()
WHERE ...
```

**Resultado:**

**Wesley vê:**
```
Compartilhados > Fran
├─ Saldo: R$ 0 (quites!)
└─ Histórico:
   ├─ Almoço R$ 100 ✓ Acertado
   └─ Uber R$ 40 ✓ Acertado
```

---

### CENÁRIO 5: Viagem em Paris (EUR)

**Situação:**
Wesley e Fran viajam para Paris. Hotel: EUR 120. Wesley paga e divide 50/50.

**Fluxo:**
```
1. Wesley cria transação:
   - Valor: EUR 120
   - Descrição: "Hotel"
   - Viagem: "Paris 2025"  ← Seleciona viagem
   - Conta: Cartão Internacional (EUR)

2. Sistema automaticamente:
   - Filtra apenas contas em EUR
   - Define moeda como EUR

3. Wesley clica "Dividir despesa"
   - Seleciona Fran
   - 50/50

4. Salvar
```

**O que acontece:**

```sql
-- Transação em EUR
INSERT INTO transactions (
  user_id: wesley_id,
  amount: 120,
  currency: 'EUR',  ← Moeda da viagem
  trip_id: paris_trip_id,
  domain: 'TRAVEL'
)

-- Split em EUR
INSERT INTO transaction_splits (
  user_id: fran_id,
  amount: 60  ← EUR 60
)

-- Ledger em EUR
INSERT INTO financial_ledger (
  currency: 'EUR',
  amount: 60
)
```

**Resultado:**

**Wesley vê:**
```
Compartilhados > Viagens > Paris 2025
├─ Saldo: Fran me deve EUR 60
└─ Histórico:
   └─ Hotel EUR 120 (você pagou) → +EUR 60
```

**Importante:** Saldos em EUR são separados de saldos em BRL!

---

### CENÁRIO 6: Divisão Personalizada (70/30)

**Situação:**
Wesley e Fran jantam. Conta: R$ 150. Wesley comeu mais, divide 70/30.

**Fluxo:**
```
1. Wesley cria transação R$ 150

2. No modal de divisão:
   - Seleciona Fran
   - Clica "70/30" (preset)
   
3. Sistema calcula:
   - Wesley: 70% = R$ 105
   - Fran: 30% = R$ 45
```

**Resultado:**

**Wesley vê:**
- Compartilhados: "Fran me deve R$ 45"

**Fran vê:**
- Transações: "Jantar R$ 45"
- Compartilhados: "Devo R$ 45 para Wesley"

---

## 🔍 CONSULTAS ÚTEIS

### Ver todas as transações compartilhadas

```sql
SELECT * FROM shared_transactions_view
WHERE user_id = 'seu_user_id';
```

### Ver saldo com todos os membros

```typescript
const { data: balances } = useBalancesWithAllMembers();

balances?.forEach(({ member, balance }) => {
  console.log(`${member.name}: R$ ${balance.net_balance}`);
});
```

### Ver histórico com um membro

```typescript
const { data: transactions } = useSharedTransactionsWithMember(fran_id);

transactions?.forEach(tx => {
  console.log(`${tx.description}: R$ ${tx.amount}`);
});
```

### Calcular saldo específico

```typescript
const { data: balance } = useBalanceBetweenUsers(fran_id, 'BRL');

console.log(`Você deve: R$ ${balance.user1_owes}`);
console.log(`Eles devem: R$ ${balance.user2_owes}`);
console.log(`Saldo líquido: R$ ${balance.net_balance}`);
```

---

## 🎓 BOAS PRÁTICAS

### ✅ FAZER

1. **Sempre dividir explicitamente**
   - Marcar "Dividir despesa"
   - Selecionar membros
   - Confirmar divisão

2. **Acertar contas regularmente**
   - Evita saldos muito altos
   - Mantém relacionamento claro
   - Facilita controle

3. **Usar moeda correta em viagens**
   - Criar conta internacional
   - Vincular à viagem
   - Sistema filtra automaticamente

4. **Verificar saldos antes de acertar**
   - Ver histórico completo
   - Confirmar valores
   - Evitar erros

### ❌ NÃO FAZER

1. **Não criar transação compartilhada sem splits**
   - Sistema agora bloqueia
   - Dados ficariam inconsistentes

2. **Não editar transação compartilhada sem cuidado**
   - Afeta todos os membros
   - Recalcula splits automaticamente

3. **Não misturar moedas**
   - Saldos são separados por moeda
   - Não há conversão automática (ainda)

4. **Não deletar transação sem avisar membros**
   - Afeta saldos de todos
   - Pode causar confusão

---

## 🐛 TROUBLESHOOTING

### "Splits não aparecem no resumo"

**Causa:** Estado não atualizado  
**Solução:** Verificar console, procurar logs `🔵 [SplitModal]`

### "Membro não vê débito"

**Causa:** Espelhamento não funcionou  
**Solução:** Verificar se migration foi aplicada

### "Saldo está errado"

**Causa:** Transações antigas sem splits  
**Solução:** Executar script de correção de dados

### "Não consigo acertar contas"

**Causa:** Função não existe  
**Solução:** Aplicar migration do ledger

---

**Exemplos práticos completos. Sistema pronto para uso!**

