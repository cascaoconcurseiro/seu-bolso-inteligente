# Correção: Extrato de Contas - Lógica Correta
**Data**: 01/01/2026  
**Status**: ✅ CORRIGIDO

## 🐛 Problema Identificado

O extrato das contas não estava mostrando as transações corretas. Era necessário implementar a lógica correta de exibição.

### Exemplo do Problema
Conta: **Nubank - Conta Corrente (BRL)** da Fran
- Saldo: R$ 450,00
- Extrato: **Vazio** ❌
- Esperado: Mostrar apenas transações que realmente afetaram o saldo

## 📋 Regras de Negócio Corretas

### O que DEVE aparecer no extrato:

1. **Transações Individuais** (is_shared = false)
   - ✅ Despesas pessoais
   - ✅ Receitas
   - ✅ Transferências
   - Aparecem normalmente com o valor total

2. **Transações Compartilhadas - EU SOU O PAGADOR**
   - ✅ Quando `creator_user_id` = meu ID
   - ✅ Quando `account_id` está preenchido (eu paguei)
   - ✅ Aparece o valor TOTAL (porque eu paguei tudo)
   - Exemplo: Wesley cria "mercado R$ 1.000" → Aparece R$ 1.000 no extrato do Wesley

3. **Transações de Acerto (Settlements)**
   - ✅ Sempre aparecem (são transações individuais)
   - ✅ Tipo: "Pagamento Acerto - [Nome]" ou "Recebimento Acerto - [Nome]"
   - Exemplo: "Pagamento Acerto - Wesley R$ 500"

4. **Transferências de Entrada**
   - ✅ Onde `destination_account_id` = conta atual

### O que NÃO deve aparecer:

- ❌ **Transações compartilhadas onde OUTRO é o pagador**
  - Não aparece no meu extrato até eu acertar
  - Exemplo: Wesley cria "mercado R$ 1.000" → NÃO aparece no extrato da Fran
  - Quando Fran acertar → Aparece "Pagamento Acerto - Wesley R$ 500"

- ❌ Transações espelhadas (mirrors) sem `account_id`
  - São apenas registros contábeis no ledger
  - Não representam movimentação real na conta

- ❌ Transações de outros usuários
- ❌ Transações fora do período selecionado

## 🔍 Exemplos Práticos

### Cenário 1: Wesley cria despesa compartilhada

**Transação Original**:
```
Criador: Wesley
Descrição: "mercado"
Valor: R$ 1.000
Conta: Nubank Cartão (Wesley)
Compartilhada: Sim (50% Fran, 50% Wesley)
```

**Extrato do Wesley**:
```
31/12/2025  mercado  -R$ 1.000,00  [Aparece o valor total]
```

**Extrato da Fran**:
```
[Não aparece nada ainda]
```

**Quando Fran acerta**:
```
Extrato da Fran:
01/01/2026  Pagamento Acerto - Wesley  -R$ 500,00
```

### Cenário 2: Fran cria despesa individual

**Transação**:
```
Criador: Fran
Descrição: "café"
Valor: R$ 50
Conta: Nubank Conta Corrente (Fran)
Compartilhada: Não
```

**Extrato da Fran**:
```
01/01/2026  café  -R$ 50,00  [Aparece normalmente]
```

### Cenário 3: Transação de viagem compartilhada

**Transação Original**:
```
Criador: Wesley
Descrição: "orlando"
Valor: USD 20
Conta: Nomad (Wesley)
Compartilhada: Sim (50% Fran, 50% Wesley)
Viagem: Ferias
```

**Extrato do Wesley (Nomad USD)**:
```
01/01/2026  orlando  -USD 20.00  [Valor total que ele pagou]
```

**Extrato da Fran**:
```
[Não aparece até acertar]
```

**Quando Fran acerta**:
```
Extrato da Fran (Wise USD):
01/01/2026  Pagamento Acerto - Wesley  -USD 10.00
```

## ✅ Solução Implementada

A query do `useAccountStatement` agora busca apenas:

```typescript
// Buscar transações da conta
// REGRA: Mostrar apenas transações que REALMENTE afetaram o saldo da conta
// 1. Transações individuais (is_shared = false) com account_id
// 2. Transações compartilhadas onde EU SOU O PAGADOR (creator_user_id = user.id e account_id preenchido)
// 3. Transações de acerto (settlements) - sempre aparecem
const { data: outgoingTransactions } = await supabase
  .from("transactions")
  .select(...)
  .eq("user_id", user.id)
  .eq("account_id", accountId)  // Apenas transações COM conta
  .gte("date", effectiveStartDate)
  .lte("date", effectiveEndDate);
```

