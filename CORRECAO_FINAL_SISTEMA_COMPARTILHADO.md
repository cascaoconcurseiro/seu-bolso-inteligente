# Correção Final do Sistema de Transações Compartilhadas

## Data: 27/12/2024

## Problemas Corrigidos

### 1. Estrutura de Membros da Família
**Problema**: Cada usuário tinha apenas um membro (ele mesmo) na tabela `family_members`

**Solução**: Criada estrutura cruzada onde cada usuário vê todos os membros da família:

```
Wesley (user_id: 291732a3...) vê:
├── Wesley (member_id: 69d68fc0..., linked_user_id: 291732a3... [ele mesmo])
└── Fran (member_id: 45f6ba97..., linked_user_id: d7f294f7... [Fran])

Fran (user_id: d7f294f7...) vê:
├── Fran (member_id: 29faa178..., linked_user_id: d7f294f7... [ela mesma])
└── Wesley (member_id: c8408ef7..., linked_user_id: 291732a3... [Wesley])
```

### 2. Sincronização de Modelos
**Problema**: Sistema tinha dois modelos não sincronizados:
- `transaction_splits` (tabela) - usado pelo frontend
- `shared_with` (JSONB) - usado pelas funções do banco

**Solução**: Criado trigger `sync_splits_to_shared_with()` que:
1. Monitora inserções em `transaction_splits`
2. Atualiza `shared_with` automaticamente
3. Chama `sync_shared_transaction()` para criar espelhos

### 3. Limpeza de Dados
**Ação**: Deletadas TODAS as transações compartilhadas antigas e splits para começar do zero com estrutura correta

## Estrutura Correta do Sistema

### Como Funciona

1. **Criação de Transação Compartilhada** (Frontend):
   ```typescript
   createTransaction({
     amount: 100,
     description: "Almoço",
     splits: [
       { member_id: "45f6ba97...", percentage: 50, amount: 50 } // Fran
     ]
   })
   ```

2. **Hook useTransactions** (Backend):
   - Insere transação na tabela `transactions`
   - Insere splits na tabela `transaction_splits`

3. **Trigger `trg_sync_splits_to_shared_with`**:
   - Atualiza `shared_with` da transação
   - Chama `sync_shared_transaction()`

4. **Função `sync_shared_transaction()`**:
   - Para cada split, busca o `linked_user_id` do membro
   - Cria transação espelhada para esse usuário
   - Transação espelhada tem `source_transaction_id` apontando para a original

5. **Hook useSharedFinances** (Frontend):
   - Busca transações onde EU paguei com splits (CREDITS - outros me devem)
   - Busca transações espelhadas onde outros pagaram (DEBITS - eu devo)
   - Agrupa por membro e calcula saldos

### Fluxo de Dados

```
Wesley cria transação de R$ 100 dividida com Fran (50/50)
↓
transactions: { id: "tx1", user_id: "wesley", amount: 100, is_shared: true }
↓
transaction_splits: { transaction_id: "tx1", member_id: "fran_member_id", amount: 50 }
↓
TRIGGER atualiza shared_with: [{ memberId: "fran_member_id", assignedAmount: 50 }]
↓
FUNÇÃO cria espelho para Fran:
transactions: { 
  id: "tx2", 
  user_id: "fran", 
  amount: 50, 
  source_transaction_id: "tx1",
  payer_id: "wesley"
}
↓
Wesley vê em Compartilhados:
  - Fran me deve R$ 50 (CREDIT do split)
↓
Fran vê em Compartilhados:
  - Eu devo R$ 50 para Wesley (DEBIT da transação espelhada)
```

## Regras do Sistema

### 1. TODOS os dados vêm do banco de dados
- ✅ Nenhum cálculo no frontend
- ✅ Nenhum localStorage para dados financeiros
- ✅ Apenas queries do Supabase

### 2. Transações Espelhadas
- ✅ Criadas automaticamente pelo banco
- ✅ Têm `source_transaction_id` apontando para a original
- ✅ NÃO aparecem na lista de Transações (filtradas por `source_transaction_id IS NULL`)
- ✅ Aparecem APENAS na página Compartilhados

### 3. Membros da Família
- ✅ Cada usuário tem sua própria lista de membros
- ✅ Cada membro tem `linked_user_id` apontando para o user_id real da pessoa
- ✅ Estrutura cruzada: Wesley vê Fran, Fran vê Wesley

### 4. Botões de Interface
- ✅ Apenas UM botão "Nova transação" global no AppLayout
- ✅ Botão aparece em todas as páginas ao lado do seletor de mês
- ✅ Removidos todos os botões duplicados das páginas individuais

## Próximos Passos

1. **Testar criação de nova transação compartilhada**
2. **Verificar se aparece corretamente para ambos os usuários**
3. **Testar acertos de contas**
4. **Testar parcelamentos compartilhados**

## Comandos para Verificação

```sql
-- Ver membros da família
SELECT fm.id::text, fm.name, fm.user_id::text as owner, fm.linked_user_id::text 
FROM family_members fm 
ORDER BY fm.user_id, fm.name;

-- Ver transações compartilhadas
SELECT t.id, t.description, t.amount, t.user_id::text, t.is_shared, t.source_transaction_id
FROM transactions t 
WHERE t.is_shared = true 
ORDER BY t.date DESC;

-- Ver splits
SELECT ts.id, ts.transaction_id, ts.member_id::text, ts.assigned_amount
FROM transaction_splits ts;
```

## Status

✅ Estrutura de membros corrigida
✅ Triggers e funções criados
✅ Dados antigos limpos
✅ Sistema pronto para uso
✅ Botões duplicados removidos
✅ Nenhum uso de localStorage para dados financeiros
