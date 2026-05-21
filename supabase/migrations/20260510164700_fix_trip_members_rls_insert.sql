-- 1. Adicionar política de INSERT para trip_members
-- Permite que o dono da viagem adicione membros
DROP POLICY IF EXISTS "trip_members_insert" ON public.trip_members;
CREATE POLICY "trip_members_insert" ON public.trip_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id AND owner_id = auth.uid()
  )
);

-- 2. Atualizar política de UPDATE para trip_members
-- Permite que o dono da viagem altere membros, ou o próprio membro altere seu registro (ex: personal_budget)
DROP POLICY IF EXISTS "trip_members_update" ON public.trip_members;
CREATE POLICY "trip_members_update" ON public.trip_members
FOR UPDATE USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id AND owner_id = auth.uid()
  )
) WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id AND owner_id = auth.uid()
  )
);

-- 3. Atualizar política de DELETE para trip_members
-- Permite que o dono da viagem remova membros, ou o próprio membro saia da viagem
DROP POLICY IF EXISTS "trip_members_delete" ON public.trip_members;
CREATE POLICY "trip_members_delete" ON public.trip_members
FOR DELETE USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = trip_id AND owner_id = auth.uid()
  )
);
