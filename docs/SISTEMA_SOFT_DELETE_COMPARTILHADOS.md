# Sistema de Soft Delete para Entidades Compartilhadas

## 📋 Visão Geral

Implementação completa de **soft delete** para família, viagens e membros compartilhados. Este sistema preserva o histórico completo e evita "órfãos" no banco de dados quando membros saem ou são removidos.

## 🎯 Problema Resolvido

### Cenário: "Divórcio Digital"
Quando um membro sai do grupo familiar ou de uma viagem:
- ❌ **Antes**: Deletar o membro causava perda de histórico e transações órfãs
- ✅ **Agora**: Membro é marcado como `inactive`, histórico preservado, dados íntegros

## 🏗️ Arquitetura

### 1. Tabelas Atualizadas

#### `family_members`
```sql
status          text      -- 'active', 'inactive', 'pending'
removed_at      timestamptz
removed_by      uuid      -- quem removeu
removal_reason  text      -- motivo (opcional)
```

#### `trip_members`
```sql
status          text      -- 'active', 'inactive', 'pending'
removed_at      timestamptz
removed_by      uuid
removal_reason  text
```

#### `trips`
```sql
deleted         boolean   -- soft delete
deleted_at      timestamptz
deleted_by      uuid
```

#### `families`
```sql
deleted         boolean   -- soft delete
deleted_at      timestamptz
deleted_by      uuid
```

#### `trip_invitations` e `family_invitations`
```sql
deleted         boolean   -- para convites expirados
deleted_at      timestamptz
```

### 2. Índices de Performance

```sql
-- Filtrar membros ativos (mais comum)
idx_family_members_status_active
idx_trip_members_status_active

-- Filtrar viagens/famílias não deletadas
idx_trips_not_deleted
idx_families_not_deleted
```

## 🔧 Funções Disponíveis

### Remover Membro da Família
```sql
select public.remove_family_member(
  p_member_id := 'uuid-do-membro',
  p_removed_by := 'uuid-do-usuario',  -- opcional
  p_reason := 'Saiu do grupo'         -- opcional
);
```

### Remover Membro da Viagem
```sql
select public.remove_trip_member(
  p_member_id := 'uuid-do-membro',
  p_removed_by := 'uuid-do-usuario',
  p_reason := 'Cancelou participação'
);
```

### Reativar Membro da Família
```sql
select public.reactivate_family_member(
  p_member_id := 'uuid-do-membro'
);
```

### Reativar Membro da Viagem
```sql
select public.reactivate_trip_member(
  p_member_id := 'uuid-do-membro'
);
```

## 📊 Views Auxiliares

### Membros Ativos
```sql
-- Apenas membros ativos da família
select * from public.active_family_members;

-- Apenas membros ativos de viagens
select * from public.active_trip_members;
```

### Entidades Ativas
```sql
-- Apenas viagens não deletadas
select * from public.active_trips;

-- Apenas famílias não deletadas
select * from public.active_families;
```

## 💻 Uso no Frontend

### Listar Membros Ativos

**Antes:**
```typescript
const { data } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_id', familyId);
```

**Agora (Recomendado):**
```typescript
// Opção 1: Usar view
const { data } = await supabase
  .from('active_family_members')
  .select('*')
  .eq('family_id', familyId);

// Opção 2: Filtrar por status
const { data } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_id', familyId)
  .eq('status', 'active');
```

### Remover Membro

```typescript
// Soft delete via função
const { error } = await supabase.rpc('remove_family_member', {
  p_member_id: memberId,
  p_removed_by: currentUserId,
  p_reason: 'Usuário solicitou saída'
});

if (!error) {
  toast.success('Membro removido com sucesso');
  // Histórico preservado!
}
```

### Mostrar Histórico Completo

