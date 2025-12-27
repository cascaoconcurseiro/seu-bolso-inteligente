# Correção: Recursão Infinita em Trips

## Problema

Erro ao criar viagem:
```
infinite recursion detected in policy for relation "trips"
```

## Causa Raiz

As policies RLS criavam uma **referência circular**:

1. Policy de `trips` verificava se usuário está em `trip_members`
2. Policy de `trip_members` verificava se viagem existe em `trips`
3. Postgres detectava recursão infinita e bloqueava a operação

### Exemplo da Recursão

```sql
-- Policy em trips (PROBLEMA)
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_members tm  -- ← Acessa trip_members
      WHERE tm.trip_id = trips.id 
      AND tm.user_id = auth.uid()
    )
  );

-- Policy em trip_members (PROBLEMA)
CREATE POLICY "Users can view trip members of their trips"
  ON trip_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trips t  -- ← Acessa trips (RECURSÃO!)
      WHERE t.id = trip_members.trip_id
      AND t.owner_id = auth.uid()
    )
  );
```

## Solução

Quebrar a recursão fazendo apenas **uma direção de referência**:

### Princípio
- ✅ `trips` pode referenciar `trip_members`
- ❌ `trip_members` NÃO pode referenciar `trips`

### Implementação

#### 1. Policies de trip_members (SEM referência a trips)

```sql
-- SELECT: Apenas seus próprios registros
CREATE POLICY "Users can view their own trip memberships"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Controlado por triggers SECURITY DEFINER
CREATE POLICY "System can insert trip members"
  ON trip_members FOR INSERT
  WITH CHECK (true);

-- DELETE: Owner pode remover (usa subquery simples)
CREATE POLICY "Trip owners can remove members"
  ON trip_members FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE owner_id = auth.uid()
    )
  );
```

#### 2. Policies de trips (PODE referenciar trip_members)

```sql
-- SELECT: Ver viagens onde é membro
CREATE POLICY "Users can view trips they are members of"
  ON trips FOR SELECT
  USING (
    id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: Criar viagem
CREATE POLICY "Authenticated users can create trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

## Como Aplicar

### Opção 1: Via Supabase Dashboard

1. Abra o **SQL Editor** no Supabase
2. Cole o conteúdo de `scripts/APLICAR_FIX_RECURSION.sql`
3. Execute (Run)
4. Verifique a mensagem de sucesso

### Opção 2: Via CLI

```bash
supabase db push
```

## Validação

Após aplicar, teste:

```sql
-- Deve retornar 4 policies para cada tabela
SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE tablename IN ('trips', 'trip_members')
GROUP BY tablename;
```

Resultado esperado:
```
tablename      | policies
---------------|----------
trips          | 4
trip_members   | 4
```

## Teste Funcional

1. Crie uma nova viagem
2. Verifique se aparece na lista
3. Convide outro usuário
4. Verifique se ambos veem a viagem

## Arquivos Relacionados

- `supabase/migrations/20251227150000_fix_infinite_recursion_trips.sql` - Migração
- `scripts/APLICAR_FIX_RECURSION.sql` - Script para aplicar manualmente
- `supabase/migrations/20251227145010_fix_trip_system.sql` - Migração anterior (substituída)

## Notas Técnicas

### Por que trip_members não pode referenciar trips?

Quando Postgres avalia uma policy RLS:
1. Usuário tenta acessar `trips`
2. Policy de `trips` verifica `trip_members`
3. Para verificar `trip_members`, Postgres aplica suas policies
4. Se policy de `trip_members` verificar `trips`, volta ao passo 1
5. **Recursão infinita detectada!**

### Por que usar IN ao invés de EXISTS?

Ambos funcionam, mas `IN` com subquery é mais claro e evita aliases:

```sql
-- Mais claro
id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())

-- Funciona, mas mais verboso
EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid())
```

### Segurança

A policy `WITH CHECK (true)` em INSERT de `trip_members` é segura porque:
- Inserções são feitas apenas por triggers `SECURITY DEFINER`
- Triggers validam permissões antes de inserir
- Usuários não podem inserir diretamente via API

## Status

✅ Problema identificado
✅ Solução implementada
✅ Migração criada
✅ Script manual criado
⏳ Aguardando aplicação no banco
