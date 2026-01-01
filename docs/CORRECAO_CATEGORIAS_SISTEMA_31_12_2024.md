# Correção: Categorias de Sistema - 31/12/2024

## Resumo
Adicionadas categorias específicas para transações de sistema (Saldo Inicial e Acerto Financeiro) e corrigida exibição de transações sem categoria.

## Problemas Identificados

### 1. Transações de Sistema Sem Categoria
**Problema**: Transações criadas automaticamente pelo sistema não tinham categoria:
- "Saldo inicial" (ao criar conta com saldo)
- "Pagamento Acerto - [Nome]" (ao pagar dívida compartilhada)
- "Recebimento Acerto - [Nome]" (ao receber pagamento compartilhado)

**Impacto**: 
- Transações apareciam sem ícone ou com ícone genérico
- Difícil identificar o tipo de transação
- Relatórios e filtros não funcionavam corretamente

### 2. Transações de Viagem Sem Categoria
**Problema**: Na aba "Gastos" de viagens, transações sem categoria mostravam:
- "Sem categoria" no texto
- "?" no avatar
- "Desconhecido" como pagador

**Impacto**: Interface confusa e pouco profissional

## Correções Aplicadas

### 1. Novas Categorias de Sistema ✅

**Arquivo**: `src/hooks/useCategories.ts`

**Categorias adicionadas**:

#### Saldo Inicial (INCOME)
- Nome: "Saldo Inicial"
- Ícone: 💰
- Tipo: income
- Uso: Transação criada ao criar conta com saldo inicial

#### Acerto Financeiro (INCOME)
- Nome: "Acerto Financeiro"
- Ícone: 🤝
- Tipo: income
- Uso: Recebimento de pagamento de dívida compartilhada

#### Acerto Financeiro (EXPENSE)
- Nome: "Acerto Financeiro"
- Ícone: 🤝
- Tipo: expense
- Uso: Pagamento de dívida compartilhada

### 2. Atualização do Hook useAccounts ✅

**Arquivo**: `src/hooks/useAccounts.ts`

**Mudança**: Ao criar transação de saldo inicial, buscar e usar categoria "Saldo Inicial"

```typescript
// Buscar categoria "Saldo Inicial"
const { data: categoryData } = await supabase
  .from('categories')
  .select('id')
  .eq('user_id', user.id)
  .eq('name', 'Saldo Inicial')
  .eq('type', 'income')
  .single();

const { error: txError } = await supabase.from('transactions').insert({
  // ... outros campos
  category_id: categoryData?.id || null, // Usar categoria se encontrada
});
```

### 3. Atualização do SharedExpenses ✅

**Arquivo**: `src/pages/SharedExpenses.tsx`

**Mudanças**:
1. Adicionado import do `useAuth`
2. Buscar categoria "Acerto Financeiro" ao criar transação de acerto

```typescript
// Buscar categoria "Acerto Financeiro"
const { data: categoryData } = await supabase
  .from('categories')
  .select('id')
  .eq('user_id', user?.id)
  .eq('name', 'Acerto Financeiro')
  .eq('type', settleType === "PAY" ? 'expense' : 'income')
  .single();

const result = await createTransaction.mutateAsync({
  // ... outros campos
  category_id: categoryData?.id || undefined, // Usar categoria se encontrada
});
```

### 4. Melhoria na Exibição de Gastos de Viagem ✅

**Arquivo**: `src/pages/Trips.tsx`

**Mudanças**:
1. Substituído avatar do pagador por ícone da categoria
2. Fallback para "Outros" ao invés de "Sem categoria"
3. Mostrar nome da conta ao invés de "Desconhecido"

**Antes**:
```
? | maria | Sem categoria · Desconhecido · 31 dez
```

**Depois**:
```
💸 | maria | Outros · Wise - Conta Corrente · 31 dez
```

**Código**:
```typescript
const categoryIcon = expense.category?.icon || "💸";
const categoryName = expense.category?.name || "Outros";
const payerName = payer?.name || expense.account?.name || "Conta";

<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg">
  {categoryIcon}
</div>
<p className="text-xs text-muted-foreground">
  {categoryName} · {payerName} · {format(new Date(expense.date), "dd MMM", { locale: ptBR })}
</p>
```

