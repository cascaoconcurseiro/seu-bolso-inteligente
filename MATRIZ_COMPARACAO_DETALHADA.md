# MATRIZ DE COMPARAÇÃO DETALHADA

## 1. CAMPOS DE TRANSAÇÕES

| Campo | Sistema Atual | PE copy | Status |
|-------|---|---|---|
| id | ✅ | ✅ | Igual |
| user_id | ✅ | ✅ | Igual |
| account_id | ✅ | ✅ | Igual |
| destination_account_id | ✅ | ✅ | Igual |
| category_id | ✅ | ✅ | Igual |
| trip_id | ✅ | ✅ | Igual |
| amount | ✅ | ✅ | Igual |
| description | ✅ | ✅ | Igual |
| date | ✅ | ✅ | Igual |
| type | ✅ | ✅ | Igual |
| domain | ✅ | ✅ | Igual |
| is_shared | ✅ | ✅ | Igual |
| payer_id | ✅ | ✅ | Igual |
| is_installment | ✅ | ✅ | Igual |
| current_installment | ✅ | ✅ | Igual |
| total_installments | ✅ | ✅ | Igual |
| series_id | ✅ | ✅ | Igual |
| is_recurring | ✅ | ✅ | Igual |
| recurrence_pattern | ✅ | ⚠️ | PE copy usa `frequency` + `recurrence_day` |
| source_transaction_id | ✅ | ✅ | Igual |
| external_id | ✅ | ✅ | Igual |
| sync_status | ✅ | ✅ | Igual |
| notes | ✅ | ✅ | Igual |
| created_at | ✅ | ✅ | Igual |
| updated_at | ✅ | ✅ | Igual |
| **NOVOS NO PE copy** | | | |
| is_refund | ❌ | ✅ | **FALTANDO** |
| refund_of_transaction_id | ❌ | ✅ | **FALTANDO** |
| frequency | ❌ | ✅ | **FALTANDO** |
| recurrence_day | ❌ | ✅ | **FALTANDO** |
| last_generated | ❌ | ✅ | **FALTANDO** |
| enable_notification | ❌ | ✅ | **FALTANDO** |
| notification_date | ❌ | ✅ | **FALTANDO** |
| reminder_option | ❌ | ✅ | **FALTANDO** |
| creator_user_id | ❌ | ✅ | **FALTANDO** |
| related_member_id | ❌ | ✅ | **FALTANDO** |
| destination_amount | ❌ | ✅ | **FALTANDO** |
| destination_currency | ❌ | ✅ | **FALTANDO** |
| exchange_rate | ❌ | ✅ | **FALTANDO** |
| reconciled | ❌ | ✅ | **FALTANDO** |
| reconciled_at | ❌ | ✅ | **FALTANDO** |
| reconciled_by | ❌ | ✅ | **FALTANDO** |
| reconciled_with | ❌ | ✅ | **FALTANDO** |
| is_mirror | ❌ | ✅ | **FALTANDO** |
| mirror_transaction_id | ❌ | ✅ | **FALTANDO** |
| linked_transaction_id | ❌ | ✅ | **FALTANDO** |
| settled_by_tx_id | ❌ | ✅ | **FALTANDO** |
| **TOTAL** | **26** | **40+** | **+54%** |

---

## 2. CAMPOS DE ACCOUNTS

