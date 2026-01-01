# Guia de Backup Completo do Sistema
**Data**: 01/01/2025  
**Versão**: 1.0

## 📋 Índice

1. [Backup Automático (Código)](#backup-automático-código)
2. [Backup Manual (Banco de Dados)](#backup-manual-banco-de-dados)
3. [Backup Completo (Código + Banco)](#backup-completo)
4. [Restauração](#restauração)
5. [Agendamento Automático](#agendamento-automático)

---

## 🔄 Backup Automático (Código)

### Script PowerShell

Já criamos scripts automatizados para backup do código:

```powershell
# Backup completo do código fonte e migrations
.\scripts\backup-full.ps1

# Resultado:
# - backups/backup_YYYYMMDD_HHMMSS/
#   - code/ (código fonte completo)
#   - migrations/ (todas as migrations)
#   - README.md (instruções de restauração)
# - backups/backup_YYYYMMDD_HHMMSS.zip (arquivo compactado)
```

### O que é incluído:
- ✅ Código fonte completo (`src/`, `public/`, etc.)
- ✅ Todas as migrations (`supabase/migrations/`)
- ✅ Configurações (`package.json`, `tsconfig.json`, etc.)
- ✅ Configuração do Supabase (`supabase/config.toml`)
- ✅ Informações do Git (último commit, status)
- ❌ node_modules (não incluído - pode ser reinstalado)
- ❌ dist (não incluído - pode ser reconstruído)

---

## 📊 Backup Manual (Banco de Dados)

### Opção 1: Via Supabase Dashboard (Recomendado)

1. **Acessar o Dashboard**
   ```
   https://supabase.com/dashboard/project/vrrcagukyfnlhxuvssp
   ```

2. **Navegar para Backups**
   - Clique em "Database" no menu lateral
   - Clique em "Backups"
   - URL direta: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvssp/database/backups

3. **Criar Backup Manual**
   - Clique em "Create backup"
   - Aguarde o processo (pode levar alguns minutos)
   - Download do arquivo `.sql`

4. **Salvar Localmente**
   ```powershell
   # Criar pasta de backups se não existir
   New-Item -ItemType Directory -Force -Path "backups/database"
   
   # Mover arquivo baixado
   Move-Item -Path "~/Downloads/backup_*.sql" -Destination "backups/database/production_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
   ```

### Opção 2: Via Supabase CLI (Requer Docker)

```powershell
# ATENÇÃO: Requer Docker Desktop rodando!

# Backup completo (estrutura + dados)
npx supabase db dump --linked -f backups/database/production_full.sql

# Apenas dados
npx supabase db dump --linked --data-only -f backups/database/production_data.sql

# Apenas roles e policies
npx supabase db dump --linked --role-only -f backups/database/production_roles.sql
```

### Opção 3: Via pg_dump Direto

```powershell
# Obter connection string do Supabase Dashboard
# Settings > Database > Connection string

$env:PGPASSWORD = "sua_senha_aqui"
pg_dump -h db.vrrcagukyfnlhxuvssp.supabase.co -p 5432 -U postgres -d postgres -F c -f backups/database/production_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump
```

---

## 💾 Backup Completo

### Processo Recomendado

1. **Backup do Código** (Automático)
   ```powershell
   .\scripts\backup-full.ps1
   ```

2. **Backup do Banco** (Manual via Dashboard)
   - Acessar: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvssp/database/backups
   - Criar backup
   - Baixar arquivo `.sql`
   - Mover para `backups/database/`

3. **Organizar Backups**
   ```powershell
   # Estrutura final:
   backups/
   ├── backup_20260101_095522/
   │   ├── code/              # Código fonte
   │   ├── migrations/        # Migrations
   │   └── README.md          # Instruções
   ├── backup_20260101_095522.zip  # Código compactado
   └── database/
       └── production_20260101_100000.sql  # Banco de dados
   ```

---

## 🔄 Restauração

### Restaurar Código

```powershell
# Opção 1: Usar script automático
.\scripts\restore-backup.ps1 -BackupPath "backups/backup_20260101_095522"

# Opção 2: Manual
Expand-Archive -Path "backups/backup_20260101_095522.zip" -DestinationPath "restore_temp"
Copy-Item -Path "restore_temp/code/*" -Destination "./" -Recurse -Force
npm install
```

### Restaurar Banco de Dados

#### Em Ambiente Local

```powershell
# Iniciar Supabase local
npx supabase start

# Resetar banco
npx supabase db reset --local

# Restaurar backup
$env:PGPASSWORD = "postgres"
psql -h localhost -p 54322 -U postgres -d postgres < backups/database/production_20260101_100000.sql

# Gerar types
npx supabase gen types --local > src/integrations/supabase/types.ts
```

#### Em Produção (CUIDADO!)

⚠️ **ATENÇÃO**: Isso irá SOBRESCREVER todos os dados de produção!

**Via Dashboard** (Recomendado):
1. Acessar: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvssp/database/backups
2. Clicar em "Restore"
3. Selecionar o backup
4. Confirmar restauração

**Via SQL Editor**:
1. Acessar: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvssp/sql/new
2. Copiar conteúdo do arquivo `.sql`
3. Executar (com MUITO cuidado!)

---

## ⏰ Agendamento Automático

### Windows Task Scheduler

1. **Criar Tarefa Agendada**
   ```powershell
   # Abrir Task Scheduler
   taskschd.msc
   ```

2. **Configurar Tarefa**
   - Nome: "Backup Seu Bolso Inteligente"
   - Trigger: Diário às 02:00
   - Action: 
     - Program: `powershell.exe`
     - Arguments: `-File "C:\caminho\para\scripts\backup-full.ps1"`

3. **Testar**
   ```powershell
   # Executar manualmente
   schtasks /run /tn "Backup Seu Bolso Inteligente"
   ```

### Script de Backup Agendado

```powershell
# scripts/backup-scheduled.ps1
# Backup automático com limpeza de backups antigos

param(
    [int]$KeepDays = 30  # Manter backups dos últimos 30 dias
)

# Executar backup
.\scripts\backup-full.ps1

# Limpar backups antigos
$cutoffDate = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem "backups" -Filter "backup_*.zip" | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } |
    Remove-Item -Force

Write-Host "✅ Backup agendado concluído!" -ForegroundColor Green
Write-Host "📊 Backups mantidos: últimos $KeepDays dias" -ForegroundColor Gray
```

---

## 📝 Checklist de Backup

### Diário (Automático)
- [ ] Backup do código fonte
- [ ] Backup das migrations
- [ ] Verificar espaço em disco

### Semanal (Manual)
- [ ] Backup do banco de dados via Dashboard
- [ ] Testar restauração em ambiente local
- [ ] Verificar integridade dos backups

### Mensal (Manual)
- [ ] Backup completo (código + banco)
- [ ] Armazenar em local externo (Google Drive, Dropbox, etc.)
- [ ] Documentar mudanças importantes
- [ ] Testar processo completo de restauração

---

## 🔒 Segurança

### Boas Práticas

1. **Armazenamento**
   - ✅ Manter backups em múltiplos locais
   - ✅ Usar armazenamento externo (cloud)
   - ✅ Criptografar backups sensíveis
   - ❌ Não commitar backups no Git

2. **Acesso**
   - ✅ Restringir acesso aos backups
   - ✅ Usar senhas fortes
   - ✅ Documentar quem tem acesso
   - ❌ Não compartilhar publicamente

3. **Testes**
   - ✅ Testar restauração regularmente
   - ✅ Documentar problemas encontrados
   - ✅ Manter procedimentos atualizados
   - ❌ Não assumir que backups funcionam sem testar

---

## 📞 Suporte

### Problemas Comuns

**Erro: Docker não está rodando**
- Solução: Iniciar Docker Desktop ou usar backup via Dashboard

**Erro: Arquivo muito grande**
- Solução: Usar compactação ou dividir em partes

**Erro: Permissão negada**
- Solução: Executar PowerShell como Administrador

### Recursos

- Documentação Supabase: https://supabase.com/docs/guides/database/backups
- Supabase CLI: https://supabase.com/docs/guides/cli
- PostgreSQL pg_dump: https://www.postgresql.org/docs/current/app-pgdump.html

---

## 📊 Status Atual

**Último Backup**:
- Data: 01/01/2026 09:56
- Código: ✅ backups/backup_20260101_095522.zip (13.31 MB)
- Migrations: ✅ 163 arquivos
- Banco: ⚠️ Pendente (fazer via Dashboard)

**Próximos Passos**:
1. Fazer backup do banco via Dashboard
2. Configurar backup agendado
3. Testar restauração em ambiente local

---

**Documento criado em**: 01/01/2025  
**Última atualização**: 01/01/2025  
**Versão**: 1.0