### 5. Migration para Usuários Existentes ✅

**Arquivo**: `supabase/migrations/20251231190000_add_system_categories.sql`

**Ações**:
1. Criar categorias "Saldo Inicial" e "Acerto Financeiro" para todos os usuários
2. Atualizar transações existentes para usar as novas categorias

**Resultados**:
```sql
-- Categorias criadas para todos os usuários
INSERT INTO categories (user_id, name, icon, type)
SELECT u.id, 'Saldo Inicial', '💰', 'income'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.user_id = u.id AND c.name = 'Saldo Inicial');

-- Transações atualizadas
UPDATE transactions t
SET category_id = (SELECT c.id FROM categories c WHERE c.user_id = t.user_id AND c.name = 'Saldo Inicial')
WHERE t.description = 'Saldo inicial' AND t.category_id IS NULL;
```

## Arquivos Modificados

1. ✅ `src/hooks/useCategories.ts` - Adicionadas categorias de sistema
2. ✅ `src/hooks/useAccounts.ts` - Buscar categoria ao criar saldo inicial
3. ✅ `src/pages/SharedExpenses.tsx` - Buscar categoria ao criar acerto
4. ✅ `src/pages/Trips.tsx` - Melhorada exibição de gastos
5. ✅ `supabase/migrations/20251231190000_add_system_categories.sql` - Migration

## Verificação

### Transações Atualizadas
```sql
SELECT 
  t.description,
  t.type,
  c.name as category_name,
  c.icon as category_icon
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.description IN ('Saldo inicial') 
   OR t.description LIKE 'Pagamento%Acerto%'
   OR t.description LIKE 'Recebimento%Acerto%';
```

**Resultado**:
- ✅ Saldo inicial → 💰 Saldo Inicial
- ✅ Pagamento Acerto → 🤝 Acerto Financeiro
- ✅ Recebimento Acerto → 🤝 Acerto Financeiro

### Novas Transações
1. Criar nova conta com saldo inicial
2. Verificar que transação tem categoria "Saldo Inicial" com ícone 💰
3. Fazer acerto de despesa compartilhada
4. Verificar que transação tem categoria "Acerto Financeiro" com ícone 🤝

### Gastos de Viagem
1. Abrir viagem com despesas
2. Ir para aba "Gastos"
3. Verificar que todas as transações têm:
   - Ícone da categoria (ou 💸 como fallback)
   - Nome da categoria (ou "Outros" como fallback)
   - Nome da conta (nunca "Desconhecido")

## Status Final

✅ Categorias de sistema criadas
✅ Transações existentes atualizadas
✅ Novas transações usam categorias automaticamente
✅ Exibição de gastos de viagem melhorada
✅ Sem mais "Sem categoria" ou "Desconhecido"

## Benefícios

1. **Organização**: Todas as transações têm categoria apropriada
2. **Clareza**: Fácil identificar transações de sistema
3. **Relatórios**: Filtros e relatórios funcionam corretamente
4. **Profissionalismo**: Interface mais polida e consistente
5. **Manutenibilidade**: Categorias centralizadas e reutilizáveis

## Notas Técnicas

### Por que categorias separadas?
- "Saldo Inicial" é sempre INCOME (entrada de dinheiro)
- "Acerto Financeiro" pode ser INCOME ou EXPENSE (depende se está recebendo ou pagando)
- Cada tipo precisa de sua própria categoria no banco

### Fallbacks
- Se categoria não for encontrada, transação é criada sem categoria (null)
- Interface sempre mostra fallback apropriado (ícone e nome)
- Não quebra funcionalidade se categoria não existir

### Categorias Padrão
Novos usuários recebem automaticamente:
- 100+ categorias padrão (alimentação, transporte, etc.)
- 3 categorias de sistema (Saldo Inicial, Acerto Financeiro x2)
- Total: ~103 categorias
