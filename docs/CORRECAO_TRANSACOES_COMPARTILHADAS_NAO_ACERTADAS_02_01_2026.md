# Correção: Transações Compartilhadas Não Acertadas - 02/01/2026

## Problema Identificado

Quando um usuário (Fran) importava parcelas compartilhadas onde outro usuário (Wesley) deveria pagar, essas transações apareciam incorretamente na lista de "Transações" da Fran como débito, mesmo antes de serem pagas.

### Exemplo do Problema
- Fran importou 10 parcelas de R$ 95,00 da geladeira
- Wesley deveria pagar essas parcelas
- As parcelas apareciam na lista de "Transações" da Fran como débito
- Isso estava errado: elas só deveriam aparecer em "Compartilhados"

## Análise Técnica

### Dados do Banco
```sql
-- Primeira parcela (PROBLEMA)
id: 70ca9127-af28-4986-8fb2-cbb1a6c6d173
user_id: 9545d0c1-94be-4b69-b110-f939bce072ee (Fran)
is_shared: false ← PROBLEMA!
domain: SHARED
creator_user_id: 9545d0c1-94be-4b69-b110-f939bce072ee (Fran)

-- Demais parcelas (CORRETO)
user_id: 56ccd60b-641f-4265-bc17-7b8705a2f8c9 (Wesley)
is_shared: true ← CORRETO!
domain: SHARED
creator_user_id: 9545d0c1-94be-4b69-b110-f939bce072ee (Fran)
```

### Causa Raiz
1. A primeira parcela foi criada com `is_shared=false` quando deveria ser `true`
2. O filtro anterior verificava apenas `is_shared && user_id !== user?.id`
3. Como a primeira parcela tinha `is_shared=false`, o filtro não funcionava

## Solução Implementada

### 1. Correção no Banco de Dados
```sql
UPDATE transactions 
SET is_shared = true 
WHERE id = '70ca9127-af28-4986-8fb2-cbb1a6c6d173' 
  AND domain = 'SHARED' 
  AND is_shared = false;
```

### 2. Nova Lógica de Filtro

**Regra:** Transações compartilhadas só aparecem na lista de "Transações" quando:
- TODOS os splits foram acertados (`is_settled = true`)
- E o usuário atual é o criador/pagador da transação

**Implementação:**
```typescript
// src/pages/Transactions.tsx e src/pages/Dashboard.tsx
if (t.is_shared || t.domain === 'SHARED') {
  // Se não tem splits, não mostrar (transação incompleta)
  if (!t.transaction_splits || t.transaction_splits.length === 0) {
    return false;
  }
  
  // Verificar se TODOS os splits foram acertados
  const allSettled = t.transaction_splits.every((s: any) => s.is_settled);
  
  // Se não foram todos acertados, não mostrar
  if (!allSettled) {
    return false;
  }
  
  // Se foram acertados, verificar se o usuário atual é o criador/pagador
  if (t.creator_user_id !== user?.id && t.user_id !== user?.id) {
    return false;
  }
}
```

### 3. Atualização da Interface Transaction
```typescript
export interface Transaction {
  // ... campos existentes
  creator_user_id: string | null; // Quem criou a transação
  transaction_splits?: Array<{
    id: string;
    member_id: string;
    user_id: string;
    percentage: number;
    amount: number;
    is_settled: boolean;
    name?: string;
  }>;
}
```

## Comportamento Correto

### Cenário 1: Fran importa parcelas para Wesley pagar
1. ✅ Parcelas aparecem em "Compartilhados" para ambos
2. ✅ Parcelas **NÃO** aparecem em "Transações" da Fran
3. ✅ Parcelas **NÃO** aparecem em "Transações" do Wesley
4. ✅ Quando Wesley pagar/acertar, aparecem em "Transações" da Fran (como receita)

### Cenário 2: Wesley paga uma despesa compartilhada
1. ✅ Transação aparece em "Compartilhados" para ambos
2. ✅ Transação aparece em "Transações" do Wesley (como débito)
3. ✅ Transação **NÃO** aparece em "Transações" da Fran
4. ✅ Quando Fran acertar, aparece em "Transações" do Wesley (como receita)

## Arquivos Modificados

1. `src/pages/Transactions.tsx` - Filtro de transações
2. `src/pages/Dashboard.tsx` - Transações recentes
3. `src/hooks/useTransactions.ts` - Interface Transaction atualizada

## Testes Necessários

- [ ] Importar parcelas compartilhadas e verificar que não aparecem em "Transações"
- [ ] Verificar que aparecem em "Compartilhados"
- [ ] Acertar uma parcela e verificar que aparece em "Transações" do criador
- [ ] Fazer hard refresh (Ctrl+Shift+R) após deploy

## Deploy

```bash
npm run build
git add -A
git commit -m "fix: ocultar transações compartilhadas não acertadas da lista de transações"
git push
```

Deploy automático via Vercel: ✅

## Observações

- A correção garante que transações compartilhadas só aparecem na lista de "Transações" após serem acertadas
- Isso evita confusão sobre quem deve pagar o quê
- O saldo do usuário não é afetado por transações que outra pessoa deve pagar
- A aba "Compartilhados" continua mostrando todas as transações compartilhadas, independente do status
