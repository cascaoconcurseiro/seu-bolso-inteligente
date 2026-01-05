# Correções: Dashboard e Seletor de Categorias

## Data: 05/01/2026

## Problema 1: Dashboard mostrando transações compartilhadas

### Sintomas
- Dashboard exibindo "Carro - Balanceamento" (R$ 260,00) na seção "Faturas Pendentes"
- Transação compartilhada interferindo na projeção de fim de mês
- Valor aparecendo mesmo sendo pago por outra pessoa

### Causa Raiz
O Dashboard estava calculando o saldo dos cartões de crédito diretamente da tabela `accounts`, que inclui TODAS as transações (inclusive compartilhadas e pagas por outros).

### Solução Implementada
Modificado `Dashboard.tsx` para:

1. **Filtrar transações na seção "Atividade Recente"** (já estava correto):
   - Excluir `is_shared === true`
   - Excluir `payer_id !== null`

2. **Recalcular saldo dos cartões na seção "Faturas Pendentes"**:
   - Buscar todas as transações do cartão
   - Excluir transações compartilhadas (`is_shared === true`)
   - Excluir transações pagas por outros (`payer_id !== null`)
   - Calcular saldo real baseado apenas nas transações do usuário
   - Só exibir cartão se tiver saldo negativo (dívida)

### Código Alterado
```typescript
const creditCardsWithBalance = useMemo(() => {
  if (!accounts || !Array.isArray(accounts) || !transactions) return [];
  const today = new Date();
  const currentDay = today.getDate();
  
  return (accounts || []).filter(a => {
    if (a.type !== "CREDIT_CARD") return false;
    
    // Só mostrar se a fatura já fechou
    const closingDay = a.closing_day || 1;
    if (currentDay <= closingDay) return false;
    
    // Calcular saldo real excluindo transações compartilhadas
    const cardTransactions = transactions.filter(tx => 
      tx.account_id === a.id && 
      !tx.is_shared && 
      !tx.payer_id
    );
    
    const realBalance = cardTransactions.reduce((sum, tx) => {
      return sum + (tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount));
    }, 0);
    
    return realBalance < 0;
  }).map(a => {
    // Recalcular balance para exibição
    const cardTransactions = transactions.filter(tx => 
      tx.account_id === a.id && 
      !tx.is_shared && 
      !tx.payer_id
    );
    
    const realBalance = cardTransactions.reduce((sum, tx) => {
      return sum + (tx.type === 'EXPENSE' ? -Number(tx.amount) : Number(tx.amount));
    }, 0);
    
    return {
      ...a,
      balance: realBalance
    };
  });
}, [accounts, transactions]);
```

### Resultado
- Dashboard agora mostra apenas faturas de cartão com transações do próprio usuário
- Transações compartilhadas não interferem na projeção
- Valores corretos em todas as seções

---

## Problema 2: Categorias não aparecendo no formulário

### Sintomas
- Seletor de categorias mostrando "Carregando categorias..." indefinidamente
- Categorias não sendo exibidas no formulário de transações
- Componente `CategorySelector` criado mas não integrado

### Causa Raiz
O componente `CategorySelector` foi criado mas nunca foi integrado no `TransactionForm`. O formulário ainda estava usando o componente `Select` antigo.

### Solução Implementada
Substituído o `Select` antigo pelo novo `CategorySelector` no `TransactionForm.tsx`:

**Antes:**
```typescript
<Select value={categoryId} onValueChange={setCategoryId}>
  <SelectTrigger className="h-12">
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent className="max-h-[400px]">
    {filteredParents.map((parent) => {
      // ... código complexo de renderização
    })}
  </SelectContent>
</Select>
```

**Depois:**
```typescript
<CategorySelector
  categories={hierarchical.data || []}
  value={categoryId}
  onValueChange={setCategoryId}
  type={activeTab === 'INCOME' ? 'income' : 'expense'}
  placeholder="Selecione uma categoria"
/>
```

### Funcionalidades do CategorySelector
- Categorias pai aparecem recolhidas por default
- Clique na categoria pai expande/recolhe as subcategorias
- Mostra contador de subcategorias ao lado do pai
- Ícones de chevron indicam estado (expandido/recolhido)
- Breadcrumb quando categoria selecionada (Pai / Filho)
- Interface limpa e organizada

### Resultado
- Categorias agora aparecem corretamente
- Interface mais limpa e organizada
- Melhor experiência do usuário

---

## Arquivos Modificados

1. `seu-bolso-inteligente/src/pages/Dashboard.tsx`
   - Recálculo de saldo de cartões excluindo compartilhadas

2. `seu-bolso-inteligente/src/components/transactions/TransactionForm.tsx`
   - Integração do CategorySelector

3. `seu-bolso-inteligente/src/components/transactions/CategorySelector.tsx`
   - Componente já existia, agora está sendo usado

---

## Regras de Exibição (Resumo)

### Página Transações
- Mostrar apenas transações criadas E pagas pelo usuário logado
- Excluir `is_shared === true`
- Excluir `payer_id !== null`

### Página Cartões
- Usar `competence_date` (mês de fechamento)
- Não filtrar compartilhadas (mostra todas do cartão)

### Página Compartilhados
- Usar data calculada de vencimento (`shared_display_date`)
- Mostrar apenas transações compartilhadas

### Dashboard
- **Atividade Recente**: Excluir compartilhadas e pagas por outros
- **Faturas Pendentes**: Recalcular saldo excluindo compartilhadas
- **Projeção**: Baseada apenas em transações do usuário

---

## Testes Recomendados

1. ✅ Verificar Dashboard não mostra transações compartilhadas
2. ✅ Verificar projeção de fim de mês está correta
3. ✅ Verificar faturas de cartão mostram valores corretos
4. ✅ Verificar seletor de categorias funciona
5. ✅ Verificar categorias expandem/recolhem corretamente
6. ✅ Verificar breadcrumb de categoria selecionada
