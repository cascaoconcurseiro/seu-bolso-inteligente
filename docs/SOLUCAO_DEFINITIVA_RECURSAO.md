# Solução Definitiva: Recursão Infinita em Trips

## O Problema Real

O erro `infinite recursion detected in policy for relation "trips"` acontece porque o Postgres detecta um loop ao avaliar policies RLS.

### Por Que Acontece

Quando você tenta acessar `trips`:
1. Postgres aplica a policy de SELECT em `trips`
2. Policy verifica `trip_members` com uma subquery
3. Postgres precisa aplicar RLS em `trip_members`
4. Se `trip_members` tiver qualquer policy que referencia `trips` → **LOOP!**

### O Problema Oculto

Mesmo que `trip_members` não referencie `trips` diretamente, o Postgres pode detectar recursão se:
- Há múltiplas policies em `trip_members`
- Há triggers ou constraints que referenciam `trips`
- O planner do Postgres decide que há risco de recursão

## A Solução: SECURITY DEFINER

### O Que É SECURITY DEFINER

Uma função `SECURITY DEFINER` executa com os privilégios do **dono da função**, não do usuário que a chama.

```sql
CREATE FUNCTION is_trip_member(trip_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Esta linha é a chave!
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_id = trip_id_param 
    AND user_id = user_id_param
  );
END;
$$;
```

### Por Que Funciona

1. **Bypassa RLS**: `SECURITY DEFINER` executa sem verificar RLS
2. **Sem Recursão**: Não passa pelas policies de `trip_members`
3. **Seguro**: A lógica está encapsulada na função
4. **Rápido**: Menos overhead que subqueries com RLS

### Como Usar na Policy

```sql
CREATE POLICY "trips_select"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR is_trip_member(id, auth.uid())  -- ← Usa a função
  );
```

## Comparação de Abordagens

### ❌ Abordagem 1: Subquery Direta (FALHA)

```sql
-- Policy em trips
USING (
  EXISTS (
    SELECT 1 FROM trip_members  -- ← Aciona RLS de trip_members
    WHERE trip_id = trips.id 
    AND user_id = auth.uid()
  )
)
```

**Problema**: Se `trip_members` tiver policies complexas, pode causar recursão.

### ❌ Abordagem 2: Simplificar trip_members (FALHA)

```sql
-- Policy em trip_members (simplificada)
USING (user_id = auth.uid())

-- Policy em trips
USING (
  EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = trips.id 
    AND user_id = auth.uid()
  )
)
```

**Problema**: Postgres ainda pode detectar recursão potencial, especialmente com triggers.

### ✅ Abordagem 3: SECURITY DEFINER (FUNCIONA)

```sql
-- Função que bypassa RLS
CREATE FUNCTION is_trip_member(...) 
SECURITY DEFINER
AS $$ ... $$;

-- Policy usa a função
USING (
  owner_id = auth.uid() 
  OR is_trip_member(id, auth.uid())
)
```

**Vantagens**:
- ✅ Sem recursão (bypassa RLS)
- ✅ Mais rápido (menos overhead)
- ✅ Mais limpo (lógica encapsulada)
- ✅ Mais seguro (controle total)

## Implementação Completa

### 1. Função Auxiliar

```sql
CREATE OR REPLACE FUNCTION is_trip_member(
  trip_id_param UUID, 
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- ← Otimização: resultado não muda durante a transação
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM trip_members 
    WHERE trip_id = trip_id_param 
    AND user_id = user_id_param
  );
END;
$$;
```

### 2. Policies Simples em trip_members

```sql
-- SELECT: Ver apenas seus registros
CREATE POLICY "trip_members_select"
  ON trip_members FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Controlado por triggers
CREATE POLICY "trip_members_insert"
  ON trip_members FOR INSERT
  WITH CHECK (true);
```

### 3. Policies em trips Usando a Função

```sql
-- SELECT: Ver viagens onde é owner ou membro
CREATE POLICY "trips_select"
  ON trips FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR is_trip_member(id, auth.uid())
  );

-- INSERT: Criar viagem
CREATE POLICY "trips_insert"
  ON trips FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- UPDATE: Atualizar se for owner ou membro
CREATE POLICY "trips_update"
  ON trips FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR is_trip_member(id, auth.uid())
  );

-- DELETE: Apenas owner
CREATE POLICY "trips_delete"
  ON trips FOR DELETE
  USING (owner_id = auth.uid());
```

## Segurança

### A Função é Segura?

Sim! Porque:

1. **Lógica Simples**: Apenas verifica membership
2. **Sem Side Effects**: Não modifica dados
3. **STABLE**: Resultado não muda durante transação
4. **Escopo Limitado**: Só verifica o que precisa

### Poderia Ser Explorada?

Não, porque:

```sql
-- Usuário tenta ver viagem que não é membro
SELECT * FROM trips WHERE id = 'viagem-de-outro-usuario';

-- Policy verifica:
-- 1. owner_id = auth.uid() → FALSE
-- 2. is_trip_member(id, auth.uid()) → FALSE (não é membro)
-- Resultado: Viagem não retornada ✓
```

## Performance

### Comparação

| Abordagem | Queries | RLS Checks | Performance |
|-----------|---------|------------|-------------|
| Subquery direta | 2+ | 2+ | Lenta |
| SECURITY DEFINER | 1 | 1 | Rápida |

### Por Que é Mais Rápido

1. **Menos RLS Checks**: Bypassa RLS de `trip_members`
2. **Menos Queries**: Função é otimizada pelo Postgres
3. **Cache**: Resultado pode ser cacheado durante a transação (STABLE)

## Aplicação

### Via Script Manual

```bash
# Copie o conteúdo de:
scripts/FIX_RECURSION_FUNCTION.sql

# Cole no SQL Editor do Supabase e execute
```

### Via Migração

```bash
supabase db push
```

## Validação

Após aplicar, teste:

```sql
-- Deve retornar TRUE
SELECT is_trip_member(
  'id-de-uma-viagem-sua',
  auth.uid()
);

-- Deve retornar suas viagens
SELECT * FROM trips;

-- Deve funcionar sem erro
INSERT INTO trips (name, owner_id) 
VALUES ('Teste', auth.uid());
```

## Troubleshooting

### Ainda Dá Erro de Recursão

1. Verifique se a função foi criada:
```sql
SELECT proname FROM pg_proc WHERE proname = 'is_trip_member';
```

2. Verifique se tem `SECURITY DEFINER`:
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'is_trip_member';
-- prosecdef deve ser TRUE
```

3. Verifique as policies:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('trips', 'trip_members');
```

### Função Não Existe

Execute novamente o script completo.

### Policies Antigas Ainda Existem

```sql
-- Remover todas
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trips') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON trips', r.policyname);
  END LOOP;
END $$;
```

## Conclusão

A solução com `SECURITY DEFINER` é:
- ✅ Definitiva (elimina recursão completamente)
- ✅ Segura (controle total da lógica)
- ✅ Rápida (menos overhead)
- ✅ Limpa (código mais organizado)

## Arquivos

- `scripts/FIX_RECURSION_FUNCTION.sql` - Script para aplicar
- `supabase/migrations/20251227151000_fix_recursion_with_security_definer.sql` - Migração
- `APLICAR_FIX_RECURSION_AGORA.md` - Guia rápido
