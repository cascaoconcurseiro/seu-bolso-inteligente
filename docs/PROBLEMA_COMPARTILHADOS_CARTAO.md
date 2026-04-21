# PROBLEMA: Transação de Cartão de Crédito Compartilhada Aparecendo no Mês Errado

## CONTEXTO DO SISTEMA

Tenho um sistema de finanças pessoais com 3 páginas diferentes que exibem transações:

1. **Página "Transações"**: Mostra extrato pessoal usando `transaction.date` (data real)
2. **Página "Cartões de Crédito"**: Mostra faturas usando `transaction.competence_date` (mês de fechamento)
3. **Página "Compartilhados"**: Mostra despesas divididas - deve calcular o mês de VENCIMENTO para cartões

## O PROBLEMA ATUAL

Criei uma transação compartilhada chamada "Caixa organizadora":
- **Data da transação**: 04/01/2026
- **Cartão da Fran**: fecha dia 26, vence dia 2
- **Valor**: R$ 42,96
- **Compartilhada com**: Wesley

### Comportamento ESPERADO:
- **Página Transações**: Deve aparecer em JANEIRO (data real: 04/01)
- **Página Cartões**: Deve aparecer em JANEIRO (fatura fecha 26/01)
- **Página Compartilhados**: Deve aparecer em FEVEREIRO para AMBOS os usuários (vencimento 02/02)

### Comportamento ATUAL (ERRADO):
- **Página Transações**: ❌ NÃO APARECE (sumiu!)
- **Página Cartões**: ❌ NÃO APARECE (sumiu!)
- **Página Compartilhados**: ❌ Aparece em JANEIRO (deveria ser FEVEREIRO)

## DADOS DA TRANSAÇÃO

```
Transação: "Caixa organizadora"
- date: 2026-01-04
- competence_date: 2026-01-01 (mês de fechamento)
- account_id: 9e04ab26-4b75-4844-a530-3c4359f6c6f3 (cartão da Fran)
- user_id: 9545d0c1-94be-4b69-b110-f939bce072ee (Fran)
- is_shared: true
- type: EXPENSE
```

```
Conta (Cartão da Fran):
- id: 9e04ab26-4b75-4844-a530-3c4359f6c6f3
- type: CREDIT_CARD
- closing_day: 26
- due_day: 2
- user_id: 56ccd60b-641f-4265-bc17-7b8705a2f8c9
```

## LÓGICA DE CÁLCULO PARA COMPARTILHADOS

Para cartões de crédito compartilhados, a data de exibição deve ser o **mês de VENCIMENTO**:

```
1. Determinar em qual fatura a transação entra:
   Se dia_transacao <= dia_fechamento:
     fatura = mês_atual
   Senão:
     fatura = próximo_mês

2. Calcular mês de vencimento:
   Se dia_vencimento <= dia_fechamento:
     vencimento = fatura + 1 mês
   Senão:
     vencimento = fatura (mesmo mês)
```

### Aplicando à transação "Caixa organizadora":
1. Transação dia 04, cartão fecha dia 26 → 04 <= 26 → fatura de JANEIRO
2. Vencimento dia 2, fechamento dia 26 → 2 <= 26 → vencimento = JANEIRO + 1 = FEVEREIRO
3. **Resultado: Deve aparecer em FEVEREIRO no Compartilhados**

## CÓDIGO ATUAL (useSharedFinances.ts)

```typescript
const calculateSharedDisplayDate = (
  transactionDate: string, 
  competenceDate: string | null,
  accountId: string | null, 
  accounts: any[]
): string => {
  if (!competenceDate) return transactionDate;
  if (!accountId) return competenceDate;

  const account = accounts.find(a => a.id === accountId);
  
  if (!account || account.type !== 'CREDIT_CARD') {
    return competenceDate;
  }

  // É CARTÃO DE CRÉDITO → calcular mês de VENCIMENTO
  const closingDay = account.closing_day || 1;
  const dueDay = account.due_day || 10;
  
  const closingMonth = new Date(competenceDate + 'T00:00:00');
  let dueMonth = closingMonth.getMonth();
  let dueYear = closingMonth.getFullYear();
  
  if (dueDay <= closingDay) {
    dueMonth++;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear++;
    }
  }
  
  const result = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-01`;
  return result;
};
```

## PROBLEMA IDENTIFICADO

1. **A conta da Fran não está sendo encontrada** no array `accounts`
2. O log mostra apenas 1 cartão encontrado, mas deveria encontrar 2 (Wesley e Fran)
3. Quando a conta não é encontrada, o código retorna `competenceDate` (Janeiro) ao invés de calcular o vencimento (Fevereiro)

### Query atual para buscar contas:
```typescript
const { data: accounts } = await supabase
  .from('accounts')
  .select('id, type, closing_day, due_day, user_id')
  .or(`user_id.in.(${transactionUserIds.join(',')}),id.in.(${transactionAccountIds.join(',')})`);
```

## LOGS DO CONSOLE

```
🔍 [useSharedFinances] familyUserIds para buscar contas: Array(1)
  0: "56ccd60b-641f-4265-bc17-7b8705a2f8c9"

🔍 [useSharedFinances] TODAS as contas encontradas: Object
  accounts: (6) [{…}, {…}, {…}, {…}, {…}, {…}]
  count: 6

🔍 [useSharedFinances] Contas de cartão encontradas: Object
  accounts: [{…}]  ← APENAS 1 CARTÃO! Deveria ser 2!
  count: 1
```

## O QUE PRECISO

1. **Entender por que a conta da Fran não está sendo retornada** pela query
2. **Corrigir a query** para garantir que TODAS as contas de cartão sejam encontradas
3. **Garantir que a transação apareça**:
   - Em JANEIRO na página Transações
   - Em JANEIRO na página Cartões
   - Em FEVEREIRO na página Compartilhados (para ambos os usuários)

## ARQUIVOS RELEVANTES

- `seu-bolso-inteligente/src/hooks/useSharedFinances.ts` (linhas 55-115 e 230-270)
- `seu-bolso-inteligente/src/hooks/useTransactions.ts` (filtros de data)
- `seu-bolso-inteligente/docs/REGRAS_EXIBICAO_TRANSACOES.md` (documentação das regras)

## OBSERVAÇÃO IMPORTANTE

Recentemente tentei fazer mudanças no código e agora a transação **sumiu completamente** das páginas Transações e Cartões. Ela só aparece no Compartilhados, mas no mês errado (Janeiro ao invés de Fevereiro).

**PRECISO DE AJUDA PARA:**
1. Fazer a transação voltar a aparecer nas páginas Transações e Cartões
2. Fazer a transação aparecer em FEVEREIRO no Compartilhados (para ambos os usuários)
3. Entender por que a conta da Fran não está sendo encontrada pela query
