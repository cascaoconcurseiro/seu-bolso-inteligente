# 🚀 Quick Start - Restauração de Backup

## Restauração Rápida em 5 Passos

### 1️⃣ Extrair Código
```powershell
Expand-Archive -Path "backup_20260101_095522.zip" -DestinationPath "restore"
cd restore/code
```

### 2️⃣ Instalar Dependências
```powershell
npm install
```

### 3️⃣ Iniciar Supabase Local
```powershell
npx supabase start
```

### 4️⃣ Restaurar Banco de Dados
```powershell
$env:PGPASSWORD = "postgres"
psql -h localhost -p 54322 -U postgres -d postgres < ../database/production_backup_20260101_130000.sql
```

### 5️⃣ Iniciar Aplicação
```powershell
npm run dev
```

---

## 📋 Checklist Rápido

- [ ] Node.js 18+ instalado
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] PostgreSQL client instalado (psql)
- [ ] Docker Desktop rodando (para Supabase local)
- [ ] Arquivo .env configurado

---

## ⚠️ Problemas Comuns

### Erro: "Docker não está rodando"
**Solução**: Iniciar Docker Desktop

### Erro: "psql não encontrado"
**Solução**: Instalar PostgreSQL client
```powershell
winget install PostgreSQL.PostgreSQL
```

### Erro: "Supabase CLI não encontrado"
**Solução**: Instalar Supabase CLI
```powershell
npm install -g supabase
```

---

## 📞 Ajuda

Ver documentação completa em:
- `README_BACKUP_01_01_2026.md`
- `../docs/GUIA_BACKUP_COMPLETO.md`
