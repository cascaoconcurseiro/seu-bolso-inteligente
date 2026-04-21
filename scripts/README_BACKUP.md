# 🔒 Backup do Banco de Dados - 20/04/2026

## ⚠️ IMPORTANTE: Fazer Backup ANTES de Aplicar Correções

Antes de implementar as correções da auditoria, é **OBRIGATÓRIO** fazer backup do banco de dados.

---

## 📋 OPÇÃO 1: Backup via Supabase Dashboard (RECOMENDADO)

### Passo a Passo:

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login
   - Selecione o projeto "Pé de Meia"

2. **Vá para Database > Backups**
   - Menu lateral: Database
   - Aba: Backups

3. **Crie um Novo Backup**
   - Clique em "Create Backup"
   - Nome: `backup_before_audit_fixes_20_04_2026`
   - Descrição: "Backup antes de aplicar correções da auditoria de 20/04/2026"
   - Clique em "Create"

4. **Aguarde Conclusão**
   - O backup pode levar alguns minutos
   - Aguarde até status = "Completed"

5. **Anote o ID do Backup**
   - Copie o ID do backup para referência
   - Guarde em local seguro

### Vantagens:
- ✅ Backup completo (dados + schema + functions)
- ✅ Armazenado externamente
- ✅ Fácil restauração via dashboard
- ✅ Não ocupa espaço no banco

---

## 📋 OPÇÃO 2: Backup via SQL (Alternativa)

### Executar Script:

```bash
# Conectar ao banco via psql
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Executar script de backup
\i scripts/backup-before-audit-fixes.sql
```

### Ou via Supabase SQL Editor:

1. Acesse: Database > SQL Editor
2. Abra o arquivo: `scripts/backup-before-audit-fixes.sql`
3. Execute o script completo
4. Verifique a saída para confirmar sucesso

### Vantagens:
- ✅ Rápido
- ✅ Pode ser automatizado
- ✅ Backup local no banco

### Desvantagens:
- ⚠️ Ocupa espaço no banco
- ⚠️ Não inclui functions/triggers
- ⚠️ Restauração manual

---

## 🔍 VERIFICAR BACKUP

### Via Dashboard:
- Database > Backups
- Verificar que backup aparece na lista
- Status = "Completed"

### Via SQL:
```sql
-- Verificar schema de backup
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name = 'backup_20260420';

-- Contar registros
SELECT 
  'transactions' as tabela,
  (SELECT COUNT(*) FROM public.transactions) as original,
  (SELECT COUNT(*) FROM backup_20260420.transactions) as backup;
```

---

## 🔄 RESTAURAR BACKUP (Se Necessário)

### Via Dashboard:
1. Database > Backups
2. Encontre o backup: `backup_before_audit_fixes_20_04_2026`
3. Clique em "..." > "Restore"
4. Confirme a restauração
5. Aguarde conclusão

### Via SQL:
```sql
-- Ver script de restauração em:
-- scripts/backup-before-audit-fixes.sql
-- Seção: SCRIPT DE RESTAURAÇÃO
```

⚠️ **ATENÇÃO**: Restaurar backup irá **SOBRESCREVER** todos os dados atuais!

---

## 📊 CHECKLIST PRÉ-CORREÇÕES

Antes de aplicar qualquer correção, confirme:

- [ ] Backup criado via Supabase Dashboard
- [ ] Backup com status "Completed"
- [ ] ID do backup anotado
- [ ] Verificação de contagem de registros OK
- [ ] Backup tem menos de 24h (fresco)

---

## 🗑️ LIMPAR BACKUP (Após 7 Dias)

### Se usou Opção 1 (Dashboard):
- Backups são mantidos automaticamente
- Pode deletar manualmente se necessário

### Se usou Opção 2 (SQL):
```sql
-- Após confirmar que tudo funciona (7+ dias)
DROP SCHEMA IF EXISTS backup_20260420 CASCADE;
```

---

## 📝 REGISTRO DE BACKUPS

| Data | Tipo | Nome | Status | Notas |
|------|------|------|--------|-------|
| 20/04/2026 | Dashboard | backup_before_audit_fixes_20_04_2026 | ✅ | Antes de correções da auditoria |
| 20/04/2026 | SQL | backup_20260420 | ⏳ | Schema local |

---

## 🆘 EM CASO DE PROBLEMA

1. **NÃO ENTRE EM PÂNICO**
2. **NÃO FAÇA MAIS ALTERAÇÕES**
3. **Restaure o backup imediatamente**
4. **Documente o que deu errado**
5. **Revise o que causou o problema**
6. **Corrija e tente novamente**

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Supabase Support**: https://supabase.com/support
- **Documentação**: https://supabase.com/docs/guides/database/backups

---

**Criado**: 20/04/2026  
**Atualizado**: 20/04/2026  
**Responsável**: Time de Desenvolvimento
