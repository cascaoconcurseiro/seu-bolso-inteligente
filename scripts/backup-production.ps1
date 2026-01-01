# Script de Backup do Banco de Dados de Produção
# Data: 01/01/2025
# Descrição: Faz backup do banco de dados hospedado no Supabase

param(
    [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "backup_production_$timestamp"
$backupPath = Join-Path $BackupDir $backupName

Write-Host "🔄 Iniciando backup do banco de produção..." -ForegroundColor Cyan
Write-Host "📁 Destino: $backupPath" -ForegroundColor Gray

# Criar diretório de backup
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
New-Item -ItemType Directory -Force -Path "$backupPath/database" | Out-Null

# Ler project ref
$projectRef = Get-Content "supabase/.temp/project-ref" -ErrorAction SilentlyContinue
if (-not $projectRef) {
    Write-Host "❌ Erro: Project ref não encontrado" -ForegroundColor Red
    Write-Host "💡 Execute: npx supabase link" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 Projeto: $projectRef" -ForegroundColor Gray

# 1. BACKUP DO BANCO DE DADOS DE PRODUÇÃO
Write-Host "`n📊 1. Backup do Banco de Dados de Produção..." -ForegroundColor Yellow

# Schema completo (estrutura + dados)
Write-Host "  → Exportando schema completo..." -ForegroundColor Gray
npx supabase db dump --linked -f "$backupPath/database/schema_full.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Schema completo exportado" -ForegroundColor Green
} else {
    Write-Host "  ❌ Erro ao exportar schema" -ForegroundColor Red
}

# Dados apenas
Write-Host "  → Exportando dados..." -ForegroundColor Gray
npx supabase db dump --linked --data-only -f "$backupPath/database/data_only.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dados exportados" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Erro ao exportar dados" -ForegroundColor Yellow
}

# Roles
Write-Host "  → Exportando roles..." -ForegroundColor Gray
npx supabase db dump --linked --role-only -f "$backupPath/database/roles_and_policies.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Roles exportados" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Erro ao exportar roles" -ForegroundColor Yellow
}

# 2. BACKUP DAS MIGRATIONS
Write-Host "`n📝 2. Backup das Migrations..." -ForegroundColor Yellow
if (Test-Path "supabase/migrations") {
    Copy-Item -Path "supabase/migrations" -Destination "$backupPath/migrations" -Recurse
    $migrationCount = (Get-ChildItem "$backupPath/migrations" -Filter "*.sql").Count
    Write-Host "  ✓ $migrationCount migrations copiadas" -ForegroundColor Green
}

# 3. CRIAR METADADOS
Write-Host "`n📋 3. Criando metadados..." -ForegroundColor Yellow

$metadata = @"
# Backup de Produção - Seu Bolso Inteligente
Data: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Timestamp: $timestamp
Project: $projectRef

## Conteúdo do Backup

### Banco de Dados (Produção)
- schema_full.sql: Schema completo (estrutura + dados)
- data_only.sql: Apenas dados
- roles_and_policies.sql: Roles e RLS policies

### Migrations
- Todas as migrations do diretório supabase/migrations/

## Como Restaurar

### ATENÇÃO: Use com MUITO CUIDADO!

### 1. Restaurar em Ambiente Local
``````powershell
# Iniciar Supabase local
npx supabase start

# Resetar banco local
npx supabase db reset --local

# Restaurar dados
psql -h localhost -p 54322 -U postgres -d postgres < database/schema_full.sql
``````

### 2. Restaurar em Produção (CUIDADO!)
``````powershell
# ATENÇÃO: Isso irá SOBRESCREVER todos os dados de produção!

# Opção 1: Via Supabase Dashboard
# 1. Acesse: https://supabase.com/dashboard/project/$projectRef/database/backups
# 2. Faça upload do arquivo schema_full.sql
# 3. Execute a restauração

# Opção 2: Via CLI (requer confirmação)
npx supabase db push --linked
``````

## Notas Importantes

- ⚠️ Este backup contém dados REAIS de produção
- ⚠️ Mantenha em local SEGURO
- ⚠️ NÃO compartilhe publicamente
- ⚠️ Contém informações sensíveis de usuários
- ✅ Use para disaster recovery
- ✅ Teste restauração em ambiente local primeiro

## Informações do Sistema

Data do Backup: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Project ID: $projectRef
Supabase CLI: $(npx supabase --version 2>$null)
"@

$metadata | Out-File -FilePath "$backupPath/README.md" -Encoding UTF8

# 4. COMPACTAR
Write-Host "`n📦 4. Compactando backup..." -ForegroundColor Yellow

$zipPath = "$BackupDir/$backupName.zip"
Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "  ✓ Backup compactado: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green

# 5. RESUMO
Write-Host "`n✅ Backup de Produção Finalizado!" -ForegroundColor Green
Write-Host "`n📊 Resumo:" -ForegroundColor Cyan
Write-Host "  • Projeto: $projectRef" -ForegroundColor Gray
Write-Host "  • Pasta: $backupPath" -ForegroundColor Gray
Write-Host "  • Arquivo: $zipPath" -ForegroundColor Gray
Write-Host "  • Tamanho: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray
Write-Host "`n⚠️  IMPORTANTE: Este backup contém dados REAIS de produção!" -ForegroundColor Yellow
Write-Host "   Mantenha em local seguro e não compartilhe publicamente." -ForegroundColor Yellow
Write-Host "`n💡 Para restaurar, consulte: $backupPath/README.md" -ForegroundColor Cyan
