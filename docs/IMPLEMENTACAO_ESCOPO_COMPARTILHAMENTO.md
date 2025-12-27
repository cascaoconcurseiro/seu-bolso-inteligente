# 🎯 Implementação: Escopo de Compartilhamento

**Data:** 27/12/2024  
**Status:** EM ANDAMENTO

## ✅ O Que Foi Feito

1. **Banco de Dados**
   - ✅ Adicionados campos na tabela `family_members`:
     - `sharing_scope`: 'all' | 'trips_only' | 'date_range' | 'specific_trip'
     - `scope_start_date`: Data início (para date_range)
     - `scope_end_date`: Data fim (para date_range)
     - `scope_trip_id`: ID da viagem (para specific_trip)
   - ✅ Índice criado para performance
   - ✅ Tipos atualizados em `useFamily.ts`

2. **Frontend - Parcial**
   - ✅ Tipo `SharingScope` criado
   - ✅ Interface `FamilyMember` atualizada
   - ⏳ Componente `InviteMemberDialog` - precisa adicionar UI

## 📋 O Que Falta Fazer

### 1. Completar UI do InviteMemberDialog

Adicionar seção "Opções Avançadas" com:

```tsx
const [sharingScope, setSharingScope] = useState<SharingScope>("all");
const [scopeStartDate, setScopeStartDate] = useState("");
const [scopeEndDate, setScopeEndDate] = useState("");
const [scopeTripId, setScopeTripId] = useState("");
const [showAdvanced, setShowAdvanced] = useState(false);

// No JSX, adicionar:
<Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" size="sm" className="gap-2">
      <Settings className="h-4 w-4" />
      Opções Avançadas
      <ChevronDown className="h-4 w-4" />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="space-y-4 pt-4">
    <div className="space-y-2">
      <Label>Escopo de Compartilhamento</Label>
      <Select value={sharingScope} onValueChange={(v) => setSharingScope(v as SharingScope)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex flex-col items-start">
              <span>Tudo</span>
              <span className="text-xs text-muted-foreground">
                Compartilhar todas as transações
              </span>
            </div>
          </SelectItem>
          <SelectItem value="trips_only">
            <div className="flex flex-col items-start">
              <span>Apenas Viagens</span>
              <span className="text-xs text-muted-foreground">
                Apenas transações de viagens
              </span>
            </div>
          </SelectItem>
          <SelectItem value="date_range">
            <div className="flex flex-col items-start">
              <span>Período Específico</span>
              <span className="text-xs text-muted-foreground">
                Transações em um período
              </span>
            </div>
          </SelectItem>
          <SelectItem value="specific_trip">
            <div className="flex flex-col items-start">
              <span>Viagem Específica</span>
              <span className="text-xs text-muted-foreground">
                Apenas uma viagem
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Campos condicionais baseados no escopo */}
    {sharingScope === "date_range" && (
      <>
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Input
            type="date"
            value={scopeStartDate}
            onChange={(e) => setScopeStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Input
            type="date"
            value={scopeEndDate}
            onChange={(e) => setScopeEndDate(e.target.value)}
          />
        </div>
      </>
    )}

    {sharingScope === "specific_trip" && (
      <div className="space-y-2">
        <Label>Viagem</Label>
        <Select value={scopeTripId} onValueChange={setScopeTripId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma viagem" />
          </SelectTrigger>
          <SelectContent>
            {/* Buscar viagens do usuário */}
          </SelectContent>
        </Select>
      </div>
    )}
  </CollapsibleContent>
</Collapsible>
```

### 2. Atualizar Hook useInviteFamilyMember

Adicionar campos de escopo ao INSERT:

```typescript
const { data, error } = await supabase
  .from("family_invitations")
  .insert({
    from_user_id: user.id,
    to_user_id: existingProfile.id,
    family_id: familyId,
    member_name: name,
    role,
    status: "pending",
    // NOVOS CAMPOS:
    sharing_scope: sharingScope || 'all',
    scope_start_date: scopeStartDate || null,
    scope_end_date: scopeEndDate || null,
    scope_trip_id: scopeTripId || null,
  })
```

### 3. Atualizar Tabela family_invitations

Adicionar mesmos campos de escopo:

```sql
ALTER TABLE family_invitations
ADD COLUMN IF NOT EXISTS sharing_scope TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS scope_start_date DATE,
ADD COLUMN IF NOT EXISTS scope_end_date DATE,
ADD COLUMN IF NOT EXISTS scope_trip_id UUID REFERENCES trips(id);
```

### 4. Atualizar Trigger handle_invitation_accepted

Copiar campos de escopo ao criar membros:

```sql
INSERT INTO family_members (
  ...
  sharing_scope,
  scope_start_date,
  scope_end_date,
  scope_trip_id
)
VALUES (
  ...
  NEW.sharing_scope,
  NEW.scope_start_date,
  NEW.scope_end_date,
  NEW.scope_trip_id
);
```

### 5. Atualizar useSharedFinances

Filtrar transações baseado no escopo do membro:

```typescript
// Ao buscar transações compartilhadas, verificar escopo
const member = members.find(m => m.id === memberId);
if (!member) return [];

let query = supabase.from('transactions').select('*');

switch (member.sharing_scope) {
  case 'trips_only':
    query = query.not('trip_id', 'is', null);
    break;
  case 'date_range':
    if (member.scope_start_date) {
      query = query.gte('date', member.scope_start_date);
    }
    if (member.scope_end_date) {
      query = query.lte('date', member.scope_end_date);
    }
    break;
  case 'specific_trip':
    if (member.scope_trip_id) {
      query = query.eq('trip_id', member.scope_trip_id);
    }
    break;
  // 'all' não precisa filtro
}
```

### 6. UI para Mostrar Escopo

Na página Family, mostrar badge indicando o escopo:

```tsx
{member.sharing_scope !== 'all' && (
  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
    {member.sharing_scope === 'trips_only' && '🧳 Apenas Viagens'}
    {member.sharing_scope === 'date_range' && `📅 ${member.scope_start_date} - ${member.scope_end_date}`}
    {member.sharing_scope === 'specific_trip' && '🎯 Viagem Específica'}
  </span>
)}
```

## 🎯 Casos de Uso

### Caso 1: Amigo em Viagem
- Adicionar amigo com escopo "date_range"
- Definir datas da viagem
- Amigo vê apenas transações desse período
- Após viagem, transações antigas permanecem visíveis
- Novas transações não aparecem

### Caso 2: Compartilhar Apenas Viagens
- Adicionar pessoa com escopo "trips_only"
- Pessoa vê apenas transações com trip_id
- Transações regulares não aparecem

### Caso 3: Viagem Específica
- Adicionar pessoa com escopo "specific_trip"
- Selecionar viagem
- Pessoa vê apenas transações daquela viagem

## 📝 Próximos Passos

1. Completar UI do InviteMemberDialog
2. Atualizar tabela family_invitations
3. Atualizar trigger
4. Implementar filtros no useSharedFinances
5. Adicionar UI de visualização do escopo
6. Testar todos os casos de uso

---

**Quer que eu continue implementando agora?**
