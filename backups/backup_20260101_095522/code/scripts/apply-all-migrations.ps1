# Script para aplicar todas as migrações no Supabase
# Uso: .\scripts\apply-all-migrations.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Aplicando migrações no Supabase..." -ForegroundColor Cyan

# Verificar se supabase CLI está instalado
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar se está linkado
if (!(Test-Path "supabase/.temp/project-ref")) {
    Write-Host "⚠️  Projeto não linkado. Linkando..." -ForegroundColor Yellow
    supabase link --project-ref vrrcagukyfnlhxuvnssp
}

# Aplicar migrações
Write-Host "📦 Aplicando migrações..." -ForegroundColor Green

$migrations = Get-ChildItem -Path "supabase/migrations" -Filter "*.sql" | Sort-Object Name

foreach ($migration in $migrations) {
    Write-Host "  ➜ Aplicando: $($migration.Name)" -ForegroundColor Gray
    
    try {
        $content = Get-Content $migration.FullName -Raw
        supabase db execute --file $migration.FullName --linked
        Write-Host "    ✅ Sucesso!" -ForegroundColor Green
    }
    catch {
        Write-Host "    ❌ Erro: $_" -ForegroundColor Red
        Write-Host "    Continuando..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Migrações aplicadas!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Verificando tabelas criadas..." -ForegroundColor Cyan
supabase db list --linked

Write-Host ""
Write-Host "🎉 Concluído!" -ForegroundColor Green
