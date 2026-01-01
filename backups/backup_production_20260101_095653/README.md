# Backup de Produção - Seu Bolso Inteligente
Data: 01/01/2026 09:57:01
Timestamp: 20260101_095653
Project: vrrcagukyfnlhxuvnssp

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
```powershell
# Iniciar Supabase local
npx supabase start

# Resetar banco local
npx supabase db reset --local

# Restaurar dados
psql -h localhost -p 54322 -U postgres -d postgres < database/schema_full.sql
```

### 2. Restaurar em Produção (CUIDADO!)
```powershell
# ATENÇÃO: Isso irá SOBRESCREVER todos os dados de produção!

# Opção 1: Via Supabase Dashboard
# 1. Acesse: https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/database/backups
# 2. Faça upload do arquivo schema_full.sql
# 3. Execute a restauração

# Opção 2: Via CLI (requer confirmação)
npx supabase db push --linked
```

## Notas Importantes

- ⚠️ Este backup contém dados REAIS de produção
- ⚠️ Mantenha em local SEGURO
- ⚠️ NÃO compartilhe publicamente
- ⚠️ Contém informações sensíveis de usuários
- ✅ Use para disaster recovery
- ✅ Teste restauração em ambiente local primeiro

## Informações do Sistema

Data do Backup: 01/01/2026 09:57:01
Project ID: vrrcagukyfnlhxuvnssp
Supabase CLI: 2.70.5
