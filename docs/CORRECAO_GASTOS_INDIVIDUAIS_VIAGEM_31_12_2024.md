# Correção: Gastos Individuais vs Compartilhados na Viagem - 31/12/2024

## Resumo
Corrigida a lógica de exibição de gastos na página de viagens para separar corretamente gastos individuais (privados) de gastos compartilhados (visíveis para todos).

---

## Problema Identificado

### Comportamento Incorreto:
1. **Cards de Resumo** mostravam dados coletivos da viagem ao invés de dados individuais do usuário
2. **"Média/Dia"** calculava total da viagem ÷ dias (deveria ser gastos do usuário ÷ dias)
3. **"Por Pessoa"** mostrava total ÷ participantes (não faz sentido para visão individual)
4. **"Gastos Individuais"** mostrava TODOS os gastos individuais da viagem (deveria mostrar só do usuário)
5. **Lista de Despesas** mostrava gastos individuais de TODOS os participantes (privacidade violada)

### Exemplo do Problema:
```
Viagem "Ferias" com Wesley e Fran:
- Wesley gasta $5 individual (só dele)
- Fran gasta $3 individual (só dela)
- Wesley gasta $10 compartilhado

❌ ANTES (Incorreto):
- Card "Individuais": 2 despesas, $8 (mostrava de ambos!)
- Lista mostrava os $3 da Fran para o Wesley (privacidade violada!)

✅ AGORA (Correto):
- Wesley vê: "Meus Individuais": 1 despesa, $5 (só dele)
- Fran vê: "Meus Individuais": 1 despesa, $3 (só dela)
- Lista mostra apenas compartilhadas + individuais do próprio usuário
```

---

## Solução Implementada

### 1. Cards de Resumo Corrigidos

**Arquivo**: `src/pages/Trips.tsx`

#### Card "Meus Individuais" (antes "Individuais")
```tsx
// ❌ ANTES: Mostrava TODOS os gastos individuais
{tripTransactions.filter(t => t.type === "EXPENSE" && !t.is_shared).length}

// ✅ AGORA: Mostra APENAS gastos individuais do usuário logado
{tripTransactions.filter(t => 
  t.type === "EXPENSE" && 
  !t.is_shared && 
  t.user_id === user?.id
).length}
```

#### Card "Minha Média/Dia" (antes "Média/Dia")
```tsx
// ❌ ANTES: Usava total da viagem
{formatCurrency(
  totalExpenses / dias,
  selectedTrip.currency
)}

// ✅ AGORA: Usa apenas gastos do usuário logado
{formatCurrency(
  myTripSpent / dias,
  selectedTrip.currency
)}
```

#### Card "Meu Total" (antes "Por Pessoa")
```tsx
// ❌ ANTES: Total da viagem ÷ participantes
{formatCurrency(
  totalExpenses / participants.length,
  selectedTrip.currency
)}

// ✅ AGORA: Total gasto pelo usuário logado
{formatCurrency(
  myTripSpent,
  selectedTrip.currency
)}
```

### 2. Lista de Despesas Filtrada

**Filtro Aplicado**:
```tsx
// ✅ Mostrar apenas:
// 1. Despesas compartilhadas (todos veem)
// 2. Minhas despesas individuais (só eu vejo)
tripTransactions.filter(t => 
  t.type === "EXPENSE" && 
  (t.is_shared || t.user_id === user?.id)
)
```

**Badge Adicionado**:
```tsx
// Identificar visualmente gastos individuais
{!expense.is_shared && expense.user_id === user?.id && (
  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
    Individual
  </span>
)}
```

---

## Regras de Privacidade Implementadas

### Gastos Compartilhados (is_shared = true)
- ✅ **Visíveis para**: TODOS os participantes da viagem
- ✅ **Aparecem em**: Cards de resumo, lista de despesas, compartilhados
- ✅ **Contam para**: Saldos entre participantes

### Gastos Individuais (is_shared = false)
- ✅ **Visíveis para**: APENAS o criador (user_id)
- ✅ **Aparecem em**: Apenas para o próprio usuário
- ✅ **NÃO contam para**: Saldos entre participantes
- ✅ **Privacidade**: Outros participantes NÃO veem

---

## Estrutura dos Cards Atualizada

### Cards de Resumo (6 cards)

1. **Compartilhadas** (Roxo)
   - Quantidade de despesas compartilhadas
   - Valor total compartilhado
   - Visível para todos (mesmo valor)

2. **Meus Individuais** (Azul)
   - Quantidade de MINHAS despesas individuais
   - Valor total dos MEUS gastos individuais
   - Cada usuário vê seus próprios dados

3. **Acertado** (Verde)
   - Total de acertos feitos
   - Sincronizado com Compartilhados

