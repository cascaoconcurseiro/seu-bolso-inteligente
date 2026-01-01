# Script de Restauração de Backup
# Data: 01/01/2025
# Descrição: Restaura backup completo do sistema

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    
    [switch]$SkipCode,
    [switch]$SkipDatabase,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Iniciando restauração do backup..." -ForegroundColor Cyan
Write-Host "📁 Origem: $BackupPath" -ForegroundColor Gray

# Verificar se o backup existe
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Erro: Backup não encontrado em $BackupPath" -ForegroundColor Red
    exit 1
}

# Descompactar se for ZIP
if ($BackupPath -like "*.zip") {
    Write-Host "`n📦 Descompactando backup..." -ForegroundColor Yellow
    $extractPath = $BackupPath -replace '\.zip$', ''
    Expand-Archive -Path $BackupPath -DestinationPath $extractPath -Force
    $BackupPath = $extractPath
    Write-Host "  ✓ Backup descompactado" -ForegroundColor Green
}

# Confirmar restauração
if (-not $Force) {
    Write-Host "`n⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER os dados atuais!" -ForegroundColor Yellow
    $confirm = Read-Host "Deseja continuar? (sim/não)"
    if ($confirm -ne "sim") {
        Write-Host "❌ Restauração cancelada" -ForegroundColor Red
        exit 0
    }
}

# 1. RESTAURAR CÓDIGO FONTE
if (-not $SkipCode) {
    Write-Host "`n💻 1. Restaurando Código Fonte..." -ForegroundColor Yellow
    
    if (Test-Path "$BackupPath/code") {
        # Backup do código atual (segurança)
        if (Test-Path "src") {
            $tempBackup = "temp_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            Write-Host "  → Criando backup temporário do código atual..." -ForegroundColor Gray
            New-Item -ItemType Directory -Force -Path $tempBackup | Out-Null
            Copy-Item -Path "src" -Destination "$tempBackup/src" -Recurse -Force
            Write-Host "  ✓ Backup temporário criado em: $tempBackup" -ForegroundColor Green
        }
        
        # Restaurar código
        Write-Host "  → Restaurando arquivos..." -ForegroundColor Gray
        Copy-Item -Path "$BackupPath/code/*" -Destination "./" -Recurse -Force
        Write-Host "  ✓ Código fonte restaurado" -ForegroundColor Green
        
        # Instalar dependências
        Write-Host "  → Instalando dependências..." -ForegroundColor Gray
        bun install
        Write-Host "  ✓ Dependências instaladas" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Pasta code/ não encontrada no backup" -ForegroundColor Yellow
    }
}

# 2. RESTAURAR BANCO DE DADOS
if (-not $SkipDatabase) {
    Write-Host "`n📊 2. Restaurando Banco de Dados..." -ForegroundColor Yellow
    
    # Verificar se Supabase está rodando
    Write-Host "  → Verificando Supabase..." -ForegroundColor Gray
    $status = bun supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  → Iniciando Supabase..." -ForegroundColor Gray
        bun supabase start
    }
    
    if (Test-Path "$BackupPath/database/schema_full.sql") {
        Write-Host "  → Resetando banco de dados..." -ForegroundColor Gray
        bun supabase db reset --local
        
        Write-Host "  → Restaurando schema completo..." -ForegroundColor Gray
        # Usar psql diretamente para restaurar
        $env:PGPASSWORD = "postgres"
        psql -h localhost -p 54322 -U postgres -d postgres -f "$BackupPath/database/schema_full.sql" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Banco de dados restaurado" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Erro ao restaurar banco de dados" -ForegroundColor Yellow
            Write-Host "  💡 Tente restaurar manualmente com:" -ForegroundColor Gray
            Write-Host "     psql -h localhost -p 54322 -U postgres -d postgres < $BackupPath/database/schema_full.sql" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠ Arquivo schema_full.sql não encontrado" -ForegroundColor Yellow
    }
    
    # Restaurar migrations
    if (Test-Path "$BackupPath/migrations") {
        Write-Host "  → Restaurando migrations..." -ForegroundColor Gray
        if (Test-Path "supabase/migrations") {
            Remove-Item "supabase/migrations/*" -Recurse -Force
        }
        Copy-Item -Path "$BackupPath/migrations/*" -Destination "supabase/migrations/" -Recurse -Force
        Write-Host "  ✓ Migrations restauradas" -ForegroundColor Green
    }
}

# 3. GERAR TYPES
Write-Host "`n📝 3. Gerando Types..." -ForegroundColor Yellow
bun supabase gen types --local > src/integrations/supabase/types.ts
Write-Host "  ✓ Types gerados" -ForegroundColor Green

# 4. VERIFICAÇÃO
Write-Host "`n🔍 4. Verificando Restauração..." -ForegroundColor Yellow

# Verificar Supabase
Write-Host "  → Status do Supabase:" -ForegroundColor Gray
bun supabase status

# Verificar arquivos
$filesToCheck = @("src/main.tsx", "package.json", "supabase/config.toml")
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (não encontrado)" -ForegroundColor Red
    }
}

# 5. RESUMO
Write-Host "`n✅ Restauração Completa!" -ForegroundColor Green
Write-Host "`n📊 Próximos Passos:" -ForegroundColor Cyan
Write-Host "  1. Verificar se o Supabase está rodando: bun supabase status" -ForegroundColor Gray
Write-Host "  2. Iniciar aplicação: bun run dev" -ForegroundColor Gray
Write-Host "  3. Testar funcionalidades principais" -ForegroundColor Gray
Write-Host "`n💡 Se houver problemas, consulte o README.md do backup" -ForegroundColor Yellow