| Campo | Sistema Atual | PE copy | Status |
|-------|---|---|---|
| id | ✅ | ✅ | Igual |
| user_id | ✅ | ✅ | Igual |
| name | ✅ | ✅ | Igual |
| type | ✅ | ✅ | Igual |
| balance | ✅ | ✅ | Igual |
| bank_id | ✅ | ✅ | Igual |
| bank_color | ✅ | ✅ | Igual |
| bank_logo | ✅ | ✅ | Igual |
| currency | ✅ | ✅ | Igual |
| is_active | ✅ | ✅ | Igual |
| closing_day | ✅ | ✅ | Igual |
| due_day | ✅ | ✅ | Igual |
| credit_limit | ✅ | ✅ | Igual |
| created_at | ✅ | ✅ | Igual |
| updated_at | ✅ | ✅ | Igual |
| **NOVOS NO PE copy** | | | |
| initial_balance | ❌ | ✅ | **FALTANDO** |
| is_international | ❌ | ✅ | **FALTANDO** |
| deleted | ❌ | ✅ | **FALTANDO** |
| sync_status | ❌ | ✅ | **FALTANDO** |
| **TOTAL** | **15** | **19** | **+27%** |

---

## 3. CAMPOS DE TRIPS

| Campo | Sistema Atual | PE copy | Status |
|-------|---|---|---|
| id | ✅ | ✅ | Igual |
| owner_id | ✅ | ✅ | Igual |
| name | ✅ | ✅ | Igual |
| destination | ✅ | ✅ | Igual |
| start_date | ✅ | ✅ | Igual |
| end_date | ✅ | ✅ | Igual |
| currency | ✅ | ✅ | Igual |
| budget | ✅ | ✅ | Igual |
| status | ✅ | ✅ | Igual |
| cover_image | ✅ | ✅ | Igual |
| notes | ✅ | ✅ | Igual |
| created_at | ✅ | ✅ | Igual |
| updated_at | ✅ | ✅ | Igual |
| **NOVOS NO PE copy** | | | |
| shopping_list | ❌ | ✅ JSON | **FALTANDO** |
| exchange_entries | ❌ | ✅ JSON | **FALTANDO** |
| participants | ❌ | ✅ JSON | **FALTANDO** |
| itinerary | ❌ | ✅ JSON | **FALTANDO** |
| checklist | ❌ | ✅ JSON | **FALTANDO** |
| source_trip_id | ❌ | ✅ | **FALTANDO** |
| **TOTAL** | **13** | **19** | **+46%** |

---

## 4. TABELAS DE BANCO DE DADOS

| Tabela | Sistema Atual | PE copy | Descrição |
|--------|---|---|---|
| profiles | ✅ | ✅ | Perfis de usuários |
| families | ✅ | ✅ | Famílias |
| family_members | ✅ | ✅ | Membros da família |
| accounts | ✅ | ✅ | Contas bancárias |
| categories | ✅ | ✅ | Categorias de transações |
| transactions | ✅ | ✅ | Transações |
| transaction_splits | ✅ | ✅ | Divisões de transações |
| trips | ✅ | ✅ | Viagens |
| trip_participants | ✅ | ✅ | Participantes de viagens |
| trip_itinerary | ✅ | ✅ | Roteiro de viagens |
| trip_checklist | ✅ | ✅ | Checklist de viagens |
| shared_transaction_mirrors | ✅ | ✅ | Espelhos de transações |
| **NOVOS NO PE copy** | | | |
| account_types | ❌ | ✅ | **Tipos de contas** |
| shared_transaction_requests | ❌ | ✅ | **Requests de compartilhamento** |
| shared_system_audit_logs | ❌ | ✅ | **Logs de auditoria** |
| shared_operation_queue | ❌ | ✅ | **Fila de operações** |
| shared_circuit_breaker | ❌ | ✅ | **Circuit breaker** |
| **TOTAL** | **12** | **17** | **+42%** |

---

## 5. VALIDAÇÕES

