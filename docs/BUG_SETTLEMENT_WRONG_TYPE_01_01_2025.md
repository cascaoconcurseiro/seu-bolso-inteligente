# BUG: Settlement com Tipo Incorreto (RECEIVE ao invés de PAY)
**Data**: 01/01/2025  
**Status**: 🔍 Investigando

## 🎯 Problema Relatado

Quando Fran tenta marcar um pagamento de acerto com Wesley:
1. Wesley criou despesa compartilhada de $10
2. Fran deve $5 (sua parte)
3. Fran clica para marcar como pago
4. ❌ Sistema mostra "RECEBER" (verde, +$5.00)
5. ✅ Deveria mostrar "PAGAR" (vermelho, -$5.00)

## 📸 Evidências

- **Card de Últimas Transações**: Mostra "Recebimento Acerto - Wesley" em verde (+$5.00)
- **Extrato da Conta**: Transação não aparece (problema secundário)
- **Saldo**: $995 (correto seria $995 após pagar $5)

## 🔍 Análise

### Fluxo Esperado
1. Wesley cria despesa compartilhada de $10
2. Sistema cria split para Fran de $5
3. Fran vê item como **DEBIT** (ela deve)
4. Botão mostra "PAGAR"
5. Ao confirmar, cria transação **EXPENSE** de $5

### Fluxo Atual (Bugado)
1. Wesley cria despesa compartilhada de $10
2. Sistema cria split para Fran de $5
3. ❌ Fran vê item como **CREDIT** (ela receberá)
4. ❌ Botão mostra "RECEBER"
5. ❌ Ao confirmar, cria transação **INCOME** de $5

## 🐛 Causa Raiz Suspeita

No `useSharedFinances.ts`, a lógica de determinação de CREDIT vs DEBIT pode estar invertida:

```typescript
// CASO 1A: EU PAGUEI - Créditos (me devem)
if (tx.user_id === user?.id) {
  splits.forEach((split: any) => {
    // Cria CREDIT para cada membro
    invoiceMap[memberId].push({
      type: 'CREDIT', // ✓ Correto
      ...
    });
  });
}

// CASO 1B: OUTRO PAGOU - Débitos (eu devo)
else {
  const mySplit = splits.find((s: any) => s.user_id === user?.id);
  if (mySplit) {
    // Cria DEBIT para mim
    invoiceMap[creatorMember.id].push({
      type: 'DEBIT', // ❓ Verificar se está correto
      ...
    });
  }
}
```

### Possíveis Problemas

1. **Mapeamento de Membros**: `creatorMember` pode estar errado
2. **user_id vs member_id**: Confusão entre IDs de usuário e membros
3. **Lógica Invertida**: CREDIT e DEBIT podem estar trocados

## 🔧 Próximos Passos

1. ✅ Commit das mudanças de UI (trip summary)
2. 🔍 Debugar `useSharedFinances` com console.logs
3. 🔍 Verificar se splits estão sendo criados corretamente
4. 🔍 Verificar mapeamento de user_id para member_id
5. 🛠️ Corrigir lógica de CREDIT/DEBIT
6. ✅ Testar cenário completo

## 📝 Notas

- O código de criação do settlement está correto (PAY → EXPENSE, RECEIVE → INCOME)
- O problema está na classificação do item ANTES de abrir o dialog
- Isso afeta qual botão é mostrado e qual tipo de transação é criada

---

**Investigação em andamento...**