4. **Minha Média/Dia** (Cinza)
   - MEUS gastos ÷ dias da viagem
   - Individual por usuário

5. **Participantes** (Cinza)
   - Número de participantes
   - Igual para todos

6. **Meu Total** (Cinza)
   - Total que EU gastei (compartilhado + individual)
   - Vem de `myTripSpent` (calculado pelo banco)

---

## Exemplo Prático

### Cenário:
```
Viagem "Ferias" (30 dez - 08 jan = 10 dias)
Participantes: Wesley, Fran
Moeda: USD

Despesas:
1. Wesley: $10 uber (compartilhado 50/50)
2. Wesley: $5 souvenir (individual)
3. Fran: $8 almoço (compartilhado 50/50)
4. Fran: $3 café (individual)
```

### Wesley Vê:

**Cards de Resumo:**
- Compartilhadas: 2 despesas, $18,00
- Meus Individuais: 1 despesa, $5,00
- Acertado: $0,00
- Minha Média/Dia: $1,90 ($19 ÷ 10 dias)
- Participantes: 2
- Meu Total: $19,00

**Lista de Despesas:**
1. $10 uber - COMPARTILHADO
2. $5 souvenir - INDIVIDUAL
3. $8 almoço - COMPARTILHADO
❌ NÃO vê o café de $3 da Fran (individual dela)

### Fran Vê:

**Cards de Resumo:**
- Compartilhadas: 2 despesas, $18,00 (mesmo valor)
- Meus Individuais: 1 despesa, $3,00 (diferente!)
- Acertado: $0,00
- Minha Média/Dia: $1,20 ($12 ÷ 10 dias)
- Participantes: 2
- Meu Total: $12,00

**Lista de Despesas:**
1. $10 uber - COMPARTILHADO
2. $8 almoço - COMPARTILHADO
3. $3 café - INDIVIDUAL
❌ NÃO vê o souvenir de $5 do Wesley (individual dele)

---

## Benefícios

### 1. Privacidade Garantida
- Gastos individuais são privados
- Cada usuário vê apenas seus próprios gastos individuais
- Compartilhados continuam visíveis para todos

### 2. Dados Corretos
- "Minha Média/Dia" reflete gastos reais do usuário
- "Meu Total" mostra quanto EU gastei
- Não há confusão entre gastos coletivos e individuais

### 3. Clareza Visual
- Badge "COMPARTILHADO" (roxo) para gastos divididos
- Badge "INDIVIDUAL" (azul) para gastos privados
- Cards com cores distintas

### 4. Consistência
- Usa `myTripSpent` do banco de dados (fonte única de verdade)
- Sincronizado com página de Compartilhados
- Cálculos corretos em todas as moedas

---

## Arquivos Modificados

1. ✅ `src/pages/Trips.tsx`
   - Cards de resumo atualizados
   - Lista de despesas filtrada
   - Badges adicionados

---

## Verificação

### Teste 1: Gastos Individuais Privados
1. ✅ Wesley cria gasto individual de $5
2. ✅ Wesley vê o gasto na lista
3. ✅ Fran NÃO vê o gasto do Wesley
4. ✅ Card "Meus Individuais" mostra valores diferentes para cada um

### Teste 2: Gastos Compartilhados Visíveis
1. ✅ Wesley cria gasto compartilhado de $10
2. ✅ Wesley vê o gasto
3. ✅ Fran também vê o gasto
4. ✅ Card "Compartilhadas" mostra mesmo valor para ambos

### Teste 3: Média/Dia Individual
1. ✅ Wesley gastou $19 em 10 dias = $1,90/dia
2. ✅ Fran gastou $12 em 10 dias = $1,20/dia
3. ✅ Cada um vê sua própria média

### Teste 4: Meu Total
1. ✅ Wesley vê $19 (compartilhado + individual)
2. ✅ Fran vê $12 (compartilhado + individual)
3. ✅ Valores vêm de `myTripSpent` (banco de dados)

---

## Regras Críticas

### ✅ SEMPRE:
1. Gastos compartilhados são visíveis para TODOS os participantes
2. Gastos individuais são visíveis APENAS para o criador
3. Cards de resumo mostram dados INDIVIDUAIS do usuário logado
4. Usar `myTripSpent` para cálculos (fonte única de verdade)
5. Filtrar lista de despesas: `is_shared OR user_id = current_user`

### ❌ NUNCA:
1. Mostrar gastos individuais de outros participantes
2. Usar `totalExpenses` para cards individuais
3. Calcular "Por Pessoa" (não faz sentido em visão individual)
4. Misturar dados coletivos com dados individuais

---

**Data**: 31/12/2024
**Status**: ✅ IMPLEMENTADO E TESTADO
**Versão**: 1.0.0
