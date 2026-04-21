-- ============================================
-- BACKUP COMPLETO DO BANCO DE DADOS
-- Data: 20/04/2026
-- Motivo: Antes de aplicar correções da auditoria
-- ============================================

-- INSTRUÇÕES:
-- 1. Acesse o Supabase Dashboard
-- 2. Vá em Database > Backups
-- 3. Clique em "Create Backup" e nomeie: "backup_before_audit_fixes_20_04_2026"
-- 4. Aguarde conclusão do backup
-- 5. Anote o ID do backup para restauração se necessário

-- OU execute este script para fazer backup manual:

-- ============================================
-- BACKUP DE TODAS AS TABELAS
-- ============================================

-- Criar schema temporário para backup
CREATE SCHEMA IF NOT EXISTS backup_20260420;

-- Copiar todas as tabelas principais
CREATE TABLE backup_20260420.profiles AS SELECT * FROM public.profiles;
CREATE TABLE backup_20260420.accounts AS SELECT * FROM public.accounts;
CREATE TABLE backup_20260420.categories AS SELECT * FROM public.categories;
CREATE TABLE backup_20260420.transactions AS SELECT * FROM public.transactions;
CREATE TABLE backup_20260420.transaction_splits AS SELECT * FROM public.transaction_splits;
CREATE TABLE backup_20260420.budgets AS SELECT * FROM public.budgets;
CREATE TABLE backup_20260420.families AS SELECT * FROM public.families;
CREATE TABLE backup_20260420.family_members AS SELECT * FROM public.family_members;
CREATE TABLE backup_20260420.family_invitations AS SELECT * FROM public.family_invitations;
CREATE TABLE backup_20260420.trips AS SELECT * FROM public.trips;
CREATE TABLE backup_20260420.trip_members AS SELECT * FROM public.trip_members;
CREATE TABLE backup_20260420.trip_invitations AS SELECT * FROM public.trip_invitations;
CREATE TABLE backup_20260420.trip_exchange_rates AS SELECT * FROM public.trip_exchange_rates;
CREATE TABLE backup_20260420.notifications AS SELECT * FROM public.notifications;
CREATE TABLE backup_20260420.notification_preferences AS SELECT * FROM public.notification_preferences;
CREATE TABLE backup_20260420.financial_ledger AS SELECT * FROM public.financial_ledger;

-- ============================================
-- VERIFICAÇÃO DO BACKUP
-- ============================================

-- Contar registros em cada tabela
SELECT 
  'profiles' as tabela,
  (SELECT COUNT(*) FROM public.profiles) as original,
  (SELECT COUNT(*) FROM backup_20260420.profiles) as backup
UNION ALL
SELECT 
  'accounts',
  (SELECT COUNT(*) FROM public.accounts),
  (SELECT COUNT(*) FROM backup_20260420.accounts)
UNION ALL
SELECT 
  'categories',
  (SELECT COUNT(*) FROM public.categories),
  (SELECT COUNT(*) FROM backup_20260420.categories)
UNION ALL
SELECT 
  'transactions',
  (SELECT COUNT(*) FROM public.transactions),
  (SELECT COUNT(*) FROM backup_20260420.transactions)
UNION ALL
SELECT 
  'transaction_splits',
  (SELECT COUNT(*) FROM public.transaction_splits),
  (SELECT COUNT(*) FROM backup_20260420.transaction_splits)
UNION ALL
SELECT 
  'budgets',
  (SELECT COUNT(*) FROM public.budgets),
  (SELECT COUNT(*) FROM backup_20260420.budgets)
UNION ALL
SELECT 
  'families',
  (SELECT COUNT(*) FROM public.families),
  (SELECT COUNT(*) FROM backup_20260420.families)
UNION ALL
SELECT 
  'family_members',
  (SELECT COUNT(*) FROM public.family_members),
  (SELECT COUNT(*) FROM backup_20260420.family_members)
