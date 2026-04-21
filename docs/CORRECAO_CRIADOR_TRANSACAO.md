# Correção: Exibição do Criador da Transação

## Problema Identificado

Na página de Transações, não estava claro quem criou cada transação compartilhada. O sistema mostrava apenas um badge genérico "Outro membro" quando alguém diferente do usuário logado criava a transação, e não mostrava nada quando era o próprio usuário.

**Exemplo do problema:**
- Wesley cria uma transação compartilhada
- Fran vê a transação mas aparece como se ela tivesse criado
- Não fica claro quem realmente lançou a despesa

## Causa Raiz

A função `getCreatorName()` em `Transactions.tsx` retornava `null` quando o criador era o próprio usuário logado:

```typescript
// ANTES (ERRADO)
const getCreatorName = (creatorUserId: string | null) => {
  if (!creatorUserId) return null;
  if (creatorUserId === user?.id) return null; // ❌ Não mostrava nada
  
  const member = familyMembers.find(
    m => m.user_id === creatorUserId || m.linked_user_id === creatorUserId
  );
  return member?.name || 'Outro membro';
};
```

## Solução Implementada

### 1. Atualização da função `getCreatorName()`

Agora a função retorna 'Você' quando o criador é o usuário logado:

```typescript
// DEPOIS (CORRETO)
const getCreatorName = (creatorUserId: string | null) => {
  if (!creatorUserId) return null;
  
  // Se foi o próprio usuário que criou, retornar "Você"
  if (creatorUserId === user?.id) return 'Você';
  
  // Buscar nome do membro que criou
  const member = familyMembers.find(
    m => m.user_id === creatorUserId || m.linked_user_id === creatorUserId
  );
  return member?.name || 'Outro membro';
};
```

### 2. Atualização do Badge de Criador

O badge agora:
- Mostra "Criado por Você" (verde) quando o usuário logado criou
- Mostra "Criado por [Nome]" (azul) quando outro membro criou
- Aparece APENAS para transações compartilhadas

```typescript
{transaction.is_shared && creatorName && (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
    creatorName === 'Você' 
      ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
      : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
  )}>
    <User className="h-3 w-3" />
    Criado por {creatorName}
  </span>
)}
```

## Resultado Final

Agora na página de Transações:

✅ **Transação criada por você:**
- Badge verde: "Criado por Você"

✅ **Transação criada por outro membro:**
- Badge azul: "Criado por Wesley" (ou nome do membro)

✅ **Transação pessoal (não compartilhada):**
- Sem badge de criador (não é necessário)

## Arquivos Modificados

- `seu-bolso-inteligente/src/pages/Transactions.tsx`
  - Função `getCreatorName()` (linha ~298)
  - Badge de criador (linha ~584)

## Observações Técnicas

- O campo `creator_user_id` é preenchido automaticamente ao criar transações (ver `useTransactions.ts` linhas 177 e 267)
- O campo é mantido mesmo em transações espelhadas (mirrors)
- A lógica de permissões (editar/excluir) já considera tanto `user_id` quanto `creator_user_id`

## Testes Recomendados

1. Criar uma transação compartilhada como Wesley
2. Verificar que aparece "Criado por Você" para Wesley
3. Verificar que aparece "Criado por Wesley" para Fran
4. Confirmar que transações pessoais não mostram o badge
5. Verificar que a cor do badge está correta (verde para "Você", azul para outros)

## Data da Correção

05/01/2026