| Validação | Sistema Atual | PE copy | Descrição |
|-----------|---|---|---|
| Valor > 0 | ✅ | ✅ | Valor deve ser positivo |
| Descrição obrigatória | ✅ | ✅ | Descrição não pode estar vazia |
| Data obrigatória | ✅ | ✅ | Data é obrigatória |
| Conta obrigatória | ✅ | ✅ | Conta é obrigatória |
| Duplicata (3 dias) | ✅ | ✅ | Detecta duplicatas |
| **NOVOS NO PE copy** | | | |
| Data válida | ❌ | ✅ | **Rejeita 2024-02-30** |
| Data razoável | ❌ | ✅ | **Rejeita ±1 ano** |
| Valor razoável | ❌ | ✅ | **Rejeita >1.000.000** |
| Limite de cartão | ❌ | ✅ | **Valida limite** |
| Parcelamento válido | ❌ | ✅ | **2-48 parcelas** |
| Divisão = 100% | ❌ | ✅ | **Soma percentagens** |
| Divisão ≤ total | ❌ | ✅ | **Splits não excedem total** |
| Tipo de conta | ❌ | ✅ | **Valida tipo apropriado** |
| Moeda consistente | ❌ | ✅ | **Valida moeda em viagens** |
| Transferência válida | ❌ | ✅ | **Não para cartão** |
| **TOTAL** | **5** | **20+** | **+300%** |

---

## 6. FUNCIONALIDADES

| Funcionalidade | Sistema Atual | PE copy | Descrição |
|---|---|---|---|
| Transações básicas | ✅ | ✅ | CRUD de transações |
| Compartilhamento | ✅ | ✅ | Divisão de despesas |
| Viagens | ✅ | ✅ | Gerenciamento de viagens |
| Relatórios | ✅ | ✅ | Relatórios básicos |
| Ledger | ✅ | ✅ | Partidas dobradas |
| **NOVOS NO PE copy** | | | |
| Reembolsos | ❌ | ✅ | **Suporte a refunds** |
| Recorrência avançada | ⚠️ | ✅ | **DAILY/WEEKLY/MONTHLY/YEARLY** |
| Notificações | ❌ | ✅ | **Lembretes de pagamento** |
| Aba "Compras" | ❌ | ✅ | **Lista de desejos em viagens** |
| Contas internacionais | ❌ | ✅ | **Suporte a múltiplas moedas** |
| Transferências com câmbio | ❌ | ✅ | **Exchange rate** |
| Sistema de requests | ❌ | ✅ | **Accept/reject compartilhamento** |
| Auto-sync | ❌ | ✅ | **Sincronização automática** |
| Reconciliação | ❌ | ✅ | **Auditoria de transações** |
| Circuit breaker | ❌ | ✅ | **Proteção contra falhas** |
| Retry automático | ❌ | ✅ | **Backoff exponencial** |
| Audit logs | ❌ | ✅ | **Rastreamento de operações** |
| Testes automatizados | ❌ | ✅ | **Property-based tests** |
| **TOTAL** | **9** | **21** | **+133%** |

---

## 7. HOOKS E SERVIÇOS

### Hooks

| Hook | Sistema Atual | PE copy | Descrição |
|------|---|---|---|
| useAccounts | ✅ | ✅ | Gerenciar contas |
| useCategories | ✅ | ✅ | Gerenciar categorias |
| useTransactions | ✅ | ✅ | Gerenciar transações |
| useTrips | ✅ | ✅ | Gerenciar viagens |
| useFamilyMembers | ✅ | ✅ | Gerenciar membros |
| useSharedFinances | ✅ | ✅ | Compartilhamento |
| usePermissions | ✅ | ✅ | Permissões |
| useAssets | ✅ | ✅ | Ativos |
| useBudgets | ✅ | ✅ | Orçamentos |
| useGoals | ✅ | ✅ | Metas |
| **NOVOS NO PE copy** | | | |
| useTransactionForm | ❌ | ✅ | **Gerenciar formulário** |
| useTransactionStore | ❌ | ✅ | **Estado centralizado** |
| useAccountStore | ❌ | ✅ | **Estado de contas** |
| useTripStore | ❌ | ✅ | **Estado de viagens** |
| useDataConsistency | ❌ | ✅ | **Verificar integridade** |
| useErrorTracker | ❌ | ✅ | **Rastrear erros** |
| useNetworkStatus | ❌ | ✅ | **Status de rede** |
| useSmartNotifications | ❌ | ✅ | **Notificações inteligentes** |
| useKeyboardShortcuts | ❌ | ✅ | **Atalhos de teclado** |
| **TOTAL** | **10** | **19** | **+90%** |

