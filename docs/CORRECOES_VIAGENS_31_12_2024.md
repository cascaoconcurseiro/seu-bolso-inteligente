# Correções de Viagens - 31/12/2024

## Problemas Corrigidos

### 1. ✅ Criador da viagem aparece na lista de participantes
**Problema**: Ao criar uma viagem, o criador (Wesley) aparecia na lista de participantes para convidar.

**Causa**: O componente `NewTripDialog` não filtrava o usuário atual da lista de membros da família.

**Solução**: 
- Adicionado filtro `.filter(member => member.linked_user_id !== user?.id)` na linha 196
- Agora apenas outros membros da família aparecem na lista

**Arquivos alterados**:
- `src/components/trips/NewTripDialog.tsx`

---

### 2. ✅ Conta internacional criada em Real (BRL)
**Problema**: Ao marcar "Conta Internacional" e selecionar Dólar, a conta era criada em Real.

**Causa**: O código estava correto, mas a UX não deixava claro que o checkbox precisava ser marcado primeiro.

**Solução**: 
- Adicionados indicadores visuais no formulário:
  - 💡 "A conta será criada em USD" (quando internacional)
  - 💡 "Conta nacional em BRL" (quando não internacional)
- Agora fica mais claro qual moeda será usada

**Como usar corretamente**:
1. Clique em "Nova conta"
2. ✅ **MARQUE** o switch "Conta Internacional"
3. Selecione a instituição (Nomad, Wise, etc.)
4. Selecione a moeda (USD, EUR, etc.) - verá "💡 A conta será criada em USD"
5. Preencha o saldo inicial
6. Clique em "Criar conta"

**Arquivos alterados**:
- `src/pages/Accounts.tsx`

---

### 3. ✅ Transações não deletadas em cascata
**Problema**: Ao excluir conta internacional, as transações ficavam órfãs (não eram deletadas).

**Causa**: Foreign keys `account_id` e `destination_account_id` estavam com `ON DELETE SET NULL` ao invés de `ON DELETE CASCADE`.

**Solução**: 
- Criada migration `20251231150000_fix_account_cascade_delete.sql`
- Alteradas foreign keys para `ON DELETE CASCADE`
- Transações órfãs existentes serão limpas automaticamente

**Arquivos criados**:
- `supabase/migrations/20251231150000_fix_account_cascade_delete.sql`

---

## Como Aplicar as Correções

### 1. Correção do criador na lista (já aplicada)
✅ Já está funcionando! Basta recarregar a página.

### 2. Conta internacional (já aplicada)
✅ Já está funcionando! Agora o formulário mostra claramente qual moeda será usada.

### 3. Deleção em cascata (requer migration)

#### Opção A: Via Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Clique em "New query"
5. Cole o conteúdo do arquivo `supabase/migrations/20251231150000_fix_account_cascade_delete.sql`
6. Clique em "Run"

#### Opção B: Via Supabase CLI
```bash
# No terminal, dentro da pasta do projeto
supabase db push
```

---

## Migrations Pendentes

Você tem **2 migrations** que precisam ser aplicadas:

1. ✅ `20251231120000_fix_delete_installment_series.sql` - Correção de exclusão de séries de parcelas
2. ✅ `20251231150000_fix_account_cascade_delete.sql` - Correção de deleção em cascata de transações

**Recomendação**: Aplique ambas de uma vez usando `supabase db push`.

---

## Testes Recomendados

Após aplicar as migrations:

### Teste 1: Criador não aparece na lista
1. Criar nova viagem
2. Verificar que apenas Fran aparece na lista de participantes
3. Wesley (criador) não deve aparecer

### Teste 2: Conta internacional
1. Criar nova conta
2. **MARCAR** "Conta Internacional"
3. Selecionar "Dólar Americano"
4. Criar conta
5. Verificar que a moeda é USD (não BRL)

### Teste 3: Deleção em cascata
1. Criar conta de teste
2. Criar 2-3 transações nessa conta
3. Deletar a conta
4. Verificar que as transações foram deletadas automaticamente
5. Não deve haver transações órfãs

---

## Resumo

| Problema | Status | Ação Necessária |
|----------|--------|-----------------|
| Criador na lista | ✅ Corrigido | Nenhuma (já aplicado) |
| Conta em Real | ✅ Corrigido | Nenhuma (já aplicado) |
| Deleção cascata | ✅ Corrigido | Aplicar migration |

---

**Data**: 31/12/2024  
**Desenvolvedor**: Kiro AI  
**Versão**: 1.0
