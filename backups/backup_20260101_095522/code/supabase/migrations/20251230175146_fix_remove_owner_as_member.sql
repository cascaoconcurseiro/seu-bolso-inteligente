-- Remover Wesley como membro da própria família
DELETE FROM family_members
WHERE family_id IN (
  SELECT id FROM families WHERE owner_id = linked_user_id
);

-- Verificar trigger atual
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%invitation%';;
