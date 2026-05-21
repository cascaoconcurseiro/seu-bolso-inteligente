# Fluxo Completo, Lógica e Regras de Negócio - Seu Bolso Inteligente

## 1. VISÃO GERAL DO SISTEMA

**Seu Bolso Inteligente** é um sistema de gerenciamento financeiro pessoal para famílias que:
- Gerenciam múltiplas contas (corrente, poupança, cartão de crédito, investimento, caixa, fundo de emergência)
- Compartilham despesas entre membros
- Rastreiam parcelamentos e transações recorrentes
- Liquidam despesas compartilhadas com ressarcimentos

**Princípio Fundamental: Single Source of Truth (SSOT)**
- Todos os cálculos financeiros são feitos NO BANCO DE DADOS, nunca no frontend
- O frontend apenas exibe dados já calculados
- Isso garante consistência e evita erros de sincronização

---

## 2. MODELOS DE DADOS PRINCIPAIS

### 2.1 Contas (Accounts)

```
accounts {
  id: UUID
  user_id: UUID (proprietário)
  name: string
  type: CHECKING | SAVINGS | CREDIT_CARD | INVESTMENT | CASH | EMERGENCY_FUND
  currency: string (BRL, USD, EUR, etc)
  balance: decimal (calculado via triggers, nunca atualizado diretamente)
  is_active: boolean (soft delete)
  deleted: boolean (hard delete)
  
  # Cartão de crédito específico
  closing_day: integer (dia do fechamento, ex: 10)
  due_day: integer (dia do vencimento, ex: 20)
  bank_id: UUID (opcional, para integração bancária futura)
}
```

**Tipos de Conta:**
- **CHECKING**: Conta corrente
- **SAVINGS**: Poupança
- **CREDIT_CARD**: Cartão de crédito
- **INVESTMENT**: Investimentos
- **CASH**: Dinheiro em mão
- **EMERGENCY_FUND**: Fundo de emergência

**Regras:**
- Saldo é SEMPRE calculado via trigger (soma de transações)
- Nunca atualizar saldo diretamente
- Soft delete: `is_active=false, deleted=false` (arquivo)
- Hard delete: `deleted=true` (permanente)

---

### 2.2 Transações (Transactions)