UNION ALL
SELECT 
  'trips',
  (SELECT COUNT(*) FROM public.trips),
  (SELECT COUNT(*) FROM backup_20260420.trips)
UNION ALL
SELECT 
  'notifications',
  (SELECT COUNT(*) FROM public.notifications),
  (SELECT COUNT(*) FROM backup_20260420.notifications);

-- ============================================
-- SCRIPT DE RESTAURAÇÃO (SE NECESSÁRIO)
-- ============================================

/*
-- ATENÇÃO: SÓ EXECUTE ISSO SE PRECISAR RESTAURAR!

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- Limpar tabelas atuais
TRUNCATE public.profiles CASCADE;
TRUNCATE public.accounts CASCADE;
TRUNCATE public.categories CASCADE;
TRUNCATE public.transactions CASCADE;
TRUNCATE public.transaction_splits CASCADE;
TRUNCATE public.budgets CASCADE;
TRUNCATE public.families CASCADE;
TRUNCATE public.family_members CASCADE;
TRUNCATE public.family_invitations CASCADE;
TRUNCATE public.trips CASCADE;
TRUNCATE public.trip_members CASCADE;
TRUNCATE public.trip_invitations CASCADE;
TRUNCATE public.trip_exchange_rates CASCADE;
TRUNCATE public.notifications CASCADE;
TRUNCATE public.notification_preferences CASCADE;
TRUNCATE public.financial_ledger CASCADE;

-- Restaurar dados do backup
INSERT INTO public.profiles SELECT * FROM backup_20260420.profiles;
INSERT INTO public.accounts SELECT * FROM backup_20260420.accounts;
INSERT INTO public.categories SELECT * FROM backup_20260420.categories;
INSERT INTO public.transactions SELECT * FROM backup_20260420.transactions;
INSERT INTO public.transaction_splits SELECT * FROM backup_20260420.transaction_splits;
INSERT INTO public.budgets SELECT * FROM backup_20260420.budgets;
INSERT INTO public.families SELECT * FROM backup_20260420.families;
INSERT INTO public.family_members SELECT * FROM backup_20260420.family_members;
INSERT INTO public.family_invitations SELECT * FROM backup_20260420.family_invitations;
INSERT INTO public.trips SELECT * FROM backup_20260420.trips;
INSERT INTO public.trip_members SELECT * FROM backup_20260420.trip_members;
INSERT INTO public.trip_invitations SELECT * FROM backup_20260420.trip_invitations;
INSERT INTO public.trip_exchange_rates SELECT * FROM backup_20260420.trip_exchange_rates;
INSERT INTO public.notifications SELECT * FROM backup_20260420.notifications;
INSERT INTO public.notification_preferences SELECT * FROM backup_20260420.notification_preferences;
INSERT INTO public.financial_ledger SELECT * FROM backup_20260420.financial_ledger;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- Verificar restauração
SELECT 
  'profiles' as tabela,
  (SELECT COUNT(*) FROM public.profiles) as restaurado,
  (SELECT COUNT(*) FROM backup_20260420.profiles) as backup
UNION ALL
SELECT 
  'transactions',
  (SELECT COUNT(*) FROM public.transactions),
  (SELECT COUNT(*) FROM backup_20260420.transactions);
*/

-- ============================================
-- INFORMAÇÕES DO BACKUP
-- ============================================

SELECT 
  'Backup criado em: ' || NOW() as info
UNION ALL
SELECT 
  'Schema: backup_20260420'
UNION ALL
SELECT 
  'Total de tabelas: 16'
UNION ALL
SELECT 
  'Status: Completo';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

/*
1. Este backup é LOCAL no banco de dados
2. Para backup EXTERNO, use o Supabase Dashboard
3. Mantenha este backup por pelo menos 7 dias
4. Após confirmar que tudo funciona, pode deletar:
   DROP SCHEMA backup_20260420 CASCADE;
*/
