-- Script para debugar policies e encontrar recursão

-- Ver todas as policies de trips
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('trips', 'trip_members')
ORDER BY tablename, policyname;

-- Ver definição completa das policies
SELECT 
  tablename,
  policyname,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
WHERE c.relname IN ('trips', 'trip_members')
ORDER BY c.relname, p.polname;
