# Scripts Obsoletos - Sistema de Viagens

## 📋 Resumo

Este documento lista scripts que foram substituídos pela migration `20251227145010_fix_trip_system.sql` e podem ser removidos com segurança.

## ✅ Migration Atual

**Arquivo:** `supabase/migrations/20251227145010_fix_trip_system.sql`

**O que faz:**
- Corrige trigger `add_trip_owner()` com ON CONFLICT
- Simplifica política RLS de SELECT em trips
- Corrige trigger `handle_trip_invitation_accepted()` com ON CONFLICT
- Corrige dados inconsistentes (owners faltando, duplicatas, etc.)
- Valida integridade automaticamente

**Status:** ✅ Ativa e funcional

## 🗑️ Scripts Obsoletos (Podem ser removidos)

### 1. `scripts/FIX_RLS_TRIP_MEMBERS_ACEITAR_CONVITE.sql`

**Por que é obsoleto:**
- Tentava corrigir políticas RLS de trip_members
- A migration atual simplifica e corrige todas as políticas RLS
- Não é mais necessário

**Substituído por:**
- Migration `20251227145010_fix_trip_system.sql` (seção 2 e 3)

**Pode remover:** ✅ Sim

---

### 2. `scripts/CONSOLIDATE_RLS_TRIP_MEMBERS.sql`

**Por que é obsoleto:**
- Tentava consolidar políticas RLS antigas
- A migration atual já faz isso de forma mais completa
- Não é mais necessário

**Substituído por:**
- Migration `20251227145010_fix_trip_system.sql` (seção 2)

**Pode remover:** ✅ Sim

---

### 3. `scripts/REPARAR_CONVITES_VIAGEM.sql`

**Por que é obsoleto:**
- Tentava reparar sistema de convites
- A migration atual corrige o trigger de convites com ON CONFLICT
- Não é mais necessário

**Substituído por:**
- Migration `20251227145010_fix_trip_system.sql` (seção 3)

**Pode remover:** ✅ Sim

---

### 4. `scripts/FIX_FINAL_CONVITES_VIAGEM.sql`

**Por que é obsoleto:**
- Tentava fazer fix final do sistema de convites
- A migration atual já faz isso de forma definitiva
- Não é mais necessário

**Substituído por:**
- Migration `20251227145010_fix_trip_system.sql` (seção 3 e 4)

**Pode remover:** ✅ Sim

---

### 5. `scripts/FIX_COMPLETO_SISTEMA_VIAGENS.sql`

**Por que é obsoleto:**
- Tentava fazer fix completo do sistema
- A migration atual é mais completa e testada
- Não é mais necessário

**Substituído por:**
- Migration `20251227145010_fix_trip_system.sql` (todas as seções)

**Pode remover:** ✅ Sim

---

## 📚 Scripts de Diagnóstico (Manter para referência)

### 1. `scripts/DIAGNOSTICO_CONVITES_VIAGEM.sql`

**Por que manter:**
- Útil para diagnosticar problemas futuros
- Não modifica dados, apenas consulta
- Pode ser útil para debug

**Status:** 📌 Manter

---

### 2. `scripts/DEBUG_CONVITE_ACEITO.sql`

**Por que manter:**
- Útil para debug de convites
- Não modifica dados
- Pode ser útil no futuro

**Status:** 📌 Manter

---

### 3. `scripts/validate-trip-integrity.sql`

**Por que manter:**
- Script de validação atual
- Essencial para verificar integridade
- Deve ser executado regularmente

**Status:** ✅ Ativo - Manter

---

## 🔄 Scripts de Aplicação (Manter)

### 1. `scripts/APLICAR_FIX_TRIP_SYSTEM.sql`

**Por que manter:**
- Script atual de aplicação da correção
- Necessário para aplicar a migration manualmente
- Inclui validação

**Status:** ✅ Ativo - Manter

---

## 📊 Resumo de Ações

| Script | Status | Ação |
|--------|--------|------|
| `FIX_RLS_TRIP_MEMBERS_ACEITAR_CONVITE.sql` | Obsoleto | ❌ Remover |
| `CONSOLIDATE_RLS_TRIP_MEMBERS.sql` | Obsoleto | ❌ Remover |
| `REPARAR_CONVITES_VIAGEM.sql` | Obsoleto | ❌ Remover |
| `FIX_FINAL_CONVITES_VIAGEM.sql` | Obsoleto | ❌ Remover |
| `FIX_COMPLETO_SISTEMA_VIAGENS.sql` | Obsoleto | ❌ Remover |
| `DIAGNOSTICO_CONVITES_VIAGEM.sql` | Diagnóstico | 📌 Manter |
| `DEBUG_CONVITE_ACEITO.sql` | Debug | 📌 Manter |
| `validate-trip-integrity.sql` | Validação | ✅ Manter |
| `APLICAR_FIX_TRIP_SYSTEM.sql` | Aplicação | ✅ Manter |

## 🎯 Como Remover

Execute os seguintes comandos no terminal:

```bash
# Remover scripts obsoletos
del scripts\FIX_RLS_TRIP_MEMBERS_ACEITAR_CONVITE.sql
del scripts\CONSOLIDATE_RLS_TRIP_MEMBERS.sql
del scripts\REPARAR_CONVITES_VIAGEM.sql
del scripts\FIX_FINAL_CONVITES_VIAGEM.sql
del scripts\FIX_COMPLETO_SISTEMA_VIAGENS.sql
```

Ou manualmente:
1. Abra a pasta `scripts/`
2. Delete os 5 arquivos listados acima
3. Mantenha os scripts de diagnóstico e validação

## ⚠️ Importante

Antes de remover, certifique-se de que:
1. ✅ A migration `20251227145010_fix_trip_system.sql` foi aplicada com sucesso
2. ✅ O script de validação não mostra problemas
3. ✅ O sistema de viagens está funcionando corretamente
4. ✅ Você testou criar viagens e aceitar convites

## 📅 Data

**Criado em:** 27/12/2024
**Spec:** fix-trip-system-database
**Migration:** 20251227145010_fix_trip_system.sql