```
transactions {
  id: UUID
  user_id: UUID (criador)
  creator_user_id: UUID (rastreia quem criou)
  account_id: UUID (conta de origem)
  destination_account_id: UUID (para transferências)
  category_id: UUID
  trip_id: UUID (para transações de viagem)
  
  amount: decimal (sempre positivo)
  description: string
  date: DATE (data da transação)
  competence_date: DATE (YYYY-MM-01, data de competência para agrupamento)
  
  type: EXPENSE | INCOME | TRANSFER
  currency: string (moeda da transação)
  domain: PERSONAL | SHARED | TRAVEL
  
  # Compartilhamento
  is_shared: boolean
  payer_id: UUID (quem pagou por outros)
  
  # Parcelamento
  is_installment: boolean
  current_installment: integer (1, 2, 3...)
  total_installments: integer (total de parcelas)
  series_id: UUID (agrupa parcelas da mesma série)
  
  # Recorrência
  is_recurring: boolean
  recurrence_pattern: string (DAILY, WEEKLY, MONTHLY, YEARLY)
  
  # Rastreamento
  source_transaction_id: UUID (para espelhamento)
  external_id: string (para integração)
  notes: string
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Tipos de Transação:**
- **EXPENSE**: Despesa (reduz saldo)
- **INCOME**: Receita (aumenta saldo)
- **TRANSFER**: Transferência entre contas

**Domínios:**
- **PERSONAL**: Transação pessoal (não compartilhada)
- **SHARED**: Despesa compartilhada com família
- **TRAVEL**: Transação de viagem

**Competence_Date (Data de Competência):**
- Sempre no formato YYYY-MM-01 (primeiro dia do mês)
- Usada para agrupar transações por período contábil
- Para parcelamentos: cada parcela tem sua própria competence_date
- Para cartões de crédito: agrupa transações por mês de fechamento

---

### 2.3 Splits (Divisões de Despesa)

```
transaction_splits {
  id: UUID
  transaction_id: UUID
  member_id: UUID (membro da família)
  user_id: UUID (usuário do membro, se aplicável)
  
  percentage: decimal (0-100)
  amount: decimal (valor do split)
  name: string (nome do membro)
  
  # Liquidação
  is_settled: boolean (foi ressarcido?)
  settled_at: TIMESTAMP
  settled_by_debtor: boolean (devedor confirmou pagamento?)
  settled_by_creditor: boolean (credor confirmou recebimento?)
  settled_transaction_id: UUID (transação de pagamento)
  
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

**Regras:**
- Soma de percentuais deve ser ≤ 100%
- Se < 100%, o criador recebe o restante automaticamente
- Valores calculados com SafeFinancialCalculator (aritmética de inteiros)
- Cada split pode ter status de liquidação independente

---

### 2.4 Membros da Família (Family Members)

```
family_members {
  id: UUID
  family_id: UUID
  user_id: UUID (proprietário da família)
  linked_user_id: UUID (usuário do membro, se tiver conta)
  name: string
  email: string
  role: ADMIN | MEMBER | VIEWER
  
  # Escopo de compartilhamento
  sharing_scope: all | trips_only | date_range | specific_trip
  scope_start_date: DATE (se date_range)
  scope_end_date: DATE (se date_range)
  scope_trip_id: UUID (se specific_trip)
  
  is_active: boolean
  created_at: TIMESTAMP
}
```

---

## 3. FLUXOS PRINCIPAIS

### 3.1 FLUXO: Criar Transação Simples

```
1. Usuário preenche formulário
   - Conta
   - Valor (positivo)
   - Descrição
   - Data
   - Categoria (opcional)
   - Tipo (EXPENSE, INCOME, TRANSFER)

2. Validações
   ✓ Valor > 0
   ✓ Descrição não vazia
   ✓ Conta existe e pertence ao usuário
   ✓ Categoria existe (se fornecida)
   ✓ Não é duplicata (mesmo valor, descrição, data, conta nos últimos 10s)

3. Criar transação
   INSERT INTO transactions {
     user_id: current_user,
     account_id: selected_account,
     amount: value,
     description: description,
     date: date,
     competence_date: YYYY-MM-01 (do date),
     type: type,
     domain: PERSONAL,
     is_shared: false
   }

4. Trigger automático
   - Recalcula saldo da conta (soma todas as transações)
   - Atualiza account.balance

5. Invalidar cache
   - Transações
   - Resumo financeiro
   - Extrato da conta
```

---

### 3.2 FLUXO: Criar Transação Compartilhada

```
1. Usuário preenche formulário
   - Conta
   - Valor
   - Descrição
   - Data
   - Membros e percentuais (splits)
   - Pagador (quem pagou por todos)

2. Validações
   ✓ Valor > 0
   ✓ Descrição não vazia
   ✓ Pelo menos 1 membro selecionado
   ✓ Soma de percentuais ≤ 100%
   ✓ Payer_id existe em family_members (VALIDAÇÃO ANTECIPADA - ANTES DE CRIAR SPLITS)
   ✓ Todos os member_ids existem em family_members

3. Auto-completar splits
   - Se soma < 100%, adicionar criador com o restante
   - Exemplo: 50% + 30% = 80% → criador recebe 20%

4. Criar transação
   INSERT INTO transactions {
     user_id: current_user,
     amount: value,
     description: description,
     date: date,
     competence_date: YYYY-MM-01,
     type: EXPENSE,
     domain: SHARED,
     is_shared: true,
     payer_id: payer_id
   }

5. Criar splits
   FOR EACH split:
     INSERT INTO transaction_splits {
       transaction_id: tx.id,
       member_id: split.member_id,
       percentage: split.percentage,
       amount: SafeFinancialCalculator.percentage(value, percentage),
       is_settled: false
     }

6. Trigger automático
   - Cria transações espelhadas para cada membro (MIRRORING)
   - Cada membro vê a transação em seu extrato

7. Invalidar cache
   - Transações
   - Finanças compartilhadas
   - Resumo financeiro
```

---

### 3.3 FLUXO: Criar Parcelamento (Installments)

```
1. Usuário preenche formulário
   - Conta
   - Valor total
   - Descrição
   - Data da primeira parcela
   - Número de parcelas (ex: 12)
   - Membros (se compartilhado)

2. Validações
   ✓ Valor > 0
   ✓ Número de parcelas > 1
   ✓ Data válida

3. Calcular valor de cada parcela
   installment_amount = SafeFinancialCalculator.calculateInstallment(total, num_parcelas)
   Exemplo: 1200 / 12 = 100

4. Gerar série de parcelas
   series_id = UUID()
   FOR i = 1 TO num_parcelas:
     date = date_fns.addMonths(base_date, i-1)
     competence_date = date_fns.format(date, 'yyyy-MM-01')
     
     INSERT INTO transactions {
       user_id: current_user,
       amount: installment_amount,
       description: "Descrição (1/12)",
       date: date,
       competence_date: competence_date,
       current_installment: i,
       total_installments: num_parcelas,
       series_id: series_id,
       is_installment: true
     }

5. Se compartilhado, criar splits para cada parcela
   FOR EACH transaction:
     FOR EACH split:
       INSERT INTO transaction_splits {
         transaction_id: tx.id,
         member_id: split.member_id,
         amount: SafeFinancialCalculator.percentage(installment_amount, percentage)
       }

6. Invalidar cache
   - Transações
   - Resumo financeiro
```

**Regra Crítica de Datas:**
- Usar `date-fns` com `parseISO()` e `addMonths()` para evitar problemas de fuso horário
- NUNCA usar `new Date()` para aritmética de datas
- Competence_date SEMPRE é primeiro dia do mês (YYYY-MM-01)

---

### 3.4 FLUXO: Liquidar Despesa Compartilhada (Settlement)

```
1. Usuário vê split não liquidado
   - Membro deve R$ 100 (DÉBITO)
   - Ou membro deve pagar R$ 100 (CRÉDITO)

2. Usuário clica "Confirmar Ressarcimento"
   - Seleciona conta para receber o pagamento
   - Confirma valor

3. Validações
   ✓ Split não foi liquidado ainda
   ✓ Conta existe e pertence ao usuário
   ✓ Valor > 0

4. Operação Atômica (RPC settle_split)
   BEGIN TRANSACTION
     
     a) Marcar split como liquidado
        UPDATE transaction_splits
        SET is_settled = true,
            settled_at = NOW(),
            settled_by_creditor = true
        WHERE id = split_id
     
     b) Criar transação de INCOME na conta selecionada
        INSERT INTO transactions {
          user_id: current_user,
          account_id: selected_account,
          amount: split.amount,
          type: INCOME,
          description: "Ressarcimento de {member_name}",
          date: TODAY,
          competence_date: TODAY (YYYY-MM-01)
        }
     
     c) Trigger automático
        - Recalcula saldo da conta
        - account.balance += split.amount
   
   END TRANSACTION

5. Se falhar, ROLLBACK completo
   - Split continua não liquidado
   - Nenhuma transação criada
   - Saldo não alterado

6. Invalidar cache
   - Transações
   - Finanças compartilhadas
   - Contas
   - Resumo financeiro
```

**Regra Crítica:**
- TODAS as operações devem ser atômicas (tudo ou nada)
- Se qualquer operação falhar, fazer ROLLBACK de tudo
- Usar RPC functions no Supabase para garantir atomicidade

---

### 3.5 FLUXO: Calcular Fatura de Cartão de Crédito

```
1. Usuário acessa página de Cartões de Crédito

2. Sistema calcula ciclo de fatura
   closing_day = 10 (exemplo)
   due_day = 20 (exemplo)
   
   Ciclo = (closing_day_anterior + 1) até (closing_day_atual)
   Exemplo: 11/04 até 10/05
   
   Vencimento = due_day do mês seguinte
   Exemplo: 20/05

3. Buscar transações do ciclo
   SELECT * FROM transactions
   WHERE account_id = card_id
   AND competence_date = YYYY-MM-01 (mês do ciclo)
   AND type IN (EXPENSE, INCOME, TRANSFER)

4. Calcular total
   total = SUM(EXPENSE) - SUM(INCOME) + SUM(TRANSFER_OUT)

5. Determinar status
   IF closing_date < TODAY:
     status = CLOSED (fatura fechada)
   ELSE:
     status = OPEN (fatura aberta)

6. Exibir informações
   - Ciclo: 11/04 a 10/05
   - Vencimento: 20/05
   - Total: R$ 1.234,56
   - Status: OPEN/CLOSED
   - Dias para fechar: X dias
```

**Regra Crítica:**
- Usar `competence_date` para agrupar transações, não `date`
- Isso garante que cada transação apareça na fatura correta
- Para parcelamentos: cada parcela aparece em sua fatura correspondente

---

### 3.6 FLUXO: Visualizar Finanças Compartilhadas

```
1. Usuário acessa aba "Compartilhados"

2. Sistema busca dados consolidados via RPC
   get_shared_invoice_data(user_id)
   - Retorna todas as transações compartilhadas
   - Retorna todos os splits
   - Retorna status de liquidação

3. Processar dados para cada membro
   FOR EACH member:
     invoices[member_id] = []
     
     # CASO 1: EU PAGUEI (CRÉDITO - me devem)
     FOR EACH transaction WHERE user_id = current_user AND is_shared:
       FOR EACH split:
         IF split.member_id != current_user:
           invoices[member_id].push({
             type: CREDIT,
             amount: split.amount,
             isPaid: split.is_settled,
             description: transaction.description
           })
     
     # CASO 2: OUTRO PAGOU (DÉBITO - eu devo)
     FOR EACH transaction WHERE user_id != current_user AND is_shared:
       FOR EACH split WHERE member_id = current_user:
         invoices[payer_id].push({
           type: DEBIT,
           amount: split.amount,
           isPaid: split.is_settled,
           description: transaction.description
         })

4. Filtrar por aba
   - REGULAR: Apenas não pagos, não viagens, mês atual
   - TRAVEL: Todas as viagens
   - HISTORY: Apenas pagos, mês atual

5. Calcular totais por moeda
   FOR EACH currency:
     credits = SUM(CREDIT items)
     debits = SUM(DEBIT items)
     net = credits - debits

6. Exibir para usuário
   - Membro A: Deve R$ 100 (1 item não pago)
   - Membro B: Você deve R$ 50 (1 item não pago)
   - Total: Você deve R$ 50 (net)
```

**Regra Crítica:**
- NUNCA somar moedas diferentes
- Calcular totais separadamente por moeda
- Usar taxa de câmbio estimada apenas para exibição informativa

---

## 4. REGRAS DE NEGÓCIO CRÍTICAS

### 4.1 Integridade Referencial

```
✓ Toda transação deve ter account_id válido
✓ Toda transação compartilhada deve ter payer_id válido
✓ Todo split deve ter member_id válido
✓ Todo split deve ter transaction_id válido
✓ Validar ANTES de criar, não depois
```

### 4.2 Precisão Financeira

```
✓ Usar SafeFinancialCalculator para TODOS os cálculos
✓ Aritmética de inteiros (centavos), nunca ponto flutuante
✓ Saldo SEMPRE calculado via trigger, nunca atualizado diretamente
✓ Splits devem somar ≤ total + 1 centavo (tolerância de arredondamento)
```

### 4.3 Atomicidade

```
✓ Settlement: tudo ou nada
✓ Parcelamento: todas as parcelas ou nenhuma
✓ Múltiplos splits: todos liquidados ou nenhum
✓ Usar RPC functions para garantir transações no banco
```

### 4.4 Datas e Fusos Horários

```
✓ Usar date-fns para TODAS as operações de data
✓ Usar parseISO() para parsing
✓ Usar format() para formatação
✓ NUNCA usar new Date() para aritmética
✓ Competence_date SEMPRE YYYY-MM-01
✓ Armazenar datas em UTC no banco
```

### 4.5 Validação de Entrada

```
✓ Valor > 0
✓ Descrição não vazia
✓ Conta existe e pertence ao usuário
✓ Categoria existe (se fornecida)
✓ Membro existe (se fornecido)
✓ Payer existe (se fornecido)
✓ Não é duplicata
```

### 4.6 Cache e Invalidação

```
✓ Invalidar após QUALQUER mutação
✓ Invalidar queries relacionadas:
  - Transações
  - Finanças compartilhadas
  - Resumo financeiro
  - Extrato de conta
  - Contas
✓ Usar queryClient.invalidateQueries()
```

---

## 5. FLUXOS DE DADOS

### 5.1 Criação de Transação Compartilhada

```
Usuário
  ↓
Formulário (validação local)
  ↓
useCreateTransaction mutation
  ↓
Validar payer_id (ANTES de criar splits)
  ↓
Criar transaction
  ↓
Criar transaction_splits
  ↓
Trigger: Criar transações espelhadas
  ↓
Trigger: Recalcular saldos
  ↓
Invalidar cache
  ↓
Atualizar UI
```

### 5.2 Liquidação de Despesa

```
Usuário clica "Confirmar Ressarcimento"
  ↓
useSettleWithPayment mutation
  ↓
RPC settle_split (atômico)
  ├─ Marcar split como liquidado
  ├─ Criar transação de INCOME
  └─ Trigger: Recalcular saldo
  ↓
Invalidar cache
  ↓
Atualizar UI
```

### 5.3 Visualização de Finanças Compartilhadas

```
Usuário acessa aba "Compartilhados"
  ↓
useSharedFinances hook
  ↓
RPC get_shared_invoice_data (consolidado)
  ↓
Processar dados (invoices map)
  ↓
Filtrar por aba (REGULAR/TRAVEL/HISTORY)
  ↓
Calcular totais por moeda
  ↓
Exibir para usuário
```

---

## 6. SINGLE SOURCE OF TRUTH (SSOT)

### Princípio

Todos os cálculos financeiros são feitos NO BANCO DE DADOS, nunca no frontend.

### Implementação

```
1. Saldo da Conta
   - Calculado via trigger: SUM(transactions) WHERE account_id = X
   - Nunca atualizar diretamente
   - Frontend apenas lê account.balance

2. Resumo Financeiro
   - Calculado via RPC: get_monthly_financial_summary()
   - Retorna: balance, income, expenses, savings
   - Frontend apenas exibe

3. Finanças Compartilhadas
   - Calculado via RPC: get_shared_invoice_data()
   - Retorna: transações, splits, status
   - Frontend apenas processa para exibição

4. Fatura de Cartão
   - Calculada via RPC ou VIEW
   - Agrupa por competence_date
   - Frontend apenas exibe
```

### Benefícios

✓ Consistência garantida
✓ Sem sincronização de estado
✓ Sem bugs de cálculo no frontend
✓ Auditoria fácil (tudo no banco)
✓ Escalável (cálculos no servidor)

---

## 7. CASOS DE USO AVANÇADOS

### 7.1 Parcelamento Compartilhado

```
Usuário cria parcelamento de 12x R$ 1.200 compartilhado com 2 membros

1. Criar 12 transações (uma por mês)
2. Cada transação tem:
   - series_id (mesmo para todas)
   - current_installment (1, 2, 3...)
   - total_installments (12)
   - competence_date (mês da parcela)

3. Para cada transação, criar splits
   - Membro A: 50%
   - Membro B: 30%
   - Criador: 20% (auto-completado)

4. Cada parcela pode ser liquidada independentemente
```

### 7.2 Transação de Viagem

```
Usuário cria transação de viagem em USD

1. Criar transação
   - domain: TRAVEL
   - currency: USD
   - trip_id: viagem_id

2. Criar splits com membros da viagem

3. Não aparecer em "Transações" (apenas em "Viagem")

4. Aparecer em "Compartilhados > Viagem"

5. Liquidação normal (criar INCOME em conta selecionada)
```

### 7.3 Transação Recorrente

```
Usuário cria transação recorrente (aluguel mensal)

1. Criar transação com:
   - is_recurring: true
   - recurrence_pattern: MONTHLY
   - frequency: 1 (a cada 1 mês)

2. Sistema gera automaticamente:
   - Próximas 12 transações
   - Cada uma com data correta
   - Cada uma com competence_date correta

3. Usuário pode:
   - Editar série (afeta futuras)
   - Deletar série (remove todas)
   - Deletar apenas futuras
```

---

## 8. TRATAMENTO DE ERROS

### Validação de Entrada

```
IF valor <= 0:
  throw "O valor deve ser maior que zero"

IF descrição vazia:
  throw "A descrição é obrigatória"

IF payer_id não existe:
  throw "O pagador selecionado é inválido ou não foi encontrado"

IF member_id não existe:
  throw "O membro selecionado é inválido"

IF soma de splits > 100%:
  throw "A soma das porcentagens não pode exceder 100%"
```

### Operações Atômicas

```
IF settlement falha:
  ROLLBACK tudo
  throw "Erro ao confirmar ressarcimento"

IF parcelamento falha:
  ROLLBACK tudo
  throw "Erro ao criar parcelas"

IF split falha:
  ROLLBACK tudo
  throw "Erro ao criar divisão"
```

### RPC Calls

```
IF RPC timeout:
  Retry até 3 vezes com backoff exponencial
  throw "Erro de conexão. Tente novamente"

IF RPC error:
  Log erro com contexto
  throw "Erro ao processar operação"

IF RPC retorna null:
  throw "Dados não encontrados"
```

---

## 9. PERFORMANCE

### Otimizações

```
✓ Usar RPC consolidado (get_shared_invoice_data)
  - Evita múltiplas queries
  - Cálculos no servidor

✓ Usar VIEW transactions_ssot
  - Consolida transações próprias e participadas
  - Evita UNION no frontend

✓ Usar índices no banco
  - user_id
  - account_id
  - date
  - competence_date
  - series_id

✓ Usar cache com React Query
  - staleTime: 60s
  - cacheTime: 5min
  - Invalidar apenas quando necessário
```

### Problemas Conhecidos

```
❌ N+1 queries
  - Usar RPC consolidado
  - Usar batch queries

❌ Limite de 1000 transações
  - Avisar usuário
  - Sugerir filtros de data

❌ Timezone issues
  - Usar date-fns
  - Usar UTC no banco
```

---

## 10. SEGURANÇA

### Row-Level Security (RLS)

```
✓ Usuário só vê suas próprias transações
✓ Usuário só vê contas que possui
✓ Usuário só vê membros da sua família
✓ Usuário só pode editar suas próprias transações
```

### Validação

```
✓ Validar user_id em TODAS as operações
✓ Validar ownership de recursos
✓ Validar entrada do usuário
✓ Usar prepared statements (Supabase faz isso)
```

### Auditoria

```
✓ Rastrear creator_user_id
✓ Rastrear created_at e updated_at
✓ Usar audit log para operações críticas
✓ Logar erros com contexto
```

---

## RESUMO

Este é um sistema financeiro robusto com:
- ✅ Lógica clara e bem definida
- ✅ Regras de negócio bem implementadas
- ✅ Atomicidade garantida
- ✅ Precisão financeira
- ✅ Segurança
- ✅ Performance

Os 20 problemas identificados são **técnicos e corrigíveis**, não afetam a lógica fundamental do sistema.