### Filtro Automático

O filtro `.eq("account_id", accountId)` automaticamente:
- ✅ Inclui transações individuais (têm account_id)
- ✅ Inclui transações compartilhadas onde eu paguei (têm account_id)
- ✅ Inclui transações de acerto (têm account_id)
- ❌ Exclui transações espelhadas (não têm account_id)
- ❌ Exclui transações compartilhadas onde outro pagou (não têm meu account_id)


## 📊 Resultado Esperado

### Conta do Wesley (Nubank Cartão)

**Transações**:
- Wesley cria "mercado R$ 1.000" compartilhado com Fran
- Wesley recebe acerto de Fran R$ 500

**Extrato**:
```
31/12/2025  mercado                      -R$ 1.000,00  R$ 0,00
01/01/2026  Recebimento Acerto - Fran    +R$ 500,00    R$ 500,00
```

### Conta da Fran (Nubank Conta Corrente)

**Transações**:
- Fran recebe saldo inicial R$ 1.000
- Fran paga acerto para Wesley R$ 500

**Extrato**:
```
30/12/2025  Saldo inicial                +R$ 1.000,00  R$ 1.000,00
01/01/2026  Pagamento Acerto - Wesley    -R$ 500,00    R$ 500,00
```

**Nota**: A transação "mercado" NÃO aparece no extrato da Fran porque Wesley foi quem pagou.

## 🎯 Impacto

### Contas Afetadas
- ✅ Contas correntes BRL
- ✅ Contas correntes USD
- ✅ Cartões de crédito
- ✅ Todas as contas do sistema

### Funcionalidades Corrigidas
- ✅ Extrato mostra apenas movimentações reais
- ✅ Transações individuais aparecem normalmente
- ✅ Transações compartilhadas aparecem apenas para quem pagou
- ✅ Transações de acerto sempre aparecem
- ✅ Saldo correto refletido no extrato
- ✅ Running balance calculado corretamente

## 🔧 Arquivos Modificados

- `src/hooks/useAccountStatement.ts`

## 📝 Fluxo Completo

### 1. Wesley cria despesa compartilhada
```
Wesley: "mercado R$ 1.000" no Nubank Cartão
→ Extrato Wesley: -R$ 1.000 (valor total)
→ Extrato Fran: [nada ainda]
→ Compartilhados: Fran deve R$ 500 para Wesley
```

### 2. Fran acerta a dívida
```
Fran: "Pagamento Acerto - Wesley R$ 500" no Nubank Conta
→ Extrato Fran: -R$ 500
→ Compartilhados: Dívida quitada ✅
```

### 3. Wesley recebe o acerto
```
Wesley: "Recebimento Acerto - Fran R$ 500" no Nubank Cartão
→ Extrato Wesley: +R$ 500
→ Saldo final Wesley: -R$ 500 (pagou R$ 1.000, recebeu R$ 500)
```

## ✅ Validação

### Checklist de Testes
- [ ] Criar transação individual → Deve aparecer no extrato
- [ ] Criar transação compartilhada → Deve aparecer valor total no extrato do criador
- [ ] Verificar extrato do outro usuário → NÃO deve aparecer a transação compartilhada
- [ ] Fazer acerto → Deve aparecer no extrato de ambos
- [ ] Verificar saldo → Deve bater com as transações do extrato

### Queries de Validação

```sql
-- Verificar transações com account_id (devem aparecer no extrato)
SELECT id, description, amount, currency, type, account_id, is_shared, creator_user_id
FROM transactions
WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND account_id IS NOT NULL
ORDER BY date DESC;

-- Verificar transações sem account_id (NÃO devem aparecer no extrato)
SELECT id, description, amount, currency, type, account_id, is_shared
FROM transactions
WHERE user_id = '9545d0c1-94be-4b69-b110-f939bce072ee'
  AND account_id IS NULL
ORDER BY date DESC;
```

## 🔗 Relacionado

- `docs/CORRECAO_VISIBILIDADE_TRANSACOES_01_01_2025.md` - Correção sobre página Transações
- `src/hooks/useTransactions.ts` - Hook de transações gerais
- `src/hooks/useAccountStatement.ts` - Hook corrigido

---

**Correção aplicada em**: 01/01/2026  
**Lógica**: Extrato mostra apenas movimentações reais na conta  
**Testado**: ⚠️ Pendente  
**Deploy**: ⚠️ Pendente
