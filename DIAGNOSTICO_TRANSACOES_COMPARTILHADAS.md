# Diagnóstico: Transações Compartilhadas Não Aparecem

**Data:** 30/12/2024  
**Problema:** Transações compartilhadas não aparecem no espelhamento e na página Compartilhados

---

## 🔍 PROBLEMA IDENTIFICADO

### 1. Transação Compartilhada Sem Splits

**Transação encontrada:**
- ID: `26e4e80d-6f81-4794-8c44-d5f9f7c7a1fd`
- Descrição: "uber"
- Valor: R$ 100,00
- Criador: Fran (`9545d0c1-94be-4b69-b110-f939bce072ee`)
- `is_shared`: TRUE
- **Problema:** `num_splits = 0` (nenhum split criado!)

### 2. Campo `user_id` Não Preenchido em `transaction_splits`

A tabela `transaction_splits` tem DOIS campos para identificar o usuário:
- `member_id` → FK para `family_members.id`
- `user_id` → FK para `profiles.id`

**Problema:** O código está inserindo apenas `member_id`, mas NÃO está preenchendo `user_id`.

**Código atual (useTransactions.ts):**
```typescript
const splitsToInsert = splits.map(split => ({
  transaction_id: data.id,
  member_id: split.member_id,  // ✅ Preenchido
  percentage: split.percentage,
  amount: split.amount,
  name: memberNames[split.member_id] || "Membro",
  is_settled: false,
  // ❌ user_id NÃO está sendo preenchido!
}));
```

### 3. Relação entre `member_id` e `user_id`

**Estrutura:**
```
family_members
├─ id (member_id) → UUID do registro de membro
└─ linked_user_id → UUID do usuário (profiles.id)

transaction_splits
├─ member_id → family_members.id
└─ user_id → profiles.id (deveria ser = family_members.linked_user_id)
```

**Exemplo:**
- Fran como membro: `member_id = 5c4a4fb5-ccc9-440f-912e-9e81731aa7ab`
- Fran como usuário: `user_id = 9545d0c1-94be-4b69-b110-f939bce072ee`

---

## 🐛 CAUSAS DO PROBLEMA

### Causa 1: Splits Não Criados
Quando Fran criou a transação "uber" e marcou como compartilhada, os splits não foram inseridos no banco.

**Possíveis razões:**
1. Erro silencioso no frontend (não mostrou erro)
2. Validação falhou mas não bloqueou o submit
3. Fran não selecionou nenhum membro para dividir

### Causa 2: Campo `user_id` Não Preenchido
Mesmo quando splits são criados, o campo `user_id` fica NULL porque o código não o preenche.

**Impacto:**
- Queries que filtram por `user_id` não encontram os splits
- Sistema de espelhamento pode não funcionar corretamente
- Página Compartilhados não mostra as transações

---

## ✅ SOLUÇÃO

### Solução 1: Preencher `user_id` ao Criar Splits

**Modificar `useTransactions.ts`:**

```typescript
// Buscar nomes E user_ids dos membros
const { data: membersData } = await supabase
  .from("family_members")
  .select("id, name, linked_user_id")  // ✅ Adicionar linked_user_id
  .in("id", splits.map(s => s.member_id));

const memberNames: Record<string, string> = {};
const memberUserIds: Record<string, string> = {};  // ✅ Novo mapa
membersData?.forEach(m => {
  memberNames[m.id] = m.name;
  memberUserIds[m.id] = m.linked_user_id;  // ✅ Mapear user_id
});

const splitsToInsert = splits.map(split => ({
  transaction_id: data.id,
  member_id: split.member_id,
  user_id: memberUserIds[split.member_id],  // ✅ Preencher user_id
  percentage: split.percentage,
  amount: split.amount,
  name: memberNames[split.member_id] || "Membro",
  is_settled: false,
}));
```

### Solução 2: Criar Trigger para Preencher Automaticamente