### Serviços

| Serviço | Sistema Atual | PE copy | Descrição |
|---------|---|---|---|
| ledger.ts | ✅ | ✅ | Partidas dobradas |
| SafeFinancialCalculator.ts | ✅ | ✅ | Cálculos precisos |
| **NOVOS NO PE copy** | | | |
| validationService.ts | ❌ | ✅ | **Validações** |
| transactionService.ts | ❌ | ✅ | **Operações CRUD** |
| SharedTransactionManager.ts | ❌ | ✅ | **Gerenciar compartilhamento** |
| financialPrecision.ts | ❌ | ✅ | **Precisão financeira** |
| integrityService.ts | ❌ | ✅ | **Verificar integridade** |
| exportUtils.ts | ❌ | ✅ | **Exportar dados** |
| pdfService.ts | ❌ | ✅ | **Gerar PDFs** |
| ofxParser.ts | ❌ | ✅ | **Parse OFX** |
| currencyService.ts | ❌ | ✅ | **Conversão de moedas** |
| tripDebtsCalculator.ts | ❌ | ✅ | **Calcular débitos** |
| errorHandler.ts | ❌ | ✅ | **Tratamento de erros** |
| logger.ts | ❌ | ✅ | **Logging estruturado** |
| **TOTAL** | **2** | **14** | **+600%** |

---

## 8. FUNÇÕES SQL

| Função | Sistema Atual | PE copy | Descrição |
|--------|---|---|---|
| update_updated_at_column | ✅ | ✅ | Atualizar timestamp |
| handle_new_user | ✅ | ✅ | Criar perfil novo |
| is_family_member | ✅ | ✅ | Verificar membro |
| is_trip_participant | ✅ | ✅ | Verificar participante |
| get_user_family_id | ✅ | ✅ | Obter família |
| **NOVOS NO PE copy** | | | |
| create_shared_transaction_v2 | ❌ | ✅ | **Criar com mirrors** |
| respond_to_shared_request_v2 | ❌ | ✅ | **Responder request** |
| sync_shared_transaction_v2 | ❌ | ✅ | **Sincronizar** |
| calculate_next_retry | ❌ | ✅ | **Calcular retry** |
| enqueue_operation | ❌ | ✅ | **Enfileirar operação** |
| check_circuit_breaker | ❌ | ✅ | **Verificar circuit** |
| run_full_reconciliation | ❌ | ✅ | **Reconciliação completa** |
| verify_shared_system_integrity | ❌ | ✅ | **Verificar integridade** |
| get_pending_shared_requests | ❌ | ✅ | **Obter requests** |
| get_shared_system_stats | ❌ | ✅ | **Estatísticas** |
| **TOTAL** | **5** | **15** | **+200%** |

---

## 9. POLÍTICAS RLS

