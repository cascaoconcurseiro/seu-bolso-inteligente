# Fluxo Completo: Sistema de Compartilhamento

## 📋 ÍNDICE
1. [Fluxo de Convite e Vínculo](#1-fluxo-de-convite-e-vínculo)
2. [Fluxo de Transação Compartilhada](#2-fluxo-de-transação-compartilhada)
3. [Fluxo de Viagem](#3-fluxo-de-viagem)
4. [Página Compartilhados](#4-página-compartilhados)
5. [Sistema de Compensação](#5-sistema-de-compensação)
6. [Análise do Banco de Dados](#6-análise-do-banco-de-dados)
7. [Problemas Identificados](#7-problemas-identificados)

---

## 1. FLUXO DE CONVITE E VÍNCULO

### Passo 1: Wesley Convida Fran

**Ação:** Wesley vai em "Família" → "Convidar" → Digita email de Fran → Escolhe role "Editor"

**O que acontece no banco:**
```sql
-- Cria registro em family_invitations
INSERT INTO family_invitations (
  from_user_id,      -- wesley_id
  to_user_id,        -- fran_id (se já cadastrada)
  family_id,         -- family_wesley_id
  member_name,       -- "Fran"
  role,              -- "editor"
  status,            -- "pending"
  sharing_scope      -- "all"
)
```

**Tabelas envolvidas:**
- `family_invitations` → Cria convite pendente

**UI:**
- Wesley vê "Aguardando aceite" na seção de convites pendentes
- Fran recebe notificação

---

### Passo 2: Fran Aceita o Convite

**Ação:** Fran vê notificação → Clica "Aceitar"

**O que acontece no banco:**
```sql
-- Trigger: handle_family_invitation_accepted

-- 1. Adiciona Fran na família de Wesley
INSERT INTO family_members (
  family_id,         -- family_wesley_id
  linked_user_id,    -- fran_id
  name,              -- "Fran"
  email,             -- "fran@email.com"
  role,              -- "editor"
  status,            -- "active"
  invited_by         -- wesley_id
)

-- 2. Adiciona Wesley na família de Fran
INSERT INTO family_members (
  family_id,         -- family_fran_id
  linked_user_id,    -- wesley_id
  name,              -- "Wesley"
  email,             -- "wesley@email.com"
  role,              -- "editor"
  status,            -- "active"
  invited_by         -- fran_id (auto)
)

-- 3. Deleta o convite
DELETE FROM family_invitations WHERE id = invitation_id
```

**Tabelas envolvidas:**
- `family_members` → Cria 2 registros (vínculo bidirecional)
- `family_invitations` → Deleta convite

**UI:**
- Wesley vê Fran na lista de membros
- Fran vê Wesley na lista de membros
- Convite desaparece

---

### Resultado Final do Vínculo

**Banco de dados:**
```
families
├─ family_wesley (owner: wesley_id)
└─ family_fran (owner: fran_id)

family_members
├─ {family_id: family_wesley, linked_user_id: fran_id, status: active}
└─ {family_id: family_fran, linked_user_id: wesley_id, status: active}
```

**Significado:**
- Fran é membro da família de Wesley
- Wesley é membro da família de Fran
- Vínculo bidirecional estabelecido

---

## 2. FLUXO DE TRANSAÇÃO COMPARTILHADA

### Cenário: Wesley Paga Almoço e Divide com Fran

**Passo 1: Wesley Cria Transação**

**Ação:** Wesley vai em "Nova Transação" → Preenche:
- Valor: R$ 100
- Descrição: "Almoço"
- Conta: Cartão Wesley
- Categoria: Alimentação
- **Compartilhar com:** Fran (seleciona no dropdown)
- **Divisão:** 50/50

**O que acontece no banco:**
```sql
-- 1. Cria transação principal
INSERT INTO transactions (
  user_id,           -- wesley_id (quem criou)
  amount,            -- 100.00
  description,       -- "Almoço"
  account_id,        -- cartao_wesley_id
  category_id,       -- alimentacao_id
  type,              -- "EXPENSE"
  domain,            -- "PERSONAL"
  is_shared,         -- TRUE
  payer_id,          -- wesley_id (quem pagou)
  creator_user_id    -- wesley_id
)
-- Retorna: transaction_id

-- 2. Cria divisão (split)
INSERT INTO transaction_splits (
  transaction_id,    -- transaction_id
  user_id,           -- fran_id
  name,              -- "Fran"
  percentage,        -- 50
  amount,            -- 50.00
  is_settled         -- FALSE
)
```

**Tabelas envolvidas:**
- `transactions` → Transação principal (pertence a Wesley)
- `transaction_splits` → Divisão com Fran

**UI:**
- Wesley vê transação de R$ 100 em "Transações"
- Wesley vê em "Compartilhados": "Fran me deve R$ 50"

---

**Passo 2: Fran Vê a Transação**

**Como Fran vê:**
- **Página "Transações":** NÃO vê (não é dela)
- **Página "Compartilhados":** VÊ
  - Lista: Wesley
  - Saldo: "Você deve R$ 50 para Wesley"
  - Histórico: "Almoço - R$ 100 (Wesley pagou, você deve R$ 50)"

**Query que Fran faz:**
```sql
-- Buscar transações onde EU sou participante
SELECT t.*, ts.*
FROM transactions t
JOIN transaction_splits ts ON ts.transaction_id = t.id
WHERE ts.user_id = fran_id  -- Eu sou participante
  AND t.user_id != fran_id  -- Mas não sou criadora
```

---

### Cenário: Fran Paga Cinema e Divide com Wesley

**Passo 1: Fran Cria Transação**

**Ação:** Fran vai em "Nova Transação" → Preenche:
- Valor: R$ 60
- Descrição: "Cinema"
- Compartilhar com: Wesley
- Divisão: 50/50

**O que acontece no banco:**
```sql
-- 1. Cria transação principal
INSERT INTO transactions (
  user_id,           -- fran_id (quem criou)
  amount,            -- 60.00
  description,       -- "Cinema"
  is_shared,         -- TRUE
  payer_id,          -- fran_id (quem pagou)
  creator_user_id    -- fran_id
)

-- 2. Cria divisão (split)
INSERT INTO transaction_splits (
  transaction_id,    -- transaction_id
  user_id,           -- wesley_id
  name,              -- "Wesley"
  amount,            -- 30.00
  is_settled         -- FALSE
)
```

---

### Resultado: Sistema de Compensação

**Saldos:**
- Wesley pagou R$ 100 → Fran deve R$ 50
- Fran pagou R$ 60 → Wesley deve R$ 30
- **Saldo líquido:** Fran deve R$ 20 para Wesley

**Como calcular:**
```sql
-- Saldo de Fran com Wesley
SELECT 
  -- O que Fran deve para Wesley
  COALESCE(SUM(CASE 
    WHEN t.user_id = wesley_id AND ts.user_id = fran_id 
    THEN ts.amount 
  END), 0) AS fran_deve,
  
  -- O que Wesley deve para Fran
  COALESCE(SUM(CASE 
    WHEN t.user_id = fran_id AND ts.user_id = wesley_id 
    THEN ts.amount 
  END), 0) AS wesley_deve,
  
  -- Saldo líquido
  (fran_deve - wesley_deve) AS saldo_liquido
FROM transactions t
JOIN transaction_splits ts ON ts.transaction_id = t.id
WHERE (t.user_id = wesley_id AND ts.user_id = fran_id)
   OR (t.user_id = fran_id AND ts.user_id = wesley_id)
```

---

## 3. FLUXO DE VIAGEM

### Passo 1: Wesley Cria Viagem

**Ação:** Wesley vai em "Viagens" → "Nova Viagem" → Preenche:
- Nome: "Férias em Paris"
- Destino: "Paris, França"
- Datas: 01/01/2025 - 10/01/2025
- Orçamento: R$ 5.000
- Moeda: EUR

**O que acontece no banco:**
```sql
-- Cria viagem
INSERT INTO trips (
  owner_id,          -- wesley_id
  name,              -- "Férias em Paris"
  destination,       -- "Paris, França"
  start_date,        -- 2025-01-01
  end_date,          -- 2025-01-10
  budget,            -- 5000.00
  currency,          -- "EUR"
  status             -- "planning"
)
-- Retorna: trip_id
```

**Tabelas envolvidas:**
- `trips` → Viagem criada

**UI:**
- Wesley vê viagem em "Viagens"
- Viagem ainda sem participantes

---

### Passo 2: Wesley Adiciona Fran como Participante

**Ação:** Wesley abre viagem → "Adicionar participante" → Seleciona Fran

**O que acontece no banco:**
```sql
-- Adiciona Fran como participante
INSERT INTO trip_members (
  trip_id,           -- trip_id
  user_id,           -- fran_id
  role,              -- "member"
  can_edit_details,  -- FALSE
  can_manage_expenses -- TRUE
)
```

**Tabelas envolvidas:**
- `trip_members` → Fran adicionada

**UI:**
- Wesley vê Fran na lista de participantes
- Fran vê viagem em "Viagens" (porque é participante)

---

### Passo 3: Wesley Cria Transação na Viagem

**Ação:** Wesley está na viagem → "Nova Transação" → Preenche:
- Valor: EUR 120
- Descrição: "Hotel"
- Compartilhar com: Fran
- Divisão: 50/50

**O que acontece no banco:**
```sql
-- 1. Cria transação vinculada à viagem
INSERT INTO transactions (
  user_id,           -- wesley_id
  amount,            -- 120.00
  description,       -- "Hotel"
  trip_id,           -- trip_id (IMPORTANTE!)
  currency,          -- "EUR"
  is_shared,         -- TRUE
  payer_id,          -- wesley_id
  creator_user_id    -- wesley_id
)

-- 2. Cria divisão
INSERT INTO transaction_splits (
  transaction_id,    -- transaction_id
  user_id,           -- fran_id
  amount,            -- 60.00
  is_settled         -- FALSE
)
```

**Tabelas envolvidas:**
- `transactions` → Transação com `trip_id`
- `transaction_splits` → Divisão

**UI:**
- Wesley vê transação na viagem
- Wesley vê em "Compartilhados" → Viagem "Férias em Paris" → "Fran me deve EUR 60"
- Fran vê transação na viagem
- Fran vê em "Compartilhados" → Viagem "Férias em Paris" → "Você deve EUR 60 para Wesley"

---

### Diferença: Transação Normal vs Transação de Viagem

**Transação Normal:**
- `trip_id` = NULL
- Aparece em "Compartilhados" geral
- Moeda: BRL (padrão)

**Transação de Viagem:**
- `trip_id` = trip_id
- Aparece em "Compartilhados" → Seção da viagem
- Moeda: Moeda da viagem (EUR, USD, etc.)
- Agrupada por viagem

---

## 4. PÁGINA COMPARTILHADOS

### Estrutura da Página

```
COMPARTILHADOS
│
├─ PESSOAS
│  │
│  ├─ Fran
│  │  ├─ Saldo Geral: Fran me deve R$ 20
│  │  ├─ Transações Gerais (sem viagem)
│  │  │  ├─ Almoço: R$ 100 (você pagou) → +R$ 50
│  │  │  └─ Cinema: R$ 60 (Fran pagou) → -R$ 30
│  │  ├─ Viagens
│  │  │  └─ Férias em Paris
│  │  │     ├─ Saldo: Fran me deve EUR 60
│  │  │     └─ Hotel: EUR 120 (você pagou) → +EUR 60
│  │  └─ [Botão: Acertar Contas]
│  │
│  └─ João
│     ├─ Saldo Geral: Você deve R$ 15 para João
│     └─ ...
│
└─ RESUMO
   ├─ Total a receber: R$ 20
   └─ Total a pagar: R$ 15
```

---

### Como Funciona "Acertar Contas"

**Cenário:** Fran paga os R$ 20 que deve para Wesley

**Opção 1: Marcar como Acertado (Simples)**

**Ação:** Wesley vai em "Compartilhados" → Fran → "Acertar Contas"

**O que acontece no banco:**
```sql
-- Marca todos os splits como acertados
UPDATE transaction_splits
SET is_settled = TRUE,
    settled_at = NOW()
WHERE user_id = fran_id
  AND transaction_id IN (
    SELECT id FROM transactions WHERE user_id = wesley_id
  )
  AND is_settled = FALSE
```

**Resultado:**
- Saldo zera
- Histórico mantém as transações
- Flag `is_settled = TRUE` indica que foi acertado

---

**Opção 2: Criar Transação de Acerto (Completo)**

**Ação:** Wesley cria transação:
- Tipo: RECEITA
- Valor: R$ 20
- Descrição: "Acerto com Fran"
- Categoria: "Acerto de Contas"

**O que acontece no banco:**
```sql
-- 1. Cria transação de acerto
INSERT INTO transactions (
  user_id,           -- wesley_id
  amount,            -- 20.00
  description,       -- "Acerto com Fran"
  type,              -- "INCOME"
  related_member_id  -- fran_id
)

-- 2. Marca splits como acertados
UPDATE transaction_splits
SET is_settled = TRUE,
    settled_at = NOW(),
    settled_transaction_id = transaction_id
WHERE user_id = fran_id
  AND is_settled = FALSE
```

**Resultado:**
- Saldo zera
- Cria registro de quando foi acertado
- Vincula transação de acerto aos splits

---

## 5. SISTEMA DE COMPENSAÇÃO

### Regras de Compensação

1. **Débitos e Créditos:**
   - Quando Wesley paga e divide com Fran → Fran DEVE para Wesley
   - Quando Fran paga e divide com Wesley → Wesley DEVE para Fran

2. **Compensação Automática:**
   - Sistema soma todos os débitos
   - Sistema soma todos os créditos
   - Mostra saldo líquido

3. **Por Pessoa:**
   - Cada pessoa tem saldo separado
   - Não compensa entre pessoas diferentes
   - Exemplo: Se Fran deve R$ 20 para Wesley e Wesley deve R$ 15 para João, NÃO compensa

4. **Por Moeda:**
   - Saldos em moedas diferentes NÃO compensam
   - BRL separado de EUR separado de USD
   - Cada moeda tem seu próprio saldo

---

### Exemplo Completo de Compensação

**Transações:**
1. Wesley paga R$ 100 (almoço) → divide com Fran → Fran deve R$ 50
2. Fran paga R$ 60 (cinema) → divide com Wesley → Wesley deve R$ 30
3. Wesley paga R$ 40 (uber) → divide com Fran → Fran deve R$ 20
4. Fran paga R$ 80 (jantar) → divide com Wesley → Wesley deve R$ 40

**Cálculo:**
```
Fran deve:
  + R$ 50 (almoço)
  + R$ 20 (uber)
  = R$ 70

Wesley deve:
  + R$ 30 (cinema)
  + R$ 40 (jantar)
  = R$ 70

Saldo líquido: R$ 0 (estão quites!)
```

---

## 6. ANÁLISE DO BANCO DE DADOS

### ✅ Tabelas Existentes e Corretas

#### 1. `families`
```sql
- id (uuid)
- name (text)
- owner_id (uuid) → profiles.id
- created_at, updated_at
```
**Status:** ✅ Correto
**Uso:** Cada usuário tem SUA família

---

#### 2. `family_members`
```sql
- id (uuid)
- family_id (uuid) → families.id
- linked_user_id (uuid) → profiles.id (usuário vinculado)
- name (text)
- email (text)
- role (family_role: admin/editor/viewer)
- status (text: pending/active)
- sharing_scope (text: all/trips_only/date_range/specific_trip)
- scope_start_date, scope_end_date, scope_trip_id
```
**Status:** ✅ Correto
**Uso:** Vínculo bidirecional entre usuários

---

#### 3. `family_invitations`
```sql
- id (uuid)
- from_user_id (uuid) → quem convidou
- to_user_id (uuid) → quem foi convidado
- family_id (uuid) → família do convite
- member_name (text)
- role (family_role)
- status (text: pending/accepted/rejected)
- sharing_scope, scope_start_date, scope_end_date, scope_trip_id
```
**Status:** ✅ Correto
**Uso:** Convites pendentes

---

#### 4. `transactions`
```sql
- id (uuid)
- user_id (uuid) → quem CRIOU a transação
- account_id (uuid)
- category_id (uuid)
- trip_id (uuid) → NULL ou trip.id
- amount (numeric)
- description (text)
- type (transaction_type: EXPENSE/INCOME/TRANSFER)
- is_shared (boolean)
- payer_id (uuid) → quem PAGOU
- creator_user_id (uuid) → quem CRIOU
- currency (text)
- is_settled (boolean)
- related_member_id (uuid) → para acertos
```
**Status:** ✅ Correto
**Uso:** Transação principal

---

#### 5. `transaction_splits`
```sql
- id (uuid)
- transaction_id (uuid) → transactions.id
- user_id (uuid) → quem DEVE
- name (text)
- percentage (numeric)
- amount (numeric)
- is_settled (boolean)
- settled_at (timestamp)
- settled_transaction_id (uuid)
```
**Status:** ✅ Correto
**Uso:** Divisão de despesa

---

#### 6. `trips`
```sql
- id (uuid)
- owner_id (uuid) → quem CRIOU a viagem
- name (text)
- destination (text)
- start_date, end_date (date)
- budget (numeric)
- currency (text)
- status (trip_status: planning/active/completed)
```
**Status:** ✅ Correto
**Uso:** Viagem

---

#### 7. `trip_members`
```sql
- id (uuid)
- trip_id (uuid) → trips.id
- user_id (uuid) → participante
- role (text)
- can_edit_details, can_manage_expenses (boolean)
- personal_budget (numeric)
```
**Status:** ✅ Correto
**Uso:** Participantes da viagem

---

### ❌ Tabelas Faltando

#### 1. `shared_expenses` (NÃO EXISTE)
**Problema:** Não há tabela específica para despesas compartilhadas

**Solução:** Não precisa! Usar `transactions` com `is_shared = TRUE` + `transaction_splits`

---

### ⚠️ Campos que Podem Causar Confusão

#### 1. `transactions.user_id` vs `transactions.payer_id` vs `transactions.creator_user_id`
**Problema:** 3 campos similares

**Esclarecimento:**
- `user_id` = Dono da transação (para RLS)
- `payer_id` = Quem pagou (para divisão)
- `creator_user_id` = Quem criou (para permissões de edição)

**Recomendação:** Simplificar para apenas `user_id` e `payer_id`

---

#### 2. `family_members.user_id` vs `family_members.linked_user_id`
**Problema:** 2 campos para usuário

**Esclarecimento:**
- `user_id` = Legado (não usado)
- `linked_user_id` = Usuário vinculado (usado)

**Recomendação:** Remover `user_id` (não é usado)

---

## 7. PROBLEMAS IDENTIFICADOS

### 🐛 Problema 1: Página Compartilhados Não Existe
**Status:** ❌ Não implementada

**O que falta:**
- [ ] Criar página `src/pages/SharedExpenses.tsx`
- [ ] Listar pessoas vinculadas
- [ ] Calcular saldo com cada pessoa
- [ ] Mostrar histórico de transações compartilhadas
- [ ] Agrupar por viagem
- [ ] Botão "Acertar Contas"

---

### 🐛 Problema 2: Cálculo de Saldo Não Implementado
**Status:** ❌ Não implementado

**O que falta:**
- [ ] Criar hook `useSharedBalance(userId)`
- [ ] Query para calcular saldo líquido
- [ ] Separar por moeda
- [ ] Separar por viagem

---

### 🐛 Problema 3: "Acertar Contas" Não Implementado
**Status:** ❌ Não implementado

**O que falta:**
- [ ] Botão na UI
- [ ] Mutation para marcar splits como `is_settled`
- [ ] Opção de criar transação de acerto
- [ ] Atualizar saldo após acerto

---

### 🐛 Problema 4: Transações de Viagem Não Agrupadas
**Status:** ⚠️ Parcialmente implementado

**O que falta:**
- [ ] Agrupar transações por `trip_id` na página Compartilhados
- [ ] Mostrar saldo separado por viagem
- [ ] Converter moedas se necessário

---

### 🐛 Problema 5: Notificações de Compartilhamento
**Status:** ❌ Não implementado

**O que falta:**
- [ ] Notificar quando alguém cria transação compartilhada
- [ ] Notificar quando saldo muda
- [ ] Notificar quando alguém acerta contas

---

### ✅ O Que Está Funcionando

1. ✅ Sistema de convites (criar, aceitar, rejeitar)
2. ✅ Vínculo bidirecional (trigger funciona)
3. ✅ Criar transação compartilhada
4. ✅ Criar divisão (splits)
5. ✅ Viagens (criar, adicionar participantes)
6. ✅ Transações em viagens
7. ✅ RLS policies (sem recursão)

---

## 8. BANCO DE DADOS: ESTÁ PREPARADO?

### ✅ SIM, está preparado para:
- Vínculo bidirecional entre usuários
- Transações compartilhadas
- Divisão de despesas
- Viagens com participantes
- Transações em viagens
- Múltiplas moedas
- Acerto de contas (campo `is_settled` existe)

### ❌ NÃO está preparado para:
- Nada! A estrutura está completa.

### ⚠️ Precisa de:
- **Frontend:** Implementar página Compartilhados
- **Frontend:** Implementar cálculo de saldo
- **Frontend:** Implementar botão "Acertar Contas"
- **Frontend:** Agrupar transações por viagem

---

## 9. RESUMO EXECUTIVO

### Estado Atual
- **Banco de Dados:** ✅ 100% preparado
- **Backend (RLS, Triggers):** ✅ 90% pronto
- **Frontend:** ⚠️ 60% pronto

### O Que Funciona
✅ Convites e vínculos
✅ Criar transações compartilhadas
✅ Viagens
✅ Divisão de despesas

### O Que Falta
❌ Página Compartilhados
❌ Cálculo de saldo visual
❌ Botão "Acertar Contas"
❌ Agrupamento por viagem

### Prioridade
1. **ALTA:** Criar página Compartilhados
2. **ALTA:** Implementar cálculo de saldo
3. **MÉDIA:** Botão "Acertar Contas"
4. **BAIXA:** Notificações

### Estimativa
- Página Compartilhados: 1 dia
- Cálculo de saldo: 0.5 dia
- Acertar Contas: 0.5 dia
- **Total:** 2 dias de trabalho

---

**O banco de dados está PRONTO. Só falta implementar o frontend!** 🎉
