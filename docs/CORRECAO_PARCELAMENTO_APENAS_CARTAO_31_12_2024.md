# Correção: Parcelamento Apenas para Cartões de Crédito

**Data**: 31/12/2024  
**Problema**: O formulário de nova transação permitia parcelar despesas em contas correntes e contas globais, mas parcelamento deveria ser exclusivo para cartões de crédito.

## Problema Identificado

No formulário de transação (`TransactionForm.tsx`), a opção de parcelamento estava disponível para qualquer despesa:

```typescript
// CÓDIGO ANTIGO (ERRADO)
{isExpense && (
  <div className="p-4 rounded-xl border border-border space-y-4">
    {/* Opção de parcelar */}
  </div>
)}
```

Isso permitia que o usuário:
- ❌ Parcelasse despesas em conta corrente
- ❌ Parcelasse despesas em conta global
- ✅ Parcelasse despesas em cartão de crédito (correto)

## Regra de Negócio

**Parcelamento deve ser exclusivo para cartões de crédito** porque:
1. Cartões de crédito têm fatura mensal e suportam parcelamento naturalmente
2. Contas correntes debitam imediatamente, não faz sentido "parcelar"
3. Contas globais são para viagens e não devem ter parcelamento

## Correção Implementada

### 1. Ajuste na Condição de Exibição

Alterado de:
```typescript
{isExpense && (
```

Para:
```typescript
{isExpense && isCreditCard && (
```

Agora a seção de parcelamento só aparece quando:
- ✅ É uma despesa (EXPENSE)
- ✅ A conta selecionada é um cartão de crédito

### 2. Reset Automático do Parcelamento

Adicionado um `useEffect` para desabilitar automaticamente o parcelamento quando o usuário trocar de cartão de crédito para conta corrente:

```typescript
// Desabilitar parcelamento se não for cartão de crédito
useEffect(() => {
  if (!isCreditCard && isInstallment) {
    setIsInstallment(false);
  }
}, [accountId, isCreditCard, isInstallment]);
```

### 3. Remoção do Aviso Desnecessário

Removido o aviso que aparecia quando parcelamento era usado em conta corrente:
```typescript
// REMOVIDO
{!isCreditCard && (
  <p className="text-xs text-amber-600">
    ⚠️ Parcelamento em conta corrente: as parcelas serão debitadas mensalmente
  </p>
)}
```

Esse aviso não é mais necessário porque o parcelamento não estará disponível para contas correntes.

## Verificação no Banco de Dados

Executado SQL para verificar se há transações parceladas em contas não-cartão:

```sql
SELECT 
  t.id, 
  t.description, 
  t.amount, 
  t.date, 
  t.is_installment, 
  t.current_installment, 
  t.total_installments, 
  a.name as account_name, 
  a.type as account_type
FROM transactions t
JOIN accounts a ON a.id = t.account_id
WHERE t.is_installment = true 
  AND a.type != 'CREDIT_CARD'
ORDER BY t.date DESC;
```

**Resultado**: ✅ Nenhuma transação encontrada

Não há transações parceladas em contas correntes ou globais no banco de dados, então não é necessário criar uma migration de correção.

## Arquivos Modificados

### `src/components/transactions/TransactionForm.tsx`
1. Alterada condição de exibição da seção de parcelamento
2. Adicionado useEffect para reset automático
3. Removido aviso de parcelamento em conta corrente
4. Atualizado comentário de "any expense" para "credit card only"

## Impacto na UI

### Antes da Correção
- Conta Corrente selecionada → ✅ Opção "Parcelar" visível (ERRADO)
- Conta Global selecionada → ✅ Opção "Parcelar" visível (ERRADO)
- Cartão de Crédito selecionado → ✅ Opção "Parcelar" visível (CORRETO)

### Depois da Correção
- Conta Corrente selecionada → ❌ Opção "Parcelar" oculta (CORRETO)
- Conta Global selecionada → ❌ Opção "Parcelar" oculta (CORRETO)
- Cartão de Crédito selecionado → ✅ Opção "Parcelar" visível (CORRETO)

## Comportamento Esperado

1. **Usuário seleciona Conta Corrente**:
   - Seção de parcelamento não aparece
   - Se estava parcelado, o toggle é desabilitado automaticamente

2. **Usuário seleciona Conta Global**:
   - Seção de parcelamento não aparece
   - Se estava parcelado, o toggle é desabilitado automaticamente

3. **Usuário seleciona Cartão de Crédito**:
   - Seção de parcelamento aparece
   - Usuário pode escolher parcelar em 2x até 12x

4. **Usuário troca de Cartão para Conta Corrente**:
   - Parcelamento é desabilitado automaticamente
   - Seção de parcelamento desaparece

## Testes Recomendados

1. ✅ Criar despesa em conta corrente → Parcelamento não deve aparecer
2. ✅ Criar despesa em conta global → Parcelamento não deve aparecer
3. ✅ Criar despesa em cartão de crédito → Parcelamento deve aparecer
4. ✅ Ativar parcelamento em cartão → Trocar para conta corrente → Parcelamento deve desabilitar
5. ✅ Verificar que transações existentes não foram afetadas

## Conclusão

✅ **Correção implementada com sucesso!**

O parcelamento agora está restrito apenas a cartões de crédito, conforme a regra de negócio. A UI se adapta automaticamente quando o usuário troca de conta, garantindo uma experiência consistente e sem erros.

**Benefícios**:
- ✅ Previne criação de transações parceladas em contas incorretas
- ✅ UI mais limpa e intuitiva
- ✅ Regra de negócio aplicada corretamente
- ✅ Sem necessidade de migration (não há dados incorretos)
