# Plano de Migração: PE → Seu Bolso Inteligente

## 📊 Análise Comparativa

### ✅ O que o projeto NOVO já tem:
- Autenticação com Supabase
- Transações básicas
- Contas
- Cartões de crédito
- Despesas compartilhadas
- Viagens
- Família
- Relatórios
- UI moderna com shadcn/ui
- React Query para cache
- Contextos (Auth, Month)

### 🎯 O que o PE tem de MELHOR (para migrar):

#### 1. **Lógica Financeira Robusta**
- ✅ Sistema de Partidas Dobradas (Double Entry Ledger)
- ✅ Chart of Accounts (Plano de Contas)
- ✅ Auditoria completa de transações
- ✅ Validações de integridade financeira
- ✅ Reconciliação bancária
- ✅ Sistema de verificação de inconsistências

#### 2. **Funcionalidades Avançadas**
- ✅ Orçamentos (Budgets) - **FALTA NO NOVO**
- ✅ Metas (Goals) - **FALTA NO NOVO**
- ✅ Investimentos (Investments) - **FALTA NO NOVO**
- ✅ AI Advisor - **FALTA NO NOVO**
- ✅ Busca Global - **FALTA NO NOVO**
- ✅ Snapshots financeiros
- ✅ Categorias customizadas

#### 3. **Regras de Negócio**
- ✅ Validação de splits (divisão de despesas)
- ✅ Antecipação de parcelas
- ✅ Sistema de liquidação (settlements)
- ✅ Importação de cartão de crédito
- ✅ Factory Reset com segurança
- ✅ Sistema de notificações avançado

#### 4. **Performance e Segurança**
- ✅ Índices otimizados
- ✅ RLS (Row Level Security) robusto
- ✅ Triggers de sincronização
- ✅ Constraints de integridade
- ✅ Sistema de cache inteligente

## 🚀 Plano de Migração (Fases)

### **FASE 1: Fundação - Schema e Migrations** ⭐ PRIORIDADE MÁXIMA
1. Migrar schema completo do PE
2. Adicionar constraints de integridade
3. Implementar sistema de auditoria
4. Criar índices de performance
5. Implementar RLS policies

### **FASE 2: Funcionalidades Core**
1. **Orçamentos (Budgets)**
   - Tabela budgets
   - CRUD de orçamentos
   - Comparação com gastos reais
   - Alertas de limite

2. **Metas (Goals)**
   - Tabela goals
   - CRUD de metas
   - Progresso visual
   - Contribuições

3. **Investimentos (Investments)**
   - Tabela assets
   - Tipos de investimento
   - Rentabilidade
   - Alocação de portfólio

### **FASE 3: Lógica Financeira Avançada**
1. Sistema de Partidas Dobradas
2. Chart of Accounts
3. Ledger Entries
4. Reconciliação bancária
5. Validações de integridade

### **FASE 4: Features Extras**
1. AI Advisor (Google Gemini)
2. Busca Global
3. Importação de extratos
4. Snapshots automáticos
5. Relatórios avançados (DDD)

### **FASE 5: Otimizações**
1. Performance (lazy loading, virtualização)
2. Service Worker / PWA
3. Testes automatizados
4. Documentação

## 📋 Checklist de Migração

### Schema e Banco de Dados
- [ ] Migrar tabela `budgets`
- [ ] Migrar tabela `goals`
- [ ] Migrar tabela `assets` (investimentos)
- [ ] Migrar tabela `chart_of_accounts`
- [ ] Migrar tabela `ledger_entries`
- [ ] Migrar tabela `transaction_audit`
- [ ] Migrar tabela `bank_statements`
- [ ] Migrar tabela `snapshots`
- [ ] Adicionar constraints de integridade
- [ ] Adicionar índices de performance
- [ ] Implementar triggers de auditoria
- [ ] Implementar triggers de sincronização

### Componentes e UI
- [ ] Componente Budgets
- [ ] Componente Goals
- [ ] Componente Investments
- [ ] Componente AiAdvisor
- [ ] Componente GlobalSearch
- [ ] Componente InconsistenciesModal
- [ ] Componente BankStatementImport

### Hooks e Lógica
- [ ] Hook `useBudgets`
- [ ] Hook `useGoals`
- [ ] Hook `useAssets`
- [ ] Hook `useAppCalculations`
- [ ] Hook `useSystemNotifications`
- [ ] Hook `useKeyboardShortcuts`

### Funções RPC do Supabase
- [ ] `validate_transaction_rules`
- [ ] `verify_financial_integrity`
- [ ] `migrate_chart_of_accounts`
- [ ] `migrate_legacy_transactions_to_ddd`
- [ ] Funções de shared expenses
- [ ] Funções de trips
- [ ] Funções de factory reset

## 🎯 Próximos Passos Imediatos

1. **Começar pela FASE 1** - Schema e Migrations
2. **Testar cada migration** antes de aplicar a próxima
3. **Manter compatibilidade** com o código existente
4. **Documentar** cada mudança

## ⚠️ Cuidados Importantes

1. **Não quebrar funcionalidades existentes**
2. **Testar em ambiente local primeiro**
3. **Fazer backup antes de aplicar migrations**
4. **Migrar dados existentes com segurança**
5. **Manter RLS policies corretas**
