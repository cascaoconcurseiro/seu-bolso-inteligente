#!/bin/bash

# =====================================================
# Script de Aplicação das Melhorias
# Data: 2026-01-01
# Descrição: Aplica todas as migrations de melhoria
# =====================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI não encontrado. Instale com: npm install -g supabase"
    exit 1
fi

print_header "APLICAÇÃO DAS MELHORIAS - PÉ DE MEIA"
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script na raiz do projeto"
    exit 1
fi

# Confirmar com usuário
print_warning "Este script irá aplicar 6 migrations críticas:"
echo "  1. Soft Delete"
echo "  2. Audit Log"
echo "  3. Suite de Testes"
echo "  4. Acerto Parcial"
echo "  5. Migração de Campos"
echo "  6. Índices de Performance"
echo ""
print_warning "IMPORTANTE: Faça backup antes de continuar!"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    print_info "Operação cancelada pelo usuário"
    exit 0
fi

# Criar backup
print_header "FASE 0: BACKUP"
BACKUP_FILE="backup_pre_melhorias_$(date +%Y%m%d_%H%M%S).sql"
print_info "Criando backup: $BACKUP_FILE"

if supabase db dump -f "$BACKUP_FILE"; then
    print_success "Backup criado com sucesso"
else
    print_error "Falha ao criar backup"
    exit 1
fi

# Aplicar migrations
print_header "FASE 1: SOFT DELETE"
print_info "Aplicando migration 20260101000001_add_soft_delete.sql"

if supabase migration up --file supabase/migrations/20260101000001_add_soft_delete.sql; then
    print_success "Soft Delete aplicado"
else
    print_error "Falha ao aplicar Soft Delete"
    exit 1
fi

# Verificar soft delete
print_info "Verificando soft delete..."
RESULT=$(supabase db execute --query "SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name IN ('deleted_at', 'deleted_by')" | wc -l)
if [ "$RESULT" -ge 2 ]; then
    print_success "Soft Delete verificado"
else
    print_error "Soft Delete não foi aplicado corretamente"
    exit 1
fi

# FASE 2: AUDIT LOG
print_header "FASE 2: AUDIT LOG"
print_info "Aplicando migration 20260101000002_add_audit_log.sql"

if supabase migration up --file supabase/migrations/20260101000002_add_audit_log.sql; then
    print_success "Audit Log aplicado"
else
    print_error "Falha ao aplicar Audit Log"
    exit 1
fi

# Verificar audit log
print_info "Verificando audit log..."
RESULT=$(supabase db execute --query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_log'" | tail -1)
if [ "$RESULT" -eq 1 ]; then
    print_success "Audit Log verificado"
else
    print_error "Audit Log não foi aplicado corretamente"
    exit 1
fi

# FASE 3: SUITE DE TESTES
print_header "FASE 3: SUITE DE TESTES"
print_info "Aplicando migration 20260101000003_add_test_suite.sql"

if supabase migration up --file supabase/migrations/20260101000003_add_test_suite.sql; then
    print_success "Suite de Testes aplicada"
else
    print_error "Falha ao aplicar Suite de Testes"
    exit 1
fi

# Executar testes
print_info "Executando testes..."
if supabase db execute --query "SELECT * FROM tests.run_all_tests()" > /dev/null 2>&1; then
    print_success "Testes executados com sucesso"
else
    print_warning "Alguns testes falharam (verifique manualmente)"
fi

# FASE 4: ACERTO PARCIAL
print_header "FASE 4: ACERTO PARCIAL"
print_info "Aplicando migration 20260101000004_add_partial_settlement.sql"

if supabase migration up --file supabase/migrations/20260101000004_add_partial_settlement.sql; then
    print_success "Acerto Parcial aplicado"
else
    print_error "Falha ao aplicar Acerto Parcial"
    exit 1
fi

# FASE 5: MIGRAÇÃO DE CAMPOS
print_header "FASE 5: MIGRAÇÃO DE CAMPOS"
print_info "Aplicando migration 20260101000005_migrate_settlement_fields.sql"

if supabase migration up --file supabase/migrations/20260101000005_migrate_settlement_fields.sql; then
    print_success "Migração de Campos aplicada"
else
    print_error "Falha ao aplicar Migração de Campos"
    exit 1
fi

# FASE 6: ÍNDICES DE PERFORMANCE
print_header "FASE 6: ÍNDICES DE PERFORMANCE"
print_info "Aplicando migration 20260101000006_add_performance_indexes.sql"

if supabase migration up --file supabase/migrations/20260101000006_add_performance_indexes.sql; then
    print_success "Índices de Performance aplicados"
else
    print_error "Falha ao aplicar Índices de Performance"
    exit 1
fi

# Validação final
print_header "VALIDAÇÃO FINAL"

# Executar testes novamente
print_info "Executando testes finais..."
TEST_RESULTS=$(supabase db execute --query "SELECT * FROM tests.run_all_tests()")
FAILED_TESTS=$(echo "$TEST_RESULTS" | grep "FAILED" | wc -l)

if [ "$FAILED_TESTS" -eq 0 ]; then
    print_success "Todos os testes passaram"
else
    print_warning "$FAILED_TESTS teste(s) falharam"
fi

# Verificar integridade
print_info "Verificando integridade..."

# Transações órfãs
ORPHAN_TX=$(supabase db execute --query "SELECT COUNT(*) FROM transactions WHERE user_id NOT IN (SELECT id FROM profiles)" | tail -1)
if [ "$ORPHAN_TX" -eq 0 ]; then
    print_success "Nenhuma transação órfã"
else
    print_warning "$ORPHAN_TX transações órfãs encontradas"
fi

# Splits órfãos
ORPHAN_SPLITS=$(supabase db execute --query "SELECT COUNT(*) FROM transaction_splits WHERE transaction_id NOT IN (SELECT id FROM transactions)" | tail -1)
if [ "$ORPHAN_SPLITS" -eq 0 ]; then
    print_success "Nenhum split órfão"
else
    print_warning "$ORPHAN_SPLITS splits órfãos encontrados"
fi

# Resumo final
print_header "RESUMO"
echo ""
print_success "Todas as migrations foram aplicadas com sucesso!"
echo ""
print_info "Backup criado em: $BACKUP_FILE"
print_info "Documentação em: docs/DATABASE/"
print_info "Guia completo em: docs/GUIA_APLICAR_MELHORIAS_01_01_2026.md"
echo ""
print_warning "Próximos passos:"
echo "  1. Monitorar performance nas próximas 24 horas"
echo "  2. Executar testes diariamente: SELECT * FROM tests.run_all_tests()"
echo "  3. Verificar audit log: SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 100"
echo "  4. Atualizar frontend para usar novas funções"
echo ""
print_success "Aplicação concluída!"

