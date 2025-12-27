# 🚨 APLICAR AGORA: Fix Recursão Infinita

## Problema
```
Erro ao criar viagem: infinite recursion detected in policy for relation "trips"
```

## ⚡ Solução DEFINITIVA

### 1️⃣ Abra o Supabase Dashboard
https://supabase.com/dashboard/project/YOUR_PROJECT/sql

### 2️⃣ Cole e Execute

Copie TODO o conteúdo do arquivo:
```
scripts/FIX_RECURSION_FUNCTION.sql
```

**IMPORTANTE**: Execute TODO o script de uma vez!

### 3️⃣ Verifique o Sucesso

Você deve ver:
```
✓✓✓ TUDO CORRETO! ✓✓✓

A recursão foi eliminada usando SECURITY DEFINER
Você pode criar viagens agora!
```

### 4️⃣ Teste

Tente criar uma viagem novamente. Deve funcionar!

## O Que Foi Corrigido

- ❌ **Antes**: Policies faziam referência circular causando recursão
- ✅ **Depois**: Usa função `SECURITY DEFINER` que bypassa RLS

### Como Funciona

A função `is_trip_member()` tem `SECURITY DEFINER`, que significa:
- Executa com privilégios do dono (bypassa RLS)
- Não causa recursão porque não passa pelas policies
- É segura porque só verifica membership

## Por Que as Outras Soluções Falharam

Qualquer policy que referencia outra tabela com RLS pode causar recursão:
- `trips` referencia `trip_members` → Postgres verifica RLS de `trip_members`
- Se `trip_members` tiver qualquer policy complexa → Pode causar recursão

A solução com `SECURITY DEFINER` elimina isso completamente.

## Arquivos

- 📄 `scripts/FIX_RECURSION_FUNCTION.sql` - **Execute este!**
- 📄 `scripts/DEBUG_POLICIES.sql` - Para debugar policies atuais
- 📖 `docs/FIX_RECURSAO_INFINITA_TRIPS.md` - Documentação
