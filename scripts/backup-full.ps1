# Script de Backup Completo do Sistema
# Data: 01/01/2025
# Descrição: Cria backup completo do código e banco de dados

param(
    [string]$BackupDir = "backups"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "backup_$timestamp"
$backupPath = Join-Path $BackupDir $backupName

Write-Host "🔄 Iniciando backup completo..." -ForegroundColor Cyan
Write-Host "📁 Destino: $backupPath" -ForegroundColor Gray

# Criar diretório de backup
New-Item -ItemType Directory -Force -Path $backupPath | Out-Null
New-Item -ItemType Directory -Force -Path "$backupPath/database" | Out-Null
New-Item -ItemType Directory -Force -Path "$backupPath/code" | Out-Null

# 1. BACKUP DO BANCO DE DADOS
Write-Host "`n📊 1. Backup do Banco de Dados..." -ForegroundColor Yellow

# Schema completo (estrutura + dados)
Write-Host "  → Exportando schema completo..." -ForegroundColor Gray
npx supabase db dump --local -f "$backupPath/database/schema_full.sql"

# Schema apenas estrutura (sem dados)
Write-Host "  → Exportando schema (estrutura)..." -ForegroundColor Gray
npx supabase db dump --local --schema-only -f "$backupPath/database/schema_structure.sql"

# Dados apenas (sem estrutura)
Write-Host "  → Exportando dados..." -ForegroundColor Gray
npx supabase db dump --local --data-only -f "$backupPath/database/data_only.sql"

# RLS Policies
Write-Host "  → Exportando RLS policies..." -ForegroundColor Gray
npx supabase db dump --local --role-only -f "$backupPath/database/roles_and_policies.sql"

# 2. BACKUP DAS MIGRATIONS
Write-Host "`n📝 2. Backup das Migrations..." -ForegroundColor Yellow
if (Test-Path "supabase/migrations") {
    Copy-Item -Path "supabase/migrations" -Destination "$backupPath/migrations" -Recurse
    $migrationCount = (Get-ChildItem "$backupPath/migrations" -Filter "*.sql").Count
    Write-Host "  ✓ $migrationCount migrations copiadas" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Pasta migrations não encontrada" -ForegroundColor Yellow
}

# 3. BACKUP DO CÓDIGO FONTE
Write-Host "`n💻 3. Backup do Código Fonte..." -ForegroundColor Yellow

# Lista de arquivos/pastas essenciais
$essentialItems = @(
    "src",
    "public",
    "supabase",
    "scripts",
    ".kiro",
    "package.json",
    "package-lock.json",
    "bun.lockb",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "eslint.config.js",
    "components.json",
    "index.html",
    "vercel.json",
    ".env.example",
    "README.md"
)

foreach ($item in $essentialItems) {
    if (Test-Path $item) {
        Write-Host "  → Copiando $item..." -ForegroundColor Gray
        if (Test-Path $item -PathType Container) {
            Copy-Item -Path $item -Destination "$backupPath/code/$item" -Recurse -Force
        } else {
            Copy-Item -Path $item -Destination "$backupPath/code/$item" -Force
        }
    }
}

# 4. BACKUP DAS CONFIGURAÇÕES
Write-Host "`n⚙️  4. Backup das Configurações..." -ForegroundColor Yellow

# Supabase config
if (Test-Path "supabase/config.toml") {
    Copy-Item -Path "supabase/config.toml" -Destination "$backupPath/supabase_config.toml"
    Write-Host "  ✓ config.toml copiado" -ForegroundColor Green
}

# Git info (para referência)
if (Test-Path ".git") {
    git log -1 --pretty=format:"Commit: %H%nAuthor: %an%nDate: %ad%nMessage: %s" > "$backupPath/git_info.txt"
    git status --short > "$backupPath/git_status.txt"
    Write-Host "  ✓ Git info salvo" -ForegroundColor Green
}

# 5. CRIAR ARQUIVO DE METADADOS
Write-Host "`n📋 5. Criando metadados..." -ForegroundColor Yellow

$metadata = @"
# Backup Completo - Seu Bolso Inteligente
Data: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")
Timestamp: $timestamp

## Conteúdo do Backup

### Banco de Dados
- schema_full.sql: Schema completo (estrutura + dados)
- schema_structure.sql: Apenas estrutura (tabelas, views, functions, triggers)
- data_only.sql: Apenas dados
- roles_and_policies.sql: Roles e RLS policies

### Migrations
- Todas as migrations do diretório supabase/migrations/

### Código Fonte
- src/: Código fonte completo da aplicação
- public/: Arquivos públicos (imagens, etc.)
- supabase/: Configurações e migrations do Supabase
- scripts/: Scripts utilitários
- .kiro/: Configurações do Kiro
- Arquivos de configuração (package.json, tsconfig, vite, etc.)

### Configurações
- supabase_config.toml: Configuração do Supabase
- git_info.txt: Informações do último commit
- git_status.txt: Status do repositório Git

## Como Restaurar

### 1. Restaurar Código
``````powershell
# Copiar arquivos do backup
Copy-Item -Path "code/*" -Destination "./" -Recurse -Force

# Instalar dependências
bun install
``````

### 2. Restaurar Banco de Dados
``````powershell
# Iniciar Supabase local
bun supabase start

# Restaurar schema completo
bun supabase db reset --local

# OU restaurar manualmente
psql -h localhost -p 54322 -U postgres -d postgres < database/schema_full.sql
``````

### 3. Aplicar Migrations
``````powershell
# Copiar migrations
Copy-Item -Path "migrations/*" -Destination "supabase/migrations/" -Recurse -Force

# Aplicar migrations
bun supabase db push --local
``````

### 4. Verificar
``````powershell
# Verificar status
bun supabase status

# Gerar types
bun supabase gen types --local > src/integrations/supabase/types.ts

# Iniciar aplicação
bun run dev
``````

## Notas Importantes

- Este backup contém TODOS os dados do banco de dados
- Inclui todas as migrations aplicadas
- Inclui código fonte completo (exceto node_modules e dist)
- Para restaurar em produção, use o Supabase Dashboard
- Mantenha este backup em local seguro

## Informações do Sistema

Node Version: $(node --version 2>$null)
Bun Version: $(if (Get-Command bun -ErrorAction SilentlyContinue) { bun --version } else { "Not installed" })
Supabase CLI: $(npx supabase --version 2>$null)
"@

$metadata | Out-File -FilePath "$backupPath/README.md" -Encoding UTF8

# 6. COMPACTAR BACKUP (OPCIONAL)
Write-Host "`n📦 6. Compactando backup..." -ForegroundColor Yellow

$zipPath = "$BackupDir/$backupName.zip"
Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host "  ✓ Backup compactado: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green

# 7. RESUMO
Write-Host "`n✅ Backup Completo Finalizado!" -ForegroundColor Green
Write-Host "`n📊 Resumo:" -ForegroundColor Cyan
Write-Host "  • Pasta: $backupPath" -ForegroundColor Gray
Write-Host "  • Arquivo: $zipPath" -ForegroundColor Gray
Write-Host "  • Tamanho: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray
Write-Host "`n💡 Para restaurar, consulte: $backupPath/README.md" -ForegroundColor Yellow
