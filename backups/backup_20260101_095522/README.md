# Backup Completo - Seu Bolso Inteligente
Data: 01/01/2026 09:56:04
Timestamp: 20260101_095522

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
```powershell
# Copiar arquivos do backup
Copy-Item -Path "code/*" -Destination "./" -Recurse -Force

# Instalar dependências
bun install
```

### 2. Restaurar Banco de Dados
```powershell
# Iniciar Supabase local
bun supabase start

# Restaurar schema completo
bun supabase db reset --local

# OU restaurar manualmente
psql -h localhost -p 54322 -U postgres -d postgres < database/schema_full.sql
```

### 3. Aplicar Migrations
```powershell
# Copiar migrations
Copy-Item -Path "migrations/*" -Destination "supabase/migrations/" -Recurse -Force

# Aplicar migrations
bun supabase db push --local
```

### 4. Verificar
```powershell
# Verificar status
bun supabase status

# Gerar types
bun supabase gen types --local > src/integrations/supabase/types.ts

# Iniciar aplicação
bun run dev
```

## Notas Importantes

- Este backup contém TODOS os dados do banco de dados
- Inclui todas as migrations aplicadas
- Inclui código fonte completo (exceto node_modules e dist)
- Para restaurar em produção, use o Supabase Dashboard
- Mantenha este backup em local seguro

## Informações do Sistema

Node Version: v22.21.0
Bun Version: Not installed
Supabase CLI: 2.70.5
