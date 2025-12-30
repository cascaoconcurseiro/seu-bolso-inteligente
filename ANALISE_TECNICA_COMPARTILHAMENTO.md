# 🔬 ANÁLISE TÉCNICA DETALHADA: SISTEMA DE COMPARTILHAMENTO

**Data:** 30/12/2024  
**Foco:** Código, fluxos de dados e integrações

---

## 1. ANÁLISE DE CÓDIGO

### 1.1 SplitModal.tsx - Modal de Divisão

**Localização:** `src/components/transactions/SplitModal.tsx`

**Função:** Permite usuário selecionar membros e definir divisão de despesa.

**Estado Interno:**
```typescript
// Props recebidas
splits: TransactionSplitData[]  // Array de splits
setSplits: (splits: TransactionSplitData[]) => void  // Setter
```

**Fluxo de Dados:**
```
Usuário clica em membro
   ↓
toggleSplitMember(memberId)
   ↓
Adiciona/remove membro do array splits
   ↓
Redistribui percentagens automaticamente
   ↓
Chama setSplits(newSplits)
   ↓
❓ Estado é atualizado no componente pai?
```

**Logs Adicionados:**
```typescript
console.log('🔵 [SplitModal] toggleSplitMember chamado:', { memberId });
console.log('🔵 [SplitModal] Splits redistribuídos:', newSplits);
console.log('🔵 [SplitModal] Chamando setSplits com:', newSplits);
```

**Problema Identificado:**
O modal chama `setSplits` mas não há garantia de que o estado é persistido quando modal fecha.

**Solução Proposta:**
```typescript
// Adicionar callback onConfirm que passa splits
const handleConfirm = () => {
  console.log('🔵 [SplitModal] Confirmando com splits:', splits);
  onConfirm(splits);  // Passar splits explicitamente
  onClose();
};
```

---

### 1.2 TransactionForm.tsx - Formulário de Transação

**Localização:** `src/components/transactions/TransactionForm.tsx`

**Estado de Splits:**
```typescript
const [splits, setSplits] = useState<TransactionSplit[]>([]);
```

**Problema:**
Quando `SplitModal` fecha, o estado `splits` pode não estar atualizado.

**Logs Adicionados:**
```typescript
console.log('🟢 [TransactionForm] handleSubmit - splits:', splits);
```

**Solução Proposta:**
```typescript
// No handleSubmit, verificar se splits está vazio
if (isShared && splits.length === 0) {
  toast.error("Selecione pelo menos um membro para dividir");
  return;
}
```

---

### 1.3 useTransactions.ts - Hook de Transações

**Localização:** `src/hooks/useTransactions.ts`

**Função `useCreateTransaction`:**
```typescript
mutationFn: async (input: CreateTransactionInput) => {
  const { splits, ...transactionData } = input;
  
  // Cria transação
  const { data } = await supabase
    .from("transactions")
    .insert(transactionData)
    .select()
    .single();
  
  // Se tem splits, criar
  if (splits && splits.length > 0) {
    // Buscar user_ids dos membros
    const { data: membersData } = await supabase
      .from("family_members")
      .select("id, name, linked_user_id")
      .in("id", splits.map(s => s.member_id));
    
    // Criar splits
    const splitsToInsert = splits.map(split => ({
      transaction_id: data.id,
      member_id: split.member_id,
      user_id: memberUserIds[split.member_id],  // ✅ Preenchido
      percentage: split.percentage,
      amount: split.amount,
      name: memberNames[split.member_id],
      is_settled: false,
    }));
    
    await supabase
      .from("transaction_splits")
      .insert(splitsToInsert);
  } else {
    console.warn('⚠️ Nenhum split para criar. Splits recebidos:', splits);
  }
}
```

**Problema:**
Log mostra que `splits` chega vazio.

**Causa Raiz:**
Estado `splits` no `TransactionForm` não está sendo atualizado quando `SplitModal` confirma.

---

### 1.4 useSharedFinances.ts - Hook de Finanças Compartilhadas

