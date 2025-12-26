# 🚀 APLICAR BANCO DE DADOS - INSTRUÇÕES SIMPLES

## ✅ O QUE FAZER AGORA

### Passo 1: Abrir SQL Editor do Supabase

Clique neste link:
👉 **https://supabase.com/dashboard/project/vrrcagukyfnlhxuvnssp/sql**

### Passo 2: Copiar e Colar o Script

1. Abra o arquivo: `scripts/apply-migrations-direct.sql`
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione Ctrl+Enter)

### Passo 3: Aguardar

O script vai criar:
- ✅ Todos os tipos enumerados
- ✅ Todas as tabelas
- ✅ Todas as funções
- ✅ Todos os triggers
- ✅ Todas as RLS policies

**Tempo estimado**: 10-30 segundos

### Passo 4: Verificar

Execute este comando no SQL Editor para verificar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Deve retornar**:
- accounts
- categories
- families
- family_members
- profiles
- shared_transaction_mirrors
- transaction_splits
- transactions
- trip_checklist
- trip_itinerary
- trip_participants
- trips

## ✅ PRONTO!

Após executar o script, seu banco estará 100% configurado e pronto para uso!

## 🎯 PRÓXIMO PASSO

Teste a aplicação:
1. Faça login/signup
2. Crie uma conta
3. Crie uma transação compartilhada parcelada em viagem
4. Verifique se as parcelas aparecem corretamente

---

**Qualquer problema?** Consulte `docs/INSTRUCOES_APLICAR_MIGRACOES.md`
