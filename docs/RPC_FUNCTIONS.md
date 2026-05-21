# RPC Functions Documentation

## settle_split()

### Descrição
Função RPC que liquida um split de despesa compartilhada de forma atômica. Marca o split como liquidado e cria uma transação de pagamento (INCOME) na conta especificada.

### Assinatura
```sql
settle_split(
  p_split_id UUID,
  p_account_id UUID,
  p_amount NUMERIC
) RETURNS JSON
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Obrigatório |
|-----------|------|-----------|------------|
| `p_split_id` | UUID | ID do split a ser liquidado | Sim |
| `p_account_id` | UUID | ID da conta onde registrar o pagamento | Sim |
| `p_amount` | NUMERIC | Valor do ressarcimento (em centavos) | Sim |

### Retorno

#### Sucesso (200 OK)
```json
{
  "success": true,
  "split_id": "uuid",
  "payment_transaction_id": "uuid",
  "amount": 100.00,
  "settled_at": "2026-01-06T22:02:49.000Z"
}
```

#### Erro
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

### Comportamento

#### 1. Validação
- Verifica se o split existe
- Verifica se o split já foi liquidado (previne duplicidade)
- Valida que a conta existe e pertence ao usuário autenticado

#### 2. Operações Atômicas
A função executa as seguintes operações em uma única transação:

1. **Criar Transação de Pagamento**
   - Tipo: INCOME
   - Descrição: "Ressarcimento de despesa compartilhada"
   - Valor: p_amount
   - Data: Data atual
   - Domínio: PERSONAL

2. **Atualizar Split**
   - `is_settled = true`
   - `settled_at = NOW()`
   - `settled_transaction_id = <ID da transação criada>`

3. **Atualizar Saldo da Conta**
   - `balance = balance + p_amount`

#### 3. Rollback em Falha
Se qualquer operação falhar, TODAS as mudanças são revertidas (all-or-nothing).

### Exemplos de Uso

#### TypeScript (Frontend)
```typescript
import { supabase } from '@/integrations/supabase/client';
import { callRPCWithRetry } from '@/utils/supabaseHelpers';

// Usando o helper com retry automático
const result = await callRPCWithRetry('settle_split', {
  p_split_id: '550e8400-e29b-41d4-a716-446655440000',
  p_account_id: '550e8400-e29b-41d4-a716-446655440001',
  p_amount: 100.00
});

if (result.success) {
  console.log('Split liquidado:', result.payment_transaction_id);
} else {
  console.error('Erro:', result.error);
}
```

#### SQL (Direto no Supabase)
```sql
SELECT settle_split(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  100.00::numeric
);
```

### Casos de Erro

| Erro | Causa | Solução |
|------|-------|---------|
| "Split não encontrado." | Split ID inválido ou não existe | Verificar ID do split |
| "Este split já foi liquidado." | Split já foi liquidado anteriormente | Verificar status do split |
| "Conta não encontrada ou não pertence ao usuário." | Account ID inválido ou não pertence ao usuário | Verificar ID da conta |
| "Valor deve ser maior que zero." | Amount <= 0 | Usar valor positivo |

### Propriedades Garantidas

#### Atomicidade
- Se a função retorna `success: true`, TODAS as operações foram completadas
- Se a função retorna `success: false`, NENHUMA mudança foi persistida

#### Idempotência
- Liquidar o mesmo split duas vezes retorna erro na segunda tentativa
- Não há efeitos colaterais de múltiplas tentativas

#### Precisão Financeira
- Usa NUMERIC(15,2) para precisão de centavos
- Sem erros de arredondamento em ponto flutuante

### Segurança

- **SECURITY DEFINER**: Executa com permissões do proprietário da função
- **RLS**: Respeita Row-Level Security policies
- **Autenticação**: Requer usuário autenticado (usa `auth.uid()`)

### Performance

- Operação atômica em uma única transação
- Sem N+1 queries
- Índices em `transaction_splits.id` e `accounts.id` otimizam lookups

### Relacionadas

- `settle_multiple_splits()` - Liquida múltiplos splits em uma transação
- `unsettle_split()` - Reverte uma liquidação
- `undo_shared_settlements()` - Reverte múltiplas liquidações

### Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-01-06 | 1.0 | Criação inicial da função |

### Testes

Veja `src/test/settle_split.test.ts` para testes abrangentes incluindo:
- Casos de sucesso
- Casos de erro
- Testes de atomicidade
- Casos extremos (valores muito grandes/pequenos)
- Validação de parâmetros
- Formato de resposta

Execute com:
```bash
npm test -- settle_split.test.ts
```

---

## unsettle_with_reversal()

### Descrição
Função RPC que reverte uma liquidação de split com registro de motivo e trilha de auditoria. Marca o split como não liquidado, remove a transação de pagamento, reverte o saldo da conta e cria um registro de reversão para auditoria.

### Assinatura
```sql
unsettle_with_reversal(
  p_split_id UUID,
  p_reversal_reason TEXT
) RETURNS JSON
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Obrigatório |
|-----------|------|-----------|------------|
| `p_split_id` | UUID | ID do split cuja liquidação será revertida | Sim |
| `p_reversal_reason` | TEXT | Motivo da reversão (para auditoria) | Sim |

### Retorno

#### Sucesso (200 OK)
```json
{
  "success": true,
  "split_id": "uuid",
  "original_transaction_id": "uuid",
  "payment_transaction_id": "uuid",
  "reverted_amount": 100.00,
  "reversal_reason": "Pagamento duplicado",
  "reversal_record_id": "uuid",
  "reverted_at": "2026-01-06T22:02:49.000Z",
  "account_id": "uuid"
}
```

