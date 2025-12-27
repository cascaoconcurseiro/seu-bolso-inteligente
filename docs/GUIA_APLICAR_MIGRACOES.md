# 📋 GUIA: Como Aplicar as Migrações

## 🎯 Objetivo
Aplicar todas as migrações necessárias no banco de dados Supabase para ativar as novas funcionalidades.

---

## 📝 Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: **seu-bolso-inteligente**

### 2. Abrir o SQL Editor

1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query** (botão verde no canto superior direito)

### 3. Copiar o Script de Migração

1. Abra o arquivo `APLICAR_TODAS_MIGRACOES.sql` neste projeto
2. Copie **TODO** o conteúdo do arquivo (Ctrl+A, Ctrl+C)

### 4. Colar e Executar

1. Cole o script no SQL Editor do Supabase (Ctrl+V)
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode levar 10-30 segundos)

### 5. Verificar Resultados

Após a execução, você verá 3 tabelas de resultados:

**Tabela 1: Contagem de Registros**
```
tabela                          | registros
--------------------------------|----------
shared_transaction_requests     | 0
shared_system_audit_logs        | 0
shared_operation_queue          | 0
shared_circuit_breaker          | 0
```

**Tabela 2: Novos Campos em Transactions**
```
column_name              | data_type
-------------------------|----------
enable_notification      | boolean
frequency                | text
is_mirror                | boolean
is_refund                | boolean
source_transaction_id    | uuid
```

**Tabela 3: Novos Campos em Accounts**
```
column_name        | data_type
-------------------|----------
credit_limit       | numeric
currency           | text
is_international   | boolean
```

---

## ✅ Verificação de Sucesso

Se você viu as 3 tabelas acima, **PARABÉNS!** As migrações foram aplicadas com sucesso! ✨

---

## 🔍 O Que Foi Criado

### Novos Campos

**Transactions**:
- `is_refund` - Indica se é reembolso
- `frequency` - Frequência de recorrência
- `recurrence_day` - Dia do mês para recorrência
- `enable_notification` - Habilita notificações
- `notification_date` - Data da notificação
- `is_mirror` - Indica se é transação espelho
- `source_transaction_id` - ID da transação original
- `exchange_rate` - Taxa de câmbio
- `destination_currency` - Moeda de destino

**Accounts**:
- `credit_limit` - Limite de crédito (cartões)
- `currency` - Moeda da conta
- `is_international` - Conta internacional
- `initial_balance` - Saldo inicial

**Trips**:
- `shopping_list` - Lista de compras (JSONB)
- `exchange_entries` - Entradas de câmbio (JSONB)

### Novas Tabelas

1. **shared_transaction_requests**
   - Gerencia requests de compartilhamento
   - Aceitar/rejeitar convites
   - Retry automático

2. **shared_system_audit_logs**
   - Logs de auditoria
   - Rastreamento de operações
   - Debugging

3. **shared_operation_queue**
   - Fila de operações pendentes
   - Retry automático (até 3x)
   - Sincronização

4. **shared_circuit_breaker**
   - Proteção contra falhas
   - Estados: CLOSED, OPEN, HALF_OPEN
   - Auto-recuperação

### Índices de Performance

- 6 índices em `transactions`
- 2 índices em `accounts`
- 2 índices em `transaction_splits`
- 4 índices em `shared_transaction_requests`
- 3 índices em `shared_system_audit_logs`
- 2 índices em `shared_operation_queue`

### Funções de Manutenção

- `cleanup_old_audit_logs()` - Limpa logs > 90 dias
- `process_pending_operations()` - Processa operações pendentes
- `expire_old_requests()` - Expira requests antigos

---

## 🚨 Troubleshooting

### Erro: "relation already exists"
**Solução**: Algumas tabelas já existem. Isso é normal, o script usa `IF NOT EXISTS`.

### Erro: "column already exists"
**Solução**: Alguns campos já existem. Isso é normal, o script usa `IF NOT EXISTS`.

### Erro: "permission denied"
**Solução**: Verifique se você está logado como owner do projeto.

### Erro de timeout
**Solução**: Execute o script em partes menores:
1. Primeiro: Seção 1 (Campos)
2. Depois: Seção 2 (Índices)
3. Por último: Seção 3 (Tabelas)

---

## 🎉 Próximos Passos

Após aplicar as migrações:

1. ✅ Testar o formulário de transações
2. ✅ Testar contas internacionais
3. ✅ Testar aba "Compras" em viagens
4. ✅ Testar filtro de mês em relatórios
5. ✅ Testar sistema de requests

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs de erro no Supabase
2. Consulte a documentação: `STATUS_CORRECOES_COMPLETAS.md`
3. Revise o código: `PROJETO_100_COMPLETO.md`

---

**Data**: 26/12/2024  
**Status**: Pronto para aplicar  
**Tempo Estimado**: 2-5 minutos
