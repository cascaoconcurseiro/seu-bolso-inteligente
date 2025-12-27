# Debug: useSharedFinances para Fran

## Dados da Fran

**user.id**: `9545d0c1-94be-4b69-b110-f939bce072ee`

## Membros que a Fran vê

| id | name | user_id | linked_user_id |
|----|------|---------|----------------|
| edd458ee... | Wesley | **Fran** | Wesley |

## Transações Originais (transactionsWithSplits)

### 1. "sexo" (R$ 66)
- **user_id**: Fran
- **splits**: 
  - member_id: edd458ee... (Wesley)
  - amount: R$ 33

**Processamento CASE 1 (I PAID - CREDITS)**:
```typescript
splits.forEach((split) => {
  const memberId = split.member_id; // edd458ee... (Wesley)
  const member = members.find(m => m.id === memberId); // ✅ Encontra "Wesley"
  
  invoiceMap[memberId].push({
    type: 'CREDIT',  // Fran pagou, Wesley deve
    amount: 33,
    memberId: edd458ee...,
    memberName: "Wesley"
  });
});
```

**Resultado**: Fran vê que Wesley deve R$ 33 ✅

## Transações Espelho (mirrorTransactions)

### 1. "Almoço Compartilhado" (R$ 50)
- **user_id**: Fran
- **source_transaction.user_id**: Wesley (56ccd60b...)

**Processamento CASE 2 (SOMEONE ELSE PAID - DEBITS)**:
```typescript
const payerUserId = tx.source_transaction?.user_id; // Wesley (56ccd60b...)

const payerMember = members.find(m => 
  m.user_id === payerUserId ||        // Fran === Wesley? ❌
  m.linked_user_id === payerUserId    // Wesley === Wesley? ✅
);
```

**Resultado**: Encontra o membro "Wesley" ✅

```typescript
const targetMemberId = payerMember.id; // edd458ee...

invoiceMap[targetMemberId].push({
  type: 'DEBIT',  // Wesley pagou, Fran deve
  amount: 50,
  memberId: edd458ee...,
  memberName: "Wesley"
});
```

**Resultado**: Fran vê que deve R$ 50 para Wesley ✅

## Conclusão

A lógica está **CORRETA**! A Fran deveria ver:

### Membro "Wesley"
- **CREDIT**: R$ 33 (ele deve a ela - transação "sexo")
- **DEBIT**: R$ 50 (ela deve a ele - "Almoço Compartilhado")
- **DEBIT**: R$ 39 (ela deve a ele - "testar")
- **DEBIT**: R$ 25 (ela deve a ele - "teste compartilhado")

**Saldo**: -R$ 81 (ela deve R$ 81 para ele)

## 🚨 Problema Possível

O front pode estar com **cache** ou a Fran não recarregou a página após as correções!

**Solução**: Pedir para a Fran fazer **HARD REFRESH**:
- Windows: `Ctrl + Shift + R` ou `Ctrl + F5`
- Mac: `Cmd + Shift + R`
