-- Adiciona política de INSERT para o audit_log para permitir que a trigger funcione corretamente

CREATE POLICY "Enable insert for authenticated users only"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
);