**Alternativa:** Criar trigger no banco que preenche `user_id` automaticamente:

```sql
CREATE OR REPLACE FUNCTION fill_transaction_split_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi preenchido mas member_id foi
  IF NEW.user_id IS NULL AND NEW.member_id IS NOT NULL THEN
    -- Buscar linked_user_id do membro
    SELECT linked_user_id INTO NEW.user_id
    FROM family_members
    WHERE id = NEW.member_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fill_split_user_id
BEFORE INSERT OR UPDATE ON transaction_splits
FOR EACH ROW
EXECUTE FUNCTION fill_transaction_split_user_id();
```

### Solução 3: Corrigir Dados Existentes

**Atualizar splits existentes que não têm `user_id`:**

```sql
UPDATE transaction_splits ts
SET user_id = fm.linked_user_id
FROM family_members fm
WHERE ts.member_id = fm.id
  AND ts.user_id IS NULL;
```

---

## 🔧 IMPLEMENTAÇÃO RECOMENDADA

### Passo 1: Criar Trigger (Solução Permanente)
✅ Garante que `user_id` sempre será preenchido
✅ Funciona para código antigo e novo
✅ Previne problemas futuros

### Passo 2: Atualizar Código Frontend (Melhoria)
✅ Torna o código mais explícito
✅ Não depende apenas do trigger
✅ Melhor para debugging

### Passo 3: Corrigir Dados Existentes
✅ Resolve transações antigas
✅ Garante consistência

### Passo 4: Investigar Por Que Splits Não Foram Criados
⚠️ Verificar se há validação no frontend que está falhando
⚠️ Adicionar logs para detectar quando splits não são criados
⚠️ Melhorar feedback visual quando divisão não é configurada

---

## 📊 IMPACTO

### Transações Afetadas
- 1 transação compartilhada sem splits
- Possíveis outras transações com `user_id` NULL

### Funcionalidades Afetadas
- ❌ Página Compartilhados não mostra transações
- ❌ Espelhamento não funciona
- ❌ Cálculo de saldo entre membros incorreto
- ❌ Notificações de compartilhamento não enviadas

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar trigger para preencher `user_id` automaticamente
2. ✅ Atualizar código frontend para preencher `user_id`
3. ✅ Corrigir dados existentes (UPDATE)
4. ⏭️ Testar criação de nova transação compartilhada
5. ⏭️ Verificar se espelhamento funciona
6. ⏭️ Testar página Compartilhados
7. ⏭️ Investigar por que transação "uber" não tem splits

---

## 📝 NOTAS TÉCNICAS

### Estrutura de Dados

**Transação Compartilhada Completa:**
```
transactions
├─ id: uuid
├─ user_id: uuid (criador)
├─ is_shared: true
├─ payer_id: uuid (quem pagou - member_id)
└─ domain: "SHARED" ou "TRAVEL"

transaction_splits (para cada participante)
├─ transaction_id: uuid
├─ member_id: uuid (family_members.id)
├─ user_id: uuid (profiles.id) ← DEVE SER PREENCHIDO!
├─ amount: numeric
├─ percentage: numeric
└─ is_settled: boolean
```

### Queries Afetadas

**Query que NÃO funciona sem `user_id`:**
```sql
SELECT * FROM transaction_splits
WHERE user_id = 'fran_user_id';  -- ❌ Retorna vazio se user_id é NULL
```

**Query que funciona mas é menos eficiente:**
```sql
SELECT ts.* FROM transaction_splits ts
JOIN family_members fm ON fm.id = ts.member_id
WHERE fm.linked_user_id = 'fran_user_id';  -- ✅ Funciona mas precisa de JOIN
```

---

**Conclusão:** O problema é duplo:
1. Splits não estão sendo criados em algumas transações
2. Quando criados, o campo `user_id` não é preenchido

**Solução:** Implementar trigger + atualizar código + corrigir dados existentes.
