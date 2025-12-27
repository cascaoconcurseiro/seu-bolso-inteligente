# ✅ CORREÇÃO: Políticas RLS de family_members

## 🎯 Problema Resolvido

**Erro**: "infinite recursion detected in policy for relation family_members"

**Causa**: A política `family_members_can_update_role` tinha uma recursão - consultava a própria tabela `family_members` dentro da política de `family_members`.

## 🔧 Solução Aplicada

Recriadas todas as políticas RLS de forma simplificada e sem recursão:

### 1. ✅ SELECT (Visualizar)
Usuário pode ver membros se:
- É dono da família
- É o próprio membro
- Está vinculado ao membro

### 2. ✅ INSERT (Adicionar)
Apenas dono da família pode adicionar membros

### 3. ✅ UPDATE (Atualizar)
Usuário pode atualizar se:
- É dono da família (pode atualizar tudo, incluindo permissões)
- É o próprio membro (pode atualizar apenas avatar)

### 4. ✅ DELETE (Remover)
Apenas dono da família pode remover membros

## 📝 Como Funciona Agora

### Cenário: Wesley quer definir permissões de Fran

1. **Wesley é dono da sua família** ✅
2. **Fran é membro da família de Wesley** ✅
3. **Wesley pode atualizar a permissão de Fran** ✅

### Permissões Disponíveis

- **Admin**: Controle total (adicionar/remover membros, alterar permissões)
- **Editor**: Pode criar e editar transações
- **Viewer**: Apenas visualizar

## 🧪 Como Testar

1. Faça login como Wesley
2. Vá em "Família" ou "Configurações"
3. Encontre Fran na lista de membros
4. Clique para editar a permissão
5. Escolha: Admin, Editor ou Viewer
6. Salvar

**Resultado Esperado**: Permissão atualizada sem erro de recursão! ✅

## 📊 Estado Atual

### Famílias Configuradas

**Família de Wesley**:
- Dono: Wesley
- Membros: Fran (editor)

**Família de Fran**:
- Dono: Fran
- Membros: Wesley (editor)

### Políticas RLS Ativas

- ✅ `family_members_select_policy` - Visualizar
- ✅ `family_members_insert_policy` - Adicionar
- ✅ `family_members_update_policy` - Atualizar
- ✅ `family_members_delete_policy` - Remover

## 🎉 Resultado

Agora você pode:
- ✅ Adicionar membros na sua família
- ✅ Definir permissões (admin/editor/viewer)
- ✅ Atualizar permissões sem erro de recursão
- ✅ Remover membros
- ✅ Criar transações compartilhadas

---

**Data**: 26/12/2024  
**Status**: ✅ RESOLVIDO  
**Migração**: fix_family_members_rls_policies