```typescript
// Incluir membros inativos no histórico
const { data: allMembers } = await supabase
  .from('family_members')
  .select('*')
  .eq('family_id', familyId)
  .order('status', { ascending: false }); // ativos primeiro

// Agrupar por status
const active = allMembers.filter(m => m.status === 'active');
const inactive = allMembers.filter(m => m.status === 'inactive');
```

### Reativar Membro

```typescript
const { error } = await supabase.rpc('reactivate_family_member', {
  p_member_id: memberId
});

if (!error) {
  toast.success('Membro reativado!');
}
```

## 🎨 UI/UX Recomendações

### 1. Botão "Remover da Família"
```tsx
<Button
  variant="destructive"
  onClick={() => handleRemoveMember(member.id)}
>
  <UserMinus className="h-4 w-4 mr-2" />
  Remover da Família
</Button>
```

### 2. Seção de Membros Inativos (Opcional)
```tsx
{inactiveMembers.length > 0 && (
  <Collapsible>
    <CollapsibleTrigger>
      <span className="text-muted-foreground">
        Membros Inativos ({inactiveMembers.length})
      </span>
    </CollapsibleTrigger>
    <CollapsibleContent>
      {inactiveMembers.map(member => (
        <div key={member.id} className="opacity-50">
          <span>{member.name}</span>
          <span className="text-xs">
            Saiu em {format(member.removed_at, 'dd/MM/yyyy')}
          </span>
          <Button size="sm" onClick={() => reactivate(member.id)}>
            Reativar
          </Button>
        </div>
      ))}
    </CollapsibleContent>
  </Collapsible>
)}
```

### 3. Badge de Status
```tsx
{member.status === 'inactive' && (
  <Badge variant="secondary">
    <UserX className="h-3 w-3 mr-1" />
    Inativo
  </Badge>
)}
```

## 🔒 Segurança (RLS)

As views herdam automaticamente as políticas RLS das tabelas base:
```sql
alter view public.active_family_members set (security_invoker = on);
```

Isso garante que usuários só vejam membros das suas próprias famílias/viagens.

## ✅ Vantagens

1. **Histórico Preservado**: Transações antigas mantêm referência ao membro
2. **Auditoria Completa**: Sabe-se quem removeu, quando e por quê
3. **Reversível**: Possibilidade de reativar membros
4. **Integridade**: Sem órfãos no banco de dados
5. **Performance**: Índices otimizados para queries mais comuns
6. **Flexibilidade**: Views facilitam queries sem repetir filtros

## 📈 Próximos Passos

### Frontend
- [ ] Atualizar queries para usar `status = 'active'` ou views
- [ ] Adicionar botão "Remover da Família/Viagem"
- [ ] Implementar seção de membros inativos (opcional)
- [ ] Adicionar confirmação antes de remover
- [ ] Mostrar badge de status nos membros

### Backend
- [ ] Atualizar tipos TypeScript gerados
- [ ] Criar hooks customizados para soft delete
- [ ] Adicionar testes para funções de remoção/reativação

## 🧪 Testes

### Cenário 1: Remover Membro
1. Criar família com 2 membros
2. Remover membro B
3. Verificar: `status = 'inactive'`, `removed_at` preenchido
4. Verificar: Transações antigas ainda mostram nome do membro B
5. Verificar: Novos compartilhamentos não incluem membro B

### Cenário 2: Reativar Membro
1. Remover membro
2. Reativar membro
3. Verificar: `status = 'active'`, `removed_at = null`
4. Verificar: Membro aparece em novos compartilhamentos

### Cenário 3: Histórico
1. Criar transação compartilhada com membro B
2. Remover membro B
3. Verificar: Transação antiga ainda mostra membro B
4. Verificar: Extrato de compartilhados preserva histórico

## 📝 Migration Aplicada

```
supabase/migrations/XXXXXX_add_soft_delete_to_shared_entities.sql
```

Status: ✅ **Aplicada em produção**

---

**Documentação criada em**: 03/01/2026  
**Versão**: 1.0  
**Autor**: Sistema Seu Bolso Inteligente
