# Melhoria: Settlements com Transações Individuais
**Data**: 01/01/2025  
**Status**: ✅ Implementado

## 🎯 Problema Anterior

Quando um usuário marcava múltiplos itens como pagos, o sistema criava UMA transação consolidada:

### Exemplo do Problema
1. Wesley paga 3 despesas:
   - Restaurante: $10 (Fran deve $5)
   - Uber: $20 (Fran deve $10)
   - Hotel: $100 (Fran deve $50)

2. Fran marca tudo como pago → Sistema cria:
   - ❌ "Acerto - Wesley" de $65

3. **Problemas**:
   - ❌ Perde contexto das transações originais
   - ❌ Relatórios por categoria ficam incorretos
   - ❌ Se desfizer o acerto, fica transação órfã "Acerto - Wesley"
   - ❌ Inconsistência contábil

## ✅ Solução Implementada

Agora o sistema cria transações INDIVIDUAIS mantendo descrição e categoria originais:

### Exemplo da Solução
1. Wesley paga 3 despesas:
   - Restaurante: $10 (Fran deve $5)
   - Uber: $20 (Fran deve $10)
   - Hotel: $100 (Fran deve $50)

2. Fran marca tudo como pago → Sistema cria:
   - ✅ "Restaurante" de $5 (categoria: Alimentação)
   - ✅ "Uber" de $10 (categoria: Transporte)
   - ✅ "Hotel" de $50 (categoria: Hospedagem)

3. **Benefícios**:
   - ✅ Mantém contexto das transações originais
   - ✅ Relatórios por categoria corretos
   - ✅ Se desfizer, não há inconsistência
   - ✅ Integridade contábil preservada
   - ✅ Campo `notes` guarda contexto do acerto

## 🔧 Implementação Técnica

### Antes (Consolidado)
```typescript
// Criar UMA transação consolidada
const result = await createTransaction.mutateAsync({
  amount: totalAmount, // $65
  description: "Acerto - Wesley",
  category_id: acertoFinanceiroId,
  // ...
});
```

### Depois (Individual)
```typescript
// Buscar transações originais
const { data: originalTransactions } = await supabase
  .from('transactions')
  .select('id, description, category_id, category:categories(*)')
  .in('id', originalTxIds);

// Criar transação para CADA item
for (const item of itemsToSettle) {
  const originalTx = originalTxMap.get(item.originalTxId);
  
  await createTransaction.mutateAsync({
    amount: item.amount, // $5, $10, $50
    description: originalTx.description, // "Restaurante", "Uber", "Hotel"
    category_id: originalTx.category_id, // Categoria original
    notes: `Acerto de: ${description} (${memberName})`,
    // ...
  });
}
```

## 📊 Comparação

### Cenário: Fran paga 3 itens para Wesley

| Aspecto | Antes (Consolidado) | Depois (Individual) |
|---------|---------------------|---------------------|
| **Transações Criadas** | 1 | 3 |
| **Descrição** | "Acerto - Wesley" | "Restaurante", "Uber", "Hotel" |
| **Categoria** | "Acerto Financeiro" | Categorias originais |
| **Relatório por Categoria** | ❌ Tudo em "Acerto" | ✅ Distribuído corretamente |
| **Contexto** | ❌ Perdido | ✅ Preservado |
| **Desfazer** | ❌ Inconsistência | ✅ Sem problemas |
| **Rastreabilidade** | ❌ Difícil | ✅ Fácil (campo notes) |

## 🎯 Casos de Uso

### Caso 1: Pagamento Individual
**Cenário**: Fran marca 1 item como pago
- Wesley pagou "Restaurante" de $10
- Fran deve $5

**Resultado**:
- Cria 1 transação: "Restaurante" de $5
- Categoria: Alimentação
- Notes: "Acerto de: Restaurante (Wesley)"

### Caso 2: Pagamento Múltiplo
**Cenário**: Fran marca 5 itens como pagos
- 5 despesas diferentes com categorias diferentes

**Resultado**:
- Cria 5 transações individuais
- Cada uma com descrição e categoria original
- Todas com notes indicando o acerto

### Caso 3: Desfazer Acerto
**Cenário**: Fran desfaz um acerto

**Antes**:
- Excluía "Acerto - Wesley" de $65
- ❌ Perdia contexto de quais despesas eram

**Depois**:
- Exclui transações individuais
- ✅ Mantém rastreabilidade via notes
- ✅ Sem inconsistência contábil

## 📝 Campos da Transação de Settlement

```typescript
{
  amount: item.amount,              // Valor do split
  description: originalDescription,  // Descrição original
  date: today,                      // Data do acerto
  type: "EXPENSE" ou "INCOME",      // Tipo baseado em PAY/RECEIVE
  account_id: selectedAccountId,    // Conta selecionada
  category_id: originalCategoryId,  // Categoria original
  domain: "SHARED",                 // Domínio compartilhado
  is_shared: false,                 // Não é compartilhada
  related_member_id: memberId,      // Membro relacionado
  notes: "Acerto de: [desc] ([name])" // Contexto do acerto
}
```

## 🔍 Rastreabilidade

O campo `notes` permite rastrear:
- Qual era a transação original
- Com quem foi o acerto
- Contexto completo

**Exemplo de notes**:
```
"Acerto de: Restaurante Italiano (Wesley)"
"Acerto de: Uber para aeroporto (Fran)"
"Acerto de: Hotel Copacabana (Orlando)"
```

## ✅ Benefícios

1. **Integridade Contábil**: Sem transações órfãs
2. **Relatórios Corretos**: Categorias preservadas
3. **Contexto Preservado**: Descrições originais mantidas
4. **Rastreabilidade**: Campo notes com contexto completo
5. **Reversibilidade**: Desfazer sem inconsistências
6. **Transparência**: Usuário vê exatamente o que pagou

## 🧪 Testes Necessários

- [ ] Marcar 1 item como pago → Cria 1 transação individual
- [ ] Marcar 5 itens como pagos → Cria 5 transações individuais
- [ ] Verificar descrições originais preservadas
- [ ] Verificar categorias originais preservadas
- [ ] Verificar campo notes com contexto
- [ ] Desfazer acerto → Transações excluídas corretamente
- [ ] Relatórios por categoria → Valores corretos

---

**Implementação completa e pronta para testes!**