**Localização:** `src/hooks/useSharedFinances.ts`

**Função:** Busca transações compartilhadas e calcula saldos.

**Queries:**
1. `shared-transactions-with-splits` - Transações que EU criei e dividi
2. `mirror-transactions` - Transações espelhadas (eu devo)
3. `paid-by-others-transactions` - Transações onde outro pagou por mim

**Lógica de Invoices:**
```typescript
// CASE 1: I PAID - Process transaction splits (CREDITS)
transactionsWithSplits.forEach(tx => {
  splits.forEach(split => {
    invoiceMap[memberId].push({
      type: 'CREDIT',  // Alguém me deve
      amount: split.amount,
      // ...
    });
  });
});

// CASE 2: SOMEONE ELSE PAID - Process mirror transactions (DEBITS)
mirrorTransactions.forEach(tx => {
  invoiceMap[memberId].push({
    type: 'DEBIT',  // Eu devo
    amount: tx.amount,
    // ...
  });
});
```

**Problema:**
`mirrorTransactions` está vazio porque espelhamento não está implementado.

---

## 2. FLUXO DE DADOS COMPLETO

### 2.1 Criar Transação Compartilhada

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO PREENCHE FORMULÁRIO                              │
│    - Valor: R$ 100                                          │
│    - Descrição: "Almoço"                                    │
│    - Marca "Compartilhar"                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ABRE SPLITMODAL                                          │
│    - Mostra lista de membros                                │
│    - Usuário seleciona "Fran"                               │
│    - Define divisão 50/50                                   │
│    - splits = [{ memberId: 'fran_id', percentage: 50, ... }]│
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. USUÁRIO CLICA "CONFIRMAR"                                │
│    - SplitModal.onConfirm() é chamado                       │
│    - ❌ PROBLEMA: splits não são passados para o form       │
│    - Modal fecha                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FORM SUBMETE                                             │
│    - handleSubmit() é chamado                               │
│    - splits = [] (VAZIO!)                                   │
│    - Chama useCreateTransaction({ splits: [] })             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. HOOK CRIA TRANSAÇÃO                                      │
│    - INSERT INTO transactions (is_shared=true)              │
│    - Verifica splits.length > 0 → FALSE                     │
│    - ❌ NÃO cria transaction_splits                         │
│    - Log: "⚠️ Nenhum split para criar"                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. RESULTADO                                                │
│    - Transação criada com is_shared=true                    │
│    - Mas sem splits                                         │
│    - ❌ Não aparece em Compartilhados                       │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Fluxo Esperado (Correto)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO PREENCHE FORMULÁRIO                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ABRE SPLITMODAL                                          │
│    - Usuário seleciona membros                              │
│    - Define divisão                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONFIRMA MODAL                                           │
│    - ✅ onConfirm(splits) passa splits para form            │
│    - ✅ setSplits(splits) atualiza estado                   │
│    - Modal fecha                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. FORM SUBMETE                                             │
│    - ✅ splits = [{ memberId, percentage, amount }]         │
│    - ✅ Validação: splits.length > 0                        │
│    - Chama useCreateTransaction({ splits })                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. HOOK CRIA TRANSAÇÃO                                      │
│    - INSERT INTO transactions (is_shared=true)              │
│    - ✅ Busca user_ids dos membros                          │
│    - ✅ INSERT INTO transaction_splits                      │
│    - ✅ Trigger preenche user_id automaticamente            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. ESPELHAMENTO (FALTA IMPLEMENTAR)                         │
│    - ✅ Trigger detecta novos splits                        │
│    - ✅ Para cada split, cria transação espelhada           │
│    - ✅ Transação espelhada tem source_transaction_id       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RESULTADO                                                │
│    - ✅ Transação criada com splits                         │
│    - ✅ Transações espelhadas criadas                       │
│    - ✅ Aparece em Compartilhados para ambos                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ANÁLISE DE BANCO DE DADOS

### 3.1 Estrutura de Tabelas