| Política | Sistema Atual | PE copy | Descrição |
|----------|---|---|---|
| profiles - SELECT | ✅ | ✅ | Ver próprio perfil |
| profiles - UPDATE | ✅ | ✅ | Atualizar próprio |
| families - SELECT | ✅ | ✅ | Ver famílias |
| families - INSERT | ✅ | ✅ | Criar família |
| families - UPDATE | ✅ | ✅ | Atualizar família |
| families - DELETE | ✅ | ✅ | Deletar família |
| family_members - SELECT | ✅ | ✅ | Ver membros |
| family_members - ALL | ✅ | ✅ | Gerenciar membros |
| accounts - SELECT | ✅ | ✅ | Ver contas |
| accounts - INSERT | ✅ | ✅ | Criar conta |
| accounts - UPDATE | ✅ | ✅ | Atualizar conta |
| accounts - DELETE | ✅ | ✅ | Deletar conta |
| categories - SELECT | ✅ | ✅ | Ver categorias |
| categories - INSERT | ✅ | ✅ | Criar categoria |
| categories - UPDATE | ✅ | ✅ | Atualizar categoria |
| categories - DELETE | ✅ | ✅ | Deletar categoria |
| trips - SELECT | ✅ | ✅ | Ver viagens |
| trips - INSERT | ✅ | ✅ | Criar viagem |
| trips - UPDATE | ✅ | ✅ | Atualizar viagem |
| trips - DELETE | ✅ | ✅ | Deletar viagem |
| trip_participants - SELECT | ✅ | ✅ | Ver participantes |
| trip_participants - ALL | ✅ | ✅ | Gerenciar participantes |
| transactions - SELECT | ✅ | ✅ | Ver transações |
| transactions - INSERT | ✅ | ✅ | Criar transação |
| transactions - UPDATE | ✅ | ✅ | Atualizar transação |
| transactions - DELETE | ✅ | ✅ | Deletar transação |
| transaction_splits - SELECT | ✅ | ✅ | Ver splits |
| transaction_splits - ALL | ✅ | ✅ | Gerenciar splits |
| trip_itinerary - SELECT | ✅ | ✅ | Ver roteiro |
| trip_itinerary - ALL | ✅ | ✅ | Gerenciar roteiro |
| trip_checklist - SELECT | ✅ | ✅ | Ver checklist |
| trip_checklist - ALL | ✅ | ✅ | Gerenciar checklist |
| **TOTAL** | **32** | **32** | Igual |

---

## 10. TIPOS E INTERFACES

| Tipo | Sistema Atual | PE copy | Descrição |
|------|---|---|---|
| Transaction | ✅ | ✅ | Tipo de transação |
| Account | ✅ | ✅ | Tipo de conta |
| Trip | ✅ | ✅ | Tipo de viagem |
| FamilyMember | ✅ | ✅ | Tipo de membro |
| Category | ✅ | ✅ | Tipo de categoria |
| **NOVOS NO PE copy** | | | |
| ValidationResult | ❌ | ✅ | **Resultado de validação** |
| TransactionSplit | ❌ | ✅ | **Divisão de transação** |
| SharedRequest | ❌ | ✅ | **Request compartilhado** |
| SharedMirror | ❌ | ✅ | **Espelho compartilhado** |
| InvoiceItem | ❌ | ✅ | **Item de fatura** |
| TripShoppingItem | ❌ | ✅ | **Item de compras** |
| BaseEntityProps | ❌ | ✅ | **Props base** |
| BaseCRUDProps | ❌ | ✅ | **Props CRUD** |
| BaseFormProps | ❌ | ✅ | **Props formulário** |
| **TOTAL** | **5** | **14** | **+180%** |

---

## RESUMO FINAL

| Categoria | Sistema Atual | PE copy | Diferença |
|-----------|---|---|---|
| **Campos de Transações** | 26 | 40+ | +54% |
| **Campos de Accounts** | 15 | 19 | +27% |
| **Campos de Trips** | 13 | 19 | +46% |
| **Tabelas** | 12 | 17 | +42% |
| **Validações** | 5 | 20+ | +300% |
| **Funcionalidades** | 9 | 21 | +133% |
| **Hooks** | 10 | 19 | +90% |
| **Serviços** | 2 | 14 | +600% |
| **Funções SQL** | 5 | 15 | +200% |
| **Tipos** | 5 | 14 | +180% |
| **TOTAL GERAL** | ~100 | ~200+ | **+100%** |

---

## CONCLUSÃO

O PE copy é **2x mais completo** que o sistema atual em praticamente todas as dimensões:
- 2x mais campos de banco de dados
- 4x mais validações
- 7x mais serviços
- 3x mais funções SQL
- 3x mais tipos

Implementar as diferenças críticas é essencial para melhorar a qualidade e confiabilidade do sistema.

