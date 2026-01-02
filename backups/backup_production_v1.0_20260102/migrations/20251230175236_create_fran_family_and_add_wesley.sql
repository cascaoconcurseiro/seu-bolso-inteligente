-- Criar família de Fran
INSERT INTO families (owner_id, name)
VALUES (
  '9545d0c1-94be-4b69-b110-f939bce072ee',  -- Fran
  'Família de Fran'
)
RETURNING id;

-- Adicionar Wesley como membro da família de Fran
INSERT INTO family_members (
  family_id,
  linked_user_id,
  name,
  email,
  role,
  status,
  invited_by
)
SELECT 
  f.id,
  '56ccd60b-641f-4265-bc17-7b8705a2f8c9',  -- Wesley
  'Wesley',
  'wesley.diaslima@gmail.com',
  'editor',
  'active',
  '9545d0c1-94be-4b69-b110-f939bce072ee'  -- Fran
FROM families f
WHERE f.owner_id = '9545d0c1-94be-4b69-b110-f939bce072ee';;