#### Erro
```json
{
  "success": false,
  "error": "Mensagem de erro descritiva",
  "detail": "Detalhes técnicos do erro"
}
```

### Comportamento

#### 1. Validação
- Verifica se o split existe
- Verifica se o split foi liquidado (previne reversão dupla)
- Valida que o motivo da reversão não é vazio
- Valida que a transação de pagamento existe

#### 2. Operações Atômicas
A função executa as seguintes operações em uma única transação:

1. **Criar Registro de Auditoria**
   - Tabela: `settlement_reversals`
   - Campos: split_id, original_transaction_id, payment_transaction_id, amount, reversal_reason, reversed_by, reversed_at
   - Propósito: Manter trilha de auditoria imutável de todas as reversões

2. **Atualizar Split**
   - `is_settled = false`
   - `settled_at = NULL`
   - `settled_transaction_id = NULL`
   - `updated_at = NOW()`

3. **Deletar Transação de Pagamento**
   - Remove a transação INCOME criada durante a liquidação

4. **Reverter Saldo da Conta**
   - `balance = balance - reverted_amount`
   - `updated_at = NOW()`

5. **Atualizar Transação Original**
   - `updated_at = NOW()` (para refletir a mudança)

#### 3. Rollback em Falha
Se qualquer operação falhar, TODAS as mudanças são revertidas (all-or-nothing).

#### 4. Trilha de Auditoria
A tabela `settlement_reversals` mantém um registro imutável de:
- Qual split foi revertido
- Qual era o valor
- Qual foi o motivo
- Quem reverteu
- Quando foi revertido

### Exemplos de Uso

#### TypeScript (Frontend)
```typescript
import { supabase } from '@/integrations/supabase/client';
import { rpcWithRetry } from '@/utils/rpcWithRetry';

// Usando o helper com retry automático
const result = await rpcWithRetry('unsettle_with_reversal', {
  p_split_id: '550e8400-e29b-41d4-a716-446655440000',
  p_reversal_reason: 'Pagamento duplicado - liquidação incorreta'
});

if (result.success) {
  console.log('Reversão concluída:', result.reversal_record_id);
  console.log('Motivo registrado:', result.reversal_reason);
} else {
  console.error('Erro:', result.error);
}
```

#### SQL (Direto no Supabase)
```sql
SELECT unsettle_with_reversal(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Pagamento duplicado - liquidação incorreta'
);
```

### Casos de Erro

| Erro | Causa | Solução |
|------|-------|---------|
| "ID do split é obrigatório." | p_split_id é NULL | Fornecer UUID válido do split |
| "Motivo da reversão é obrigatório." | p_reversal_reason é vazio ou NULL | Fornecer motivo descritivo |
| "Split não encontrado." | Split ID inválido ou não existe | Verificar ID do split |
| "Este split não foi liquidado, portanto não pode ser revertido." | Split não está em estado liquidado | Verificar status do split |
| "Transação de pagamento não encontrada." | Referência de transação corrompida | Verificar integridade dos dados |

### Propriedades Garantidas

#### Atomicidade
- Se a função retorna `success: true`, TODAS as operações foram completadas
- Se a função retorna `success: false`, NENHUMA mudança foi persistida
- Não há estado intermediário possível

#### Idempotência
- Reverter o mesmo split duas vezes retorna erro na segunda tentativa
- Não há efeitos colaterais de múltiplas tentativas

#### Auditoria
- Cada reversão cria um registro imutável em `settlement_reversals`
- Registros de auditoria não podem ser modificados ou deletados (RLS policies)
- Trilha completa de quem, quando e por quê

#### Precisão Financeira
- Usa NUMERIC(15,2) para precisão de centavos
- Sem erros de arredondamento em ponto flutuante
- Saldo da conta é revertido exatamente

### Segurança

- **SECURITY DEFINER**: Executa com permissões do proprietário da função
- **RLS**: Respeita Row-Level Security policies
- **Autenticação**: Requer usuário autenticado (usa `auth.uid()`)
- **Auditoria**: Registra quem reverteu e quando
- **Imutabilidade**: Registros de auditoria não podem ser alterados

### Performance

- Operação atômica em uma única transação
- Sem N+1 queries
- Índices em `settlement_reversals` otimizam lookups de auditoria
- Índices em `transaction_splits.id` e `accounts.id` otimizam operações principais

### Relacionadas

- `settle_split()` - Liquida um split
- `settle_multiple_splits()` - Liquida múltiplos splits
- `unsettle_split()` - Reverte liquidação sem motivo (versão anterior)
- `unsettle_multiple_splits()` - Reverte múltiplas liquidações

### Histórico de Mudanças

| Data | Versão | Mudança |
|------|--------|---------|
| 2026-01-06 | 1.0 | Criação inicial com suporte a motivo e auditoria |

### Testes

Veja `src/test/unsettle_with_reversal.test.ts` para testes abrangentes incluindo:
- Casos de sucesso com diferentes motivos
- Casos de erro (split não encontrado, não liquidado, motivo vazio)
- Testes de atomicidade
- Verificação de trilha de auditoria
- Validação de parâmetros
- Formato de resposta
- Testes de RLS em registros de auditoria

Execute com:
```bash
npm test -- unsettle_with_reversal.test.ts
```

### Auditoria

Para visualizar histórico de reversões:

```sql
-- Ver todas as reversões de um split
SELECT * FROM settlement_reversals
WHERE split_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY reversed_at DESC;

-- Ver reversões por usuário
SELECT * FROM settlement_reversals
WHERE reversed_by = auth.uid()
ORDER BY reversed_at DESC;

-- Ver reversões por motivo
SELECT reversal_reason, COUNT(*) as count
FROM settlement_reversals
GROUP BY reversal_reason
ORDER BY count DESC;
```
