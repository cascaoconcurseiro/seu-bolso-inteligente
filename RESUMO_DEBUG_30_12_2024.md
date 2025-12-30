# Resumo de Debug - 30/12/2024

## 🎯 PROBLEMAS IDENTIFICADOS

### 1. Transações Compartilhadas Sem Splits
- **Sintoma:** Transações marcadas como compartilhadas não criam splits
- **Impacto:** Página "Compartilhados" não mostra as transações
- **Status:** 🔍 Em investigação

### 2. Convites de Viagens Não Aparecem
- **Sintoma:** Convite existe no banco mas não aparece na UI
- **Impacto:** Usuário não consegue aceitar convites
- **Status:** 🔍 Em investigação

---

## ✅ VERIFICAÇÕES REALIZADAS

### Banco de Dados
- ✅ Convite existe: `d25fd387-cef4-4287-aa10-4da55bacf246`
- ✅ Políticas RLS de `trip_invitations` estão corretas
- ✅ Transação de teste manual funciona (tem splits)
- ✅ Transações do frontend não têm splits

### Código
- ✅ `SplitModal` tem lógica de adicionar/remover membros
- ✅ `TransactionForm` passa splits para o hook
- ✅ `PendingTripInvitationsAlert` está adicionado à página
- ✅ Hook `usePendingTripInvitations` busca convites corretamente

---

## 🔧 AÇÕES TOMADAS

### 1. Logs Adicionados

**SplitModal.tsx:**
- Log quando `toggleSplitMember` é chamado
- Log quando membro é adicionado/removido
- Log quando splits são redistribuídos
- Log quando `setSplits` é chamado
- Log no render do componente

**TransactionForm.tsx:**
- Log no início do `handleSubmit`
- Log do estado atual dos splits
- Log dos splits processados
- Log dos dados da transação

**PendingTripInvitationsAlert.tsx:**
- Log no render do componente
- Log do estado de loading
- Log de erros
- Log quando não há convites
- Log quando há convites para renderizar

**useTripInvitations.ts:**
- Log ao buscar convites
- Log do user_id
- Log dos convites encontrados
- Log dos dados complementares
- Log dos dados enriquecidos
- Log de erros

### 2. Documentação Criada

- `INSTRUCOES_TESTE_DEBUG.md` - Instruções detalhadas para o usuário testar
- `RESUMO_DEBUG_30_12_2024.md` - Este arquivo

---

## 📊 DADOS DO BANCO

### Usuários
- Wesley: `56ccd60b-641f-4265-bc17-7b8705a2f8c9`
- Fran: `9545d0c1-94be-4b69-b110-f939bce072ee`

### Convite Pendente
```json
{
  "id": "d25fd387-cef4-4287-aa10-4da55bacf246",
  "trip_id": "898d43ff-c6cf-4135-b5b5-8f1df1962030",
  "inviter_id": "9545d0c1-94be-4b69-b110-f939bce072ee",
  "invitee_id": "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
  "status": "pending",
  "message": "Você foi convidado para participar da viagem \"Viagem ferias\"!",
  "created_at": "2025-12-30 20:16:52.779115+00"
}
```

### Transações Compartilhadas
```json
[
  {
    "id": "26e4e80d-6f81-4794-8c44-d5f9f7c7a1fd",
    "description": "uber",
    "amount": "100.00",
    "is_shared": true,
    "user_id": "9545d0c1-94be-4b69-b110-f939bce072ee",
    "date": "2025-12-30",
    "num_splits": 0  // ❌ SEM SPLITS
  },
  {
    "id": "f57e39ca-f5f5-4576-aaea-e2aa503cf906",
    "description": "Jantar compartilhado (TESTE)",
    "amount": "200.00",
    "is_shared": true,
    "user_id": "9545d0c1-94be-4b69-b110-f939bce072ee",
    "date": "2025-12-30",
    "num_splits": 1  // ✅ COM SPLITS (manual)
  },
  {
    "id": "01551916-9806-4f48-adc7-26ba2fcbeadb",
    "description": "teste compartilhado - wesley",
    "amount": "50.00",
    "is_shared": true,
    "user_id": "56ccd60b-641f-4265-bc17-7b8705a2f8c9",
    "date": "2025-12-30",
    "num_splits": 0  // ❌ SEM SPLITS
  }
]
```

### Políticas RLS de trip_invitations
```sql
-- SELECT: permite inviter_id OU invitee_id ver
(inviter_id = auth.uid()) OR (invitee_id = auth.uid())

-- UPDATE: permite invitee_id atualizar
(invitee_id = auth.uid())

-- DELETE: permite inviter_id OU invitee_id deletar
(inviter_id = auth.uid()) OR (invitee_id = auth.uid())

-- INSERT: permite inviter_id criar
(inviter_id = auth.uid())
```

---

## 🔍 HIPÓTESES

### Problema 1: Splits Não São Criados

**Possíveis Causas:**
1. Estado `splits` não está sendo atualizado no `SplitModal`
2. Estado `splits` é limpo antes de submeter
3. Problema de nomenclatura (`memberId` vs `member_id`)
4. Modal fecha antes de salvar o estado
5. Validação está limpando splits

**Como os logs vão ajudar:**
- Mostrar se `setSplits` está sendo chamado
- Mostrar o valor de `splits` no momento do submit
- Mostrar o formato exato dos splits
- Identificar onde o estado é perdido

### Problema 2: Convites Não Aparecem

**Possíveis Causas:**
1. Hook não está retornando dados (improvável - RLS está correto)
2. Componente não está renderizando
3. Erro silencioso na query
4. Dados não estão no formato esperado
5. Condição de renderização bloqueando

**Como os logs vão ajudar:**
- Mostrar se a query está retornando convites
- Mostrar se os dados estão sendo enriquecidos
- Mostrar se o componente está sendo renderizado
- Identificar qualquer erro que ocorrer

---

## 📝 PRÓXIMOS PASSOS

1. **Usuário testa e coleta logs** (ver `INSTRUCOES_TESTE_DEBUG.md`)
2. **Analisar logs** para identificar causa raiz
3. **Implementar correção** baseada nos logs
4. **Testar novamente** para confirmar
5. **Remover logs de debug** após confirmação

---

## 🎯 RESULTADO ESPERADO

Após a correção:

1. ✅ Criar transação compartilhada → splits são criados automaticamente
2. ✅ Transações compartilhadas aparecem na página "Compartilhados"
3. ✅ Convites de viagens aparecem na página "Viagens"
4. ✅ Aceitar convite → usuário é adicionado à viagem
5. ✅ Valores são calculados corretamente

---

## 📌 ARQUIVOS MODIFICADOS

- `src/components/transactions/SplitModal.tsx` - Logs adicionados
- `src/components/transactions/TransactionForm.tsx` - Logs adicionados
- `src/components/trips/PendingTripInvitationsAlert.tsx` - Logs adicionados
- `src/hooks/useTripInvitations.ts` - Logs adicionados
- `INSTRUCOES_TESTE_DEBUG.md` - Criado
- `RESUMO_DEBUG_30_12_2024.md` - Criado

---

**Data:** 30/12/2024  
**Commit:** `feat: adicionar logs detalhados para debug de splits e convites`  
**Status:** Aguardando testes do usuário