**transactions:**
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,           -- Dono da transação
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  competence_date DATE NOT NULL,
  type transaction_type NOT NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  payer_id UUID,                    -- Quem pagou (member_id)
  source_transaction_id UUID,       -- Transação original (se espelhada)
  trip_id UUID,
  domain transaction_domain,
  -- ...
);
```

**transaction_splits:**
```sql
CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,
  member_id UUID NOT NULL,          -- family_members.id
  user_id UUID,                     -- profiles.id (preenchido por trigger)
  name TEXT,
  percentage NUMERIC,
  amount NUMERIC NOT NULL,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ,
  settled_transaction_id UUID,
  -- ...
);
```

**Triggers:**
```sql
-- Preenche user_id automaticamente
CREATE TRIGGER trg_fill_split_user_id
BEFORE INSERT OR UPDATE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION fill_transaction_split_user_id();
```

---

### 3.2 Queries Críticas

**Buscar transações compartilhadas:**
```sql
SELECT t.*, ts.*
FROM transactions t
LEFT JOIN transaction_splits ts ON ts.transaction_id = t.id
WHERE t.user_id = 'USER_ID'
  AND t.is_shared = true
  AND t.source_transaction_id IS NULL;
```

**Buscar transações espelhadas (débitos):**
```sql
SELECT t.*
FROM transactions t
WHERE t.user_id = 'USER_ID'
  AND t.is_shared = true
  AND t.source_transaction_id IS NOT NULL;
```

**Calcular saldo com membro:**
```sql
-- O que membro me deve (CREDITS)
SELECT COALESCE(SUM(ts.amount), 0) AS credits
FROM transaction_splits ts
JOIN transactions t ON t.id = ts.transaction_id
WHERE t.user_id = 'MY_USER_ID'
  AND ts.member_id = 'MEMBER_ID'
  AND ts.is_settled = false;

-- O que eu devo para membro (DEBITS)
SELECT COALESCE(SUM(t.amount), 0) AS debits
FROM transactions t
WHERE t.user_id = 'MY_USER_ID'
  AND t.source_transaction_id IN (
    SELECT id FROM transactions WHERE user_id = 'MEMBER_USER_ID'
  )
  AND t.is_settled = false;
```

---

## 4. ANÁLISE DE VIAGENS COMPARTILHADAS

### 4.1 Estrutura

**trips:**
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  currency TEXT DEFAULT 'BRL',
  -- ...
);
```

**trip_members:**
```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT,
  can_edit_details BOOLEAN,
  can_manage_expenses BOOLEAN,
  -- ...
);
```

**trip_invitations:**
```sql
CREATE TABLE trip_invitations (
  id UUID PRIMARY KEY,
  trip_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  message TEXT,
  -- ...
);
```

---

### 4.2 Fluxo de Convite

```
1. Wesley cria viagem
   ↓
   INSERT INTO trips (owner_id = wesley_id)
   ↓
   Trigger: INSERT INTO trip_members (user_id = wesley_id, role = 'owner')

2. Wesley convida Fran
   ↓
   INSERT INTO trip_invitations (inviter_id = wesley_id, invitee_id = fran_id)
   ↓
   Trigger: INSERT INTO notifications (user_id = fran_id, type = 'TRIP_INVITE')

3. Fran vê notificação
   ↓
   ❌ PROBLEMA: Componente não renderiza
   ↓
   Hook usePendingTripInvitations não retorna dados?

4. Fran aceita convite
   ↓
   UPDATE trip_invitations SET status = 'accepted'
   ↓
   Trigger: INSERT INTO trip_members (user_id = fran_id)
   ↓
   Trigger: UPDATE notifications SET is_read = true

5. Fran vê viagem
   ↓
   SELECT trips WHERE id IN (SELECT trip_id FROM trip_members WHERE user_id = fran_id)
```

---

## 5. PROBLEMAS TÉCNICOS DETALHADOS

### 5.1 Estado React Não Persiste

