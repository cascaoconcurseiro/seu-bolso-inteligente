# 🔍 DEBUG: Transações Compartilhadas

## Problema Identificado

**Splits = 0** - Nenhum split está sendo criado no banco de dados.

## Possíveis Causas

### 1. Splits não estão sendo selecionados no formulário
- Usuário não está clicando nos membros para dividir
- Modal de divisão não está salvando os splits corretamente

### 2. Splits não estão sendo passados para o hook
- Estado `splits` está vazio no momento do submit
- Função `buildSplitsForSubmit()` retorna array vazio

### 3. Erro ao inserir splits no banco
- Erro silencioso no `console.error`
- Problema de permissão RLS

## Como Debugar

### Passo 1: Verificar no Console do Navegador

Abra o DevTools (F12) e adicione logs no código:

**Em `TransactionForm.tsx`, linha 188**:
```typescript
const transactionSplits = buildSplitsForSubmit();
console.log('🔍 DEBUG - Splits antes de enviar:', transactionSplits);
console.log('🔍 DEBUG - PayerId:', payerId);
console.log('🔍 DEBUG - isShared:', isShared);
```

### Passo 2: Verificar Estado do Modal

**Em `SplitModal.tsx`, adicionar log no botão Confirmar**:
```typescript
<Button onClick={() => {
  console.log('🔍 DEBUG - Splits no modal:', splits);
  console.log('🔍 DEBUG - PayerId no modal:', payerId);
  onConfirm();
}}>
  Confirmar
</Button>
```

### Passo 3: Verificar no Hook

**Em `useTransactions.ts`, linha 264**:
```typescript
if (splits && splits.length > 0) {
  console.log('🔍 DEBUG - Splits recebidos no hook:', splits);
  console.log('🔍 DEBUG - SplitsToInsert:', splitsToInsert);
  
  const { error: splitsError } = await supabase
    .from("transaction_splits")
    .insert(splitsToInsert);

  if (splitsError) {
    console.error("❌ Erro ao criar splits:", splitsError);
  } else {
    console.log('✅ Splits criados com sucesso!');
  }
}
```

### Passo 4: Verificar no Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Ver última transação criada
SELECT 
  id,
  description,
  amount,
  is_shared,
  payer_id,
  user_id,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 1;

-- Ver splits da última transação
SELECT 
  ts.*,
  fm.name as member_name
FROM transaction_splits ts
LEFT JOIN family_members fm ON fm.id = ts.member_id
WHERE ts.transaction_id = (
  SELECT id FROM transactions 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Ver membros da família
SELECT 
  id,
  name,
  user_id,
  linked_user_id,
  email
FROM family_members;
```

## Checklist de Verificação

- [ ] Modal de divisão abre corretamente
- [ ] Membros da família aparecem no modal
- [ ] Ao clicar em um membro, ele fica selecionado (check verde)
- [ ] Percentual é calculado automaticamente
- [ ] Ao clicar em "Confirmar", modal fecha
- [ ] Estado `splits` é mantido após fechar o modal
- [ ] Ao salvar transação, splits são enviados para o hook
- [ ] Splits são inseridos no banco sem erro
- [ ] Transação é marcada como `is_shared = true`

## Teste Manual

### Cenário 1: Criar Transação Compartilhada Simples

1. Abrir formulário de nova transação
2. Preencher valor: R$ 100,00
3. Preencher descrição: "Teste Compartilhado"
4. Clicar em "Dividir" na seção de compartilhamento
5. Selecionar "Eu Paguei"
6. Clicar em um membro da família (ex: Wesley)
7. Verificar que aparece check verde
8. Verificar que mostra "50% = R$ 50,00"
9. Clicar em "Confirmar"
10. Salvar transação
11. Verificar no banco se splits foram criados

### Cenário 2: Outro Pagou

1. Abrir formulário de nova transação
2. Preencher valor: R$ 100,00
3. Preencher descrição: "Teste Outro Pagou"
4. Clicar em "Dividir"
5. Selecionar "Outro Pagou"
6. Selecionar membro que pagou (ex: Fran)
7. Clicar em "Confirmar"
8. Salvar transação
9. Verificar no banco se transação tem `payer_id` preenchido

## Solução Rápida

Se os splits não estão sendo criados, adicione este código temporário para forçar:

**Em `useTransactions.ts`, após inserir a transação**:

```typescript
// DEBUG: Forçar criação de splits
if (input.is_shared && (!splits || splits.length === 0)) {
  console.warn('⚠️ Transação compartilhada sem splits! Verificar formulário.');
  toast.error('Erro: Transação compartilhada sem divisão. Selecione membros para dividir.');
  throw new Error('Transação compartilhada sem splits');
}
```

## Próximos Passos

1. Adicionar logs de debug
2. Criar transação de teste
3. Verificar console do navegador
4. Verificar banco de dados
5. Identificar onde os splits estão sendo perdidos
6. Corrigir o problema
7. Remover logs de debug

---

**Data**: 26/12/2024  
**Status**: Aguardando debug  
**Prioridade**: 🔴 CRÍTICA