**Problema:**
```typescript
// SplitModal.tsx
const toggleSplitMember = (memberId: string) => {
  let newSplits = [...splits];
  // ... modifica newSplits
  setSplits(newSplits);  // ✅ Chama setter
};

// Mas quando modal fecha...
const handleConfirm = () => {
  onConfirm();  // ❌ Não passa splits!
  onClose();
};
```

**Solução:**
```typescript
const handleConfirm = () => {
  onConfirm(splits);  // ✅ Passa splits explicitamente
  onClose();
};
```

---

### 5.2 Validação Ausente

**Problema:**
```typescript
// useTransactions.ts
if (splits && splits.length > 0) {
  // Cria splits
} else {
  console.warn('⚠️ Nenhum split');  // ❌ Apenas log
}
```

**Solução:**
```typescript
if (input.is_shared && (!splits || splits.length === 0)) {
  throw new Error("Transação compartilhada deve ter splits");
}
```

---

### 5.3 Espelhamento Não Implementado

**Problema:**
Não há trigger ou código que crie transações espelhadas.

**Solução (Trigger):**
```sql
CREATE OR REPLACE FUNCTION create_mirror_transactions()
RETURNS TRIGGER AS $
DECLARE
  split_record RECORD;
BEGIN
  -- Para cada split da transação
  FOR split_record IN 
    SELECT * FROM transaction_splits 
    WHERE transaction_id = NEW.id
  LOOP
    -- Criar transação espelhada
    INSERT INTO transactions (
      user_id,
      amount,
      description,
      date,
      competence_date,
      type,
      domain,
      is_shared,
      source_transaction_id,
      trip_id,
      currency
    ) VALUES (
      split_record.user_id,
      split_record.amount,
      NEW.description,
      NEW.date,
      NEW.competence_date,
      'EXPENSE',
      NEW.domain,
      true,
      NEW.id,
      NEW.trip_id,
      NEW.currency
    );
  END LOOP;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_mirror_transactions
AFTER INSERT ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION create_mirror_transactions();
```

---

## 6. RECOMENDAÇÕES TÉCNICAS

### 6.1 Refatoração de Estado

**Problema:** Estado `splits` é gerenciado em múltiplos lugares.

**Solução:** Usar Context API ou Zustand para estado global.

```typescript
// SplitsContext.tsx
const SplitsContext = createContext();

export function SplitsProvider({ children }) {
  const [splits, setSplits] = useState([]);
  return (
    <SplitsContext.Provider value={{ splits, setSplits }}>
      {children}
    </SplitsContext.Provider>
  );
}

export function useSplits() {
  return useContext(SplitsContext);
}
```

---

### 6.2 Validação em Múltiplas Camadas

1. **Frontend:** Validar antes de submeter
2. **Hook:** Validar antes de inserir
3. **Banco:** Constraint CHECK

```sql
ALTER TABLE transactions
ADD CONSTRAINT check_shared_has_splits
CHECK (
  NOT is_shared OR 
  EXISTS (
    SELECT 1 FROM transaction_splits 
    WHERE transaction_id = id
  )
);
```

---

### 6.3 Testes Automatizados

```typescript
describe('Transação Compartilhada', () => {
  it('deve criar splits ao marcar como compartilhada', async () => {
    const tx = await createTransaction({
      amount: 100,
      is_shared: true,
      splits: [{ memberId: 'fran_id', percentage: 50, amount: 50 }]
    });
    
    const splits = await getSplits(tx.id);
    expect(splits).toHaveLength(1);
    expect(splits[0].amount).toBe(50);
  });
  
  it('deve criar transação espelhada', async () => {
    const tx = await createTransaction({
      amount: 100,
      is_shared: true,
      splits: [{ memberId: 'fran_id', percentage: 50, amount: 50 }]
    });
    
    const mirrors = await getMirrorTransactions('fran_user_id');
    expect(mirrors).toHaveLength(1);
    expect(mirrors[0].source_transaction_id).toBe(tx.id);
  });
});
```

---

**Análise realizada por:** Kiro AI  
**Data:** 30/12/2024  
**Versão:** 1.0
