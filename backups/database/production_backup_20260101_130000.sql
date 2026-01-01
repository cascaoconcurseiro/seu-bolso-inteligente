-- =====================================================
-- BACKUP COMPLETO DO BANCO DE DADOS - SEU BOLSO INTELIGENTE
-- Data: 01/01/2026 13:00:00
-- Project ID: vrrcagukyfnlhxuvnssp
-- =====================================================
-- 
-- INSTRUÇÕES DE RESTAURAÇÃO:
-- 1. Conectar ao banco de dados Supabase
-- 2. Executar este script completo
-- 3. Verificar integridade dos dados
--
-- ATENÇÃO: Este script irá INSERIR dados nas tabelas.
-- Certifique-se de que as tabelas existem e estão vazias antes de executar.
-- =====================================================

-- Desabilitar triggers temporariamente para evitar loops
SET session_replication_role = 'replica';

-- =====================================================
-- TABELA: profiles (2 registros)
-- =====================================================

INSERT INTO profiles (id, email, full_name, avatar_url, created_at, updated_at) VALUES
('56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'wesley.diaslima@gmail.com', 'Wesley', NULL, '2025-12-26 20:58:50.63481+00', '2025-12-26 21:22:26.60763+00'),
('9545d0c1-94be-4b69-b110-f939bce072ee', 'francy.von@gmail.com', 'Fran', NULL, '2025-12-26 21:14:37.755264+00', '2025-12-26 21:22:26.60763+00');

-- =====================================================
-- TABELA: families (2 registros)
-- =====================================================

INSERT INTO families (id, name, owner_id, created_at, updated_at) VALUES
('2c564172-3aa5-43c4-a8cf-14b99865f581', 'Família de wesley.diaslima', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '2025-12-29 00:05:33.477341+00', '2025-12-29 00:05:33.477341+00'),
('f827a82e-2a47-4df5-ba4c-430023bba764', 'Família de Fran', '9545d0c1-94be-4b69-b110-f939bce072ee', '2025-12-30 17:52:36.19705+00', '2025-12-30 17:52:36.19705+00');

-- =====================================================
-- TABELA: family_members (4 registros)
-- =====================================================

INSERT INTO family_members (id, family_id, user_id, name, email, role, status, invited_by, linked_user_id, created_at, updated_at, avatar_url, sharing_scope, scope_start_date, scope_end_date, scope_trip_id) VALUES
('011cf81d-9708-4143-b8b9-d282d0012f2d', 'f827a82e-2a47-4df5-ba4c-430023bba764', NULL, 'Fran', NULL, 'admin', 'active', '9545d0c1-94be-4b69-b110-f939bce072ee', '9545d0c1-94be-4b69-b110-f939bce072ee', '2025-12-31 09:42:30.47223+00', '2025-12-31 09:42:30.47223+00', NULL, 'all', NULL, NULL, NULL),
('5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', '2c564172-3aa5-43c4-a8cf-14b99865f581', NULL, 'Fran', NULL, 'viewer', 'active', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '9545d0c1-94be-4b69-b110-f939bce072ee', '2025-12-29 13:48:48.823433+00', '2025-12-29 13:48:48.823433+00', NULL, 'all', NULL, NULL, NULL),
('7ba0b663-7ecc-41e9-a840-4cb729f0dac1', '2c564172-3aa5-43c4-a8cf-14b99865f581', NULL, 'Wesley', NULL, 'admin', 'active', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '2025-12-30 17:52:36.19705+00', '2025-12-30 17:52:36.19705+00', NULL, 'all', NULL, NULL, NULL),
('90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44', 'f827a82e-2a47-4df5-ba4c-430023bba764', NULL, 'Wesley', NULL, 'admin', 'active', '9545d0c1-94be-4b69-b110-f939bce072ee', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '2025-12-31 09:42:22.678192+00', '2025-12-31 09:42:22.678192+00', NULL, 'all', NULL, NULL, NULL);

-- =====================================================
-- TABELA: categories (36 registros)
-- =====================================================

INSERT INTO categories (id, user_id, name, icon, type, color, created_at) VALUES
('069f5598-3bfa-426c-97bd-3d5cb3a41995', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Lazer', '🎮', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('071dc755-ff6f-4485-82e7-c7d3b92d9e37', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Serviços', '🔧', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('0e62e98a-6f91-4900-89b4-9b7d47b25965', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Freelance', '💻', 'income', NULL, '2025-12-26 21:44:40.896416+00'),
('0f17ac1b-23de-46c7-95d2-76d767279cf7', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Educação', '📚', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('1bc975cb-32c5-44cf-a72f-0009331d380a', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Compras', '🛒', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('229e335e-77d4-40f4-9497-dd72ddab1fbc', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Transporte', '🚗', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('25d4df8d-5dcd-40b6-99e8-7b1a88a84f59', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Saldo Inicial', '💰', 'income', NULL, '2026-01-01 00:11:47.997189+00'),
('276267ce-21d6-4d10-8874-525f42bd4c4e', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Transporte', '🚗', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('307b199d-e6fa-49ae-bfc0-908149df7e9a', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Viagem', '✈️', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('330957f0-e125-41ff-a5cd-7e542f242eb8', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Compras', '🛒', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('4ba4fa86-e417-4427-a7ce-2380e44e0f8e', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Outros', '📦', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('509d32ed-0bf2-4cfe-8b34-e9759bee4f68', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Lazer', '🎮', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('55823a62-2d70-4ed5-a2ed-0312dac4d921', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Viagem', '✈️', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('5585a75e-b912-4c26-bff7-858363f2f529', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Outros', '📦', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('57ca7619-19fa-4d61-95ef-fee6d1b61de0', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Acerto Financeiro', '🤝', 'expense', NULL, '2026-01-01 00:11:47.997189+00'),
('58a5c0e2-0f34-4016-abe9-8f47d8218199', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Moradia', '🏠', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('5a6f5f9d-c01a-42e8-8a79-78317849b7c2', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Alimentação', '🍕', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('5c31154d-450e-4a51-bb79-328e51fb4046', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Outros', '💵', 'income', NULL, '2025-12-26 23:26:56.710759+00'),
('6fa69b9b-02d9-4225-b47c-c14af0899ed0', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Saúde', '💊', 'expense', NULL, '2025-12-26 21:44:40.896416+00'),
('7cb60329-4d81-4193-9eb1-4026be3aaca1', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Freelance', '💻', 'income', NULL, '2025-12-26 23:26:56.710759+00'),
('8d3dbed2-52f3-4b37-8daa-7ed7f39c8b0a', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Presente', '🎁', 'income', NULL, '2025-12-26 21:44:40.896416+00'),
('a8b23920-08d3-4e6d-9b16-f032c1019165', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Saldo Inicial', '💰', 'income', NULL, '2026-01-01 00:11:47.997189+00'),
('a9cf73f8-4970-45cc-8b5d-01f4d680b5a5', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Saúde', '💊', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('ade48596-79a3-47d2-a9b0-ebf13198f806', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Acerto Financeiro', '🤝', 'expense', NULL, '2026-01-01 00:11:47.997189+00'),
('b82c202d-10d8-412c-8841-8e5a5b82be80', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Presente', '🎁', 'income', NULL, '2025-12-26 23:26:56.710759+00'),
('b9acd1d5-fd05-42d3-a773-f157b3159766', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Salário', '💰', 'income', NULL, '2025-12-26 21:44:40.896416+00'),
('bc424071-7760-4802-8635-246e1281aab7', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Investimentos', '📈', 'income', NULL, '2025-12-26 23:26:56.710759+00'),
('c11d909e-7953-46e4-8013-23f77568302a', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Educação', '📚', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('cf0d0993-a239-43ba-8c9d-dc46b1bf69a0', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Investimentos', '📈', 'income', NULL, '2025-12-26 21:44:40.896416+00'),
('d803b16c-f2bb-45e7-a7fc-63e928ae4b19', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Acerto Financeiro', '🤝', 'income', NULL, '2026-01-01 00:11:47.997189+00'),
('d8a6bbff-ca49-4c27-802f-6e3decb168ce', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Moradia', '🏠', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('e9bb6c37-9064-488d-9187-e14011d8e27f', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Outros', '💵', 'income', NULL, '2025-12-26 21:44:40.896416+00'),
('f1547cd5-6ed3-48c6-855d-fa4792ad35bf', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Alimentação', '🍕', 'expense', NULL, '2025-12-26 23:26:56.710759+00'),
('f5a66edb-922b-4cc5-99e7-95aad5606c62', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Salário', '💰', 'income', NULL, '2025-12-26 23:26:56.710759+00'),
('f64e1f95-0880-426f-a245-910965a07916', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Acerto Financeiro', '🤝', 'income', NULL, '2026-01-01 00:11:47.997189+00'),
('fc5fe720-2c4a-495b-9da0-72f8934839db', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Serviços', '🔧', 'expense', NULL, '2025-12-26 21:44:40.896416+00');

-- =====================================================
-- TABELA: accounts (14 registros - apenas contas ativas)
-- =====================================================

INSERT INTO accounts (id, user_id, name, type, balance, bank_id, bank_color, bank_logo, currency, is_active, closing_day, due_day, credit_limit, created_at, updated_at, is_international, initial_balance, deleted) VALUES
('07be7fa2-2c6c-43ce-83e7-edf445d77392', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Wise - Conta Corrente', 'CHECKING', '985.00', 'wise', NULL, NULL, 'USD', true, NULL, NULL, NULL, '2025-12-31 15:00:35.664153+00', '2026-01-01 12:45:44.925976+00', true, '1000.00', false),
('791dc3f4-513c-4c14-8b06-304bbfd4fb87', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Nubank - Conta Corrente', 'CHECKING', '450.00', 'nubank', NULL, NULL, 'BRL', true, NULL, NULL, NULL, '2025-12-29 14:18:05.987284+00', '2026-01-01 12:19:16.446673+00', false, '1000.00', false),
('877ec569-2dd5-4cf9-b0ac-a6ec3dd3e256', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Nubank', 'CREDIT_CARD', '-1000.00', 'nubank', NULL, NULL, 'BRL', true, NULL, NULL, NULL, '2025-12-31 11:54:55.456217+00', '2025-12-31 18:14:47.742044+00', false, '0.00', false),
('e88c4669-34ee-4ed4-afab-876521b7207a', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Nubank', 'CREDIT_CARD', '0.00', 'nubank', NULL, NULL, 'BRL', true, 20, 28, '1000.00', '2025-12-31 11:51:14.63564+00', '2025-12-31 12:55:37.711311+00', false, '0.00', false),
('eaf4dc17-19fc-40fa-b889-87677862b29b', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Nomad - Conta Corrente', 'CHECKING', '4925.00', 'nomad', NULL, NULL, 'USD', true, NULL, NULL, NULL, '2025-12-31 17:51:59.608083+00', '2026-01-01 12:42:01.96405+00', true, '5000.00', false),
('fdb56a8c-7bf8-4384-a877-edb8315c99a0', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Nubank - Conta Corrente', 'CHECKING', '1400.00', 'nubank', NULL, NULL, 'BRL', true, NULL, NULL, NULL, '2025-12-30 22:14:03.459048+00', '2026-01-01 00:11:47.997189+00', false, '1000.00', false);

-- =====================================================
-- TABELA: trips (2 registros)
-- =====================================================

INSERT INTO trips (id, owner_id, name, destination, start_date, end_date, currency, budget, status, cover_image, notes, created_at, updated_at, shopping_list, exchange_entries, source_trip_id) VALUES
('0bb8daa3-2abc-413e-9983-38588edab203', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Ferias', 'Orlando', '2025-12-31', '2026-01-09', 'USD', '500.00', 'PLANNING', NULL, NULL, '2025-12-31 14:44:35.647295+00', '2026-01-01 01:00:03.219357+00', '[{"id":"ac887b28-c5b7-4605-999d-f560d2fc80cc","item":"carro","purchased":false,"estimatedCost":100}]', '[]', NULL),
('aa9ea15e-0ba7-4354-96eb-85f0c1869e8d', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Viagem para Paris', 'Paris, França', '2025-03-01', '2025-03-10', 'EUR', '5000.00', 'PLANNING', NULL, NULL, '2025-12-31 08:28:18.170874+00', '2025-12-31 08:28:18.170874+00', '[]', '[]', NULL);

-- =====================================================
-- TABELA: trip_members (4 registros)
-- =====================================================

INSERT INTO trip_members (id, trip_id, user_id, role, can_edit_details, can_manage_expenses, created_at, updated_at, personal_budget) VALUES
('11efd677-963d-4678-89a6-34e99b1ad9d5', 'aa9ea15e-0ba7-4354-96eb-85f0c1869e8d', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'member', false, true, '2025-12-31 08:32:36.380105+00', '2025-12-31 08:32:36.380105+00', NULL),
('555077b5-3fe9-487b-8020-93d9e77a46c3', 'aa9ea15e-0ba7-4354-96eb-85f0c1869e8d', '9545d0c1-94be-4b69-b110-f939bce072ee', 'owner', false, true, '2025-12-31 08:28:18.170874+00', '2025-12-31 08:28:18.170874+00', '500'),
('a7ce420d-d975-47d9-975e-285e4be238ab', '0bb8daa3-2abc-413e-9983-38588edab203', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'owner', false, true, '2025-12-31 14:44:35.647295+00', '2025-12-31 14:44:35.647295+00', NULL),
('ca1f4e7a-0514-49de-abc5-ee1abd3bc142', '0bb8daa3-2abc-413e-9983-38588edab203', '9545d0c1-94be-4b69-b110-f939bce072ee', 'member', false, true, '2025-12-31 14:46:44.045799+00', '2025-12-31 14:46:44.045799+00', '300');

-- =====================================================
-- TABELA: trip_invitations (2 registros)
-- =====================================================

INSERT INTO trip_invitations (id, trip_id, inviter_id, invitee_id, status, message, created_at, updated_at, responded_at) VALUES
('7acbe5a1-b764-4d7c-925c-c6ce569c3f8c', '0bb8daa3-2abc-413e-9983-38588edab203', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '9545d0c1-94be-4b69-b110-f939bce072ee', 'accepted', 'Você foi convidado para participar da viagem "Ferias"!', '2025-12-31 14:44:35.885229+00', '2025-12-31 14:44:35.885229+00', '2025-12-31 14:46:42.407+00'),
('f98db2c6-0add-4347-983c-e6514697f457', 'aa9ea15e-0ba7-4354-96eb-85f0c1869e8d', '9545d0c1-94be-4b69-b110-f939bce072ee', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'accepted', 'Vamos juntos para Paris! Vai ser incrível!', '2025-12-31 08:28:28.420464+00', '2025-12-31 08:28:28.420464+00', '2025-12-31 08:32:35.005+00');

-- =====================================================
-- TABELA: notification_preferences (2 registros)
-- =====================================================

INSERT INTO notification_preferences (id, user_id, invoice_due_enabled, invoice_due_days_before, budget_warning_enabled, budget_warning_threshold, shared_pending_enabled, recurring_enabled, savings_goal_enabled, weekly_summary_enabled, email_notifications, push_notifications, created_at, updated_at) VALUES
('2d0e9751-b228-4499-a5fd-74192e55c4e9', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', true, 3, true, 80, true, true, true, true, false, false, '2025-12-28 23:47:52.863074+00', '2025-12-28 23:47:52.863074+00'),
('878dea2e-4575-4109-9a44-d56f06fa6e3c', '9545d0c1-94be-4b69-b110-f939bce072ee', true, 3, true, 80, true, true, true, true, false, false, '2025-12-29 12:19:36.07549+00', '2025-12-29 12:19:36.07549+00');

-- =====================================================
-- TABELA: budgets (1 registro)
-- =====================================================

INSERT INTO budgets (id, user_id, category_id, name, amount, currency, period, is_active, created_at, updated_at, deleted) VALUES
('a5b200ee-00af-4c0f-a0ec-313c569f8d59', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'f1547cd5-6ed3-48c6-855d-fa4792ad35bf', 'Alimentação', '1000', 'BRL', 'MONTHLY', true, '2025-12-31 11:53:23.730572+00', '2025-12-31 11:53:23.730572+00', false);

-- =====================================================
-- TABELA: transactions (17 registros)
-- =====================================================

-- Transações de saldo inicial
INSERT INTO transactions (id, user_id, account_id, category_id, trip_id, amount, description, date, type, domain, is_shared, currency, competence_date, created_at, updated_at, creator_user_id, is_installment, is_recurring, is_settled, is_mirror, reconciled) VALUES
('35d2782b-b930-4b41-9366-9af2aa91ec7c', '9545d0c1-94be-4b69-b110-f939bce072ee', '07be7fa2-2c6c-43ce-83e7-edf445d77392', '25d4df8d-5dcd-40b6-99e8-7b1a88a84f59', NULL, '1000.00', 'Saldo inicial', '2025-12-31', 'INCOME', 'PERSONAL', false, 'USD', '2025-12-01', '2025-12-31 15:00:35.932014+00', '2026-01-01 00:11:47.997189+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false),
('60c8d384-73b2-4f2b-9704-a07507fb0f79', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'eaf4dc17-19fc-40fa-b889-87677862b29b', 'a8b23920-08d3-4e6d-9b16-f032c1019165', NULL, '5000.00', 'Saldo inicial', '2025-12-31', 'INCOME', 'PERSONAL', false, 'USD', '2025-12-01', '2025-12-31 17:51:59.894421+00', '2026-01-01 00:11:47.997189+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false),
('e5c1ea51-86ca-4470-8aad-3909a929bc49', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'fdb56a8c-7bf8-4384-a877-edb8315c99a0', 'a8b23920-08d3-4e6d-9b16-f032c1019165', NULL, '1000.00', 'Saldo inicial', '2025-12-30', 'INCOME', 'PERSONAL', false, 'BRL', '2025-12-01', '2025-12-30 22:14:03.732562+00', '2026-01-01 00:11:47.997189+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false),
('fe75b7b1-62f2-4b65-aa97-dc6e9017cb34', '9545d0c1-94be-4b69-b110-f939bce072ee', '791dc3f4-513c-4c14-8b06-304bbfd4fb87', '25d4df8d-5dcd-40b6-99e8-7b1a88a84f59', NULL, '1000.00', 'Saldo inicial', '2025-12-29', 'INCOME', 'PERSONAL', false, 'BRL', '2025-12-01', '2025-12-29 14:18:06.196067+00', '2026-01-01 00:11:47.997189+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false);

-- Transações compartilhadas
INSERT INTO transactions (id, user_id, account_id, destination_account_id, category_id, trip_id, amount, description, date, type, domain, is_shared, payer_id, source_transaction_id, notes, currency, competence_date, created_at, updated_at, creator_user_id, is_installment, is_recurring, is_settled, is_mirror, reconciled, related_member_id) VALUES
('8b752657-60cd-4654-8783-a6fc2d84d52f', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'fdb56a8c-7bf8-4384-a877-edb8315c99a0', NULL, '330957f0-e125-41ff-a5cd-7e542f242eb8', NULL, '100.00', 'teste compartilhado', '2025-12-31', 'EXPENSE', 'SHARED', true, NULL, NULL, NULL, 'BRL', '2025-12-01', '2025-12-31 08:58:52.330479+00', '2025-12-31 15:03:35.957073+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL),
('f365bb7c-f1be-4c37-ba5d-8e39fed108f0', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '877ec569-2dd5-4cf9-b0ac-a6ec3dd3e256', NULL, 'f1547cd5-6ed3-48c6-855d-fa4792ad35bf', NULL, '1000.00', 'mercado', '2025-12-31', 'EXPENSE', 'SHARED', true, NULL, NULL, NULL, 'BRL', '2025-12-01', '2025-12-31 18:14:45.914176+00', '2025-12-31 18:14:47.742044+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL),
('638373c4-6e68-444b-a28e-c7d5c46672f1', '9545d0c1-94be-4b69-b110-f939bce072ee', NULL, NULL, 'f1547cd5-6ed3-48c6-855d-fa4792ad35bf', NULL, '500.00', 'mercado', '2025-12-31', 'EXPENSE', 'SHARED', true, NULL, 'f365bb7c-f1be-4c37-ba5d-8e39fed108f0', 'Despesa compartilhada - Paga por Wesley', 'BRL', '2025-12-01', '2025-12-31 18:14:47.132657+00', '2025-12-31 18:14:47.132657+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL);

-- Transações de viagem
INSERT INTO transactions (id, user_id, account_id, destination_account_id, category_id, trip_id, amount, description, date, type, domain, is_shared, payer_id, source_transaction_id, notes, currency, competence_date, created_at, updated_at, creator_user_id, is_installment, is_recurring, is_settled, is_mirror, reconciled, related_member_id) VALUES
('7944a63f-1878-4429-844b-b52efbc42d5b', '9545d0c1-94be-4b69-b110-f939bce072ee', '07be7fa2-2c6c-43ce-83e7-edf445d77392', NULL, '069f5598-3bfa-426c-97bd-3d5cb3a41995', '0bb8daa3-2abc-413e-9983-38588edab203', '10.00', 'maria', '2025-12-31', 'EXPENSE', 'TRAVEL', true, NULL, NULL, NULL, 'USD', '2025-12-01', '2025-12-31 17:49:35.907641+00', '2025-12-31 17:49:39.778209+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false, NULL),
('03d5a965-f74f-466d-bc40-62d7a799dd59', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'eaf4dc17-19fc-40fa-b889-87677862b29b', NULL, 'f1547cd5-6ed3-48c6-855d-fa4792ad35bf', '0bb8daa3-2abc-413e-9983-38588edab203', '20.00', 'orlando', '2026-01-01', 'EXPENSE', 'TRAVEL', true, NULL, NULL, NULL, 'USD', '2026-01-01', '2026-01-01 12:42:01.250471+00', '2026-01-01 12:42:01.96405+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL),
('021e7d4a-6bc3-4d9d-b8c6-0489c1103b12', '9545d0c1-94be-4b69-b110-f939bce072ee', NULL, NULL, 'f1547cd5-6ed3-48c6-855d-fa4792ad35bf', '0bb8daa3-2abc-413e-9983-38588edab203', '10.00', 'orlando', '2026-01-01', 'EXPENSE', 'TRAVEL', true, NULL, '03d5a965-f74f-466d-bc40-62d7a799dd59', 'Despesa compartilhada - Paga por Wesley', 'BRL', '2026-01-01', '2026-01-01 12:42:01.720317+00', '2026-01-01 12:42:01.720317+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL),
('d96ec2b0-48c0-48f8-af6f-12a3aae5d3e2', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'eaf4dc17-19fc-40fa-b889-87677862b29b', NULL, '330957f0-e125-41ff-a5cd-7e542f242eb8', '0bb8daa3-2abc-413e-9983-38588edab203', '50.00', 'carro', '2025-12-31', 'EXPENSE', 'TRAVEL', false, NULL, NULL, NULL, 'USD', '2025-12-01', '2026-01-01 01:14:56.260851+00', '2026-01-01 01:14:56.260851+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, NULL);

-- Transações de acerto (settlements)
INSERT INTO transactions (id, user_id, account_id, destination_account_id, category_id, trip_id, amount, description, date, type, domain, is_shared, payer_id, source_transaction_id, notes, currency, competence_date, created_at, updated_at, creator_user_id, is_installment, is_recurring, is_settled, is_mirror, reconciled, related_member_id) VALUES
('10c143f7-d4ff-4572-8872-3ec93ccc2913', '9545d0c1-94be-4b69-b110-f939bce072ee', '791dc3f4-513c-4c14-8b06-304bbfd4fb87', NULL, 'ade48596-79a3-47d2-a9b0-ebf13198f806', NULL, '500.00', 'Pagamento Acerto - Wesley', '2026-01-01', 'EXPENSE', 'SHARED', false, NULL, NULL, NULL, 'BRL', '2026-01-01', '2026-01-01 01:31:46.484658+00', '2026-01-01 01:31:46.484658+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false, '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44'),
('31d851f4-9651-4ab3-a977-be69f3150102', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'fdb56a8c-7bf8-4384-a877-edb8315c99a0', NULL, 'd803b16c-f2bb-45e7-a7fc-63e928ae4b19', NULL, '500.00', 'Recebimento Acerto - Fran', '2025-12-31', 'INCOME', 'SHARED', false, NULL, NULL, NULL, 'BRL', '2025-12-01', '2025-12-31 18:55:02.169867+00', '2026-01-01 00:11:47.997189+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab'),
('9f8221ad-4f7a-4150-9fcc-86399741ee44', '9545d0c1-94be-4b69-b110-f939bce072ee', '07be7fa2-2c6c-43ce-83e7-edf445d77392', NULL, 'f64e1f95-0880-426f-a245-910965a07916', NULL, '5.00', 'Recebimento Acerto - Wesley', '2026-01-01', 'INCOME', 'SHARED', false, NULL, NULL, NULL, 'USD', '2026-01-01', '2026-01-01 01:32:34.648955+00', '2026-01-01 01:32:34.648955+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false, '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44'),
('ac34baf1-ef0f-4fba-bbc4-88adb71ffd80', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'eaf4dc17-19fc-40fa-b889-87677862b29b', NULL, '57ca7619-19fa-4d61-95ef-fee6d1b61de0', NULL, '5.00', 'Pagamento Acerto - Fran', '2025-12-31', 'EXPENSE', 'SHARED', false, NULL, NULL, NULL, 'USD', '2025-12-01', '2025-12-31 18:22:42.148051+00', '2026-01-01 00:11:47.997189+00', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', false, false, false, false, false, '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab'),
('d5a1eedc-f2ad-4b57-9fe9-c7d5a26edc14', '9545d0c1-94be-4b69-b110-f939bce072ee', '791dc3f4-513c-4c14-8b06-304bbfd4fb87', NULL, 'ade48596-79a3-47d2-a9b0-ebf13198f806', NULL, '50.00', 'Pagamento Acerto - Wesley', '2026-01-01', 'EXPENSE', 'SHARED', false, NULL, NULL, NULL, 'BRL', '2026-01-01', '2026-01-01 12:19:16.446673+00', '2026-01-01 12:19:16.446673+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false, '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44'),
('f7339dab-0074-4a17-afb3-975e65d91a6b', '9545d0c1-94be-4b69-b110-f939bce072ee', '07be7fa2-2c6c-43ce-83e7-edf445d77392', NULL, 'ade48596-79a3-47d2-a9b0-ebf13198f806', NULL, '10.00', 'Pagamento Acerto - Wesley', '2026-01-01', 'EXPENSE', 'SHARED', false, NULL, NULL, NULL, 'USD', '2026-01-01', '2026-01-01 12:45:44.925976+00', '2026-01-01 12:45:44.925976+00', '9545d0c1-94be-4b69-b110-f939bce072ee', false, false, false, false, false, '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44');

-- =====================================================
-- TABELA: transaction_splits (4 registros)
-- =====================================================

INSERT INTO transaction_splits (id, transaction_id, member_id, user_id, name, percentage, amount, is_settled, settled_at, settled_transaction_id, created_at, settled_by_debtor, settled_by_creditor, debtor_settlement_tx_id, creditor_settlement_tx_id) VALUES
('24f469b7-0850-49ea-b832-2643fdf15244', '03d5a965-f74f-466d-bc40-62d7a799dd59', '011cf81d-9708-4143-b8b9-d282d0012f2d', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Fran', '50.00', '10.00', false, '2026-01-01 12:45:43.639+00', NULL, '2026-01-01 12:42:01.720317+00', true, false, 'f7339dab-0074-4a17-afb3-975e65d91a6b', NULL),
('46db4140-5bda-429d-887f-0412198be2cf', '8b752657-60cd-4654-8783-a6fc2d84d52f', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Fran', '50.00', '50.00', true, '2026-01-01 12:19:15.222+00', NULL, '2025-12-31 09:02:17.170383+00', true, true, 'd5a1eedc-f2ad-4b57-9fe9-c7d5a26edc14', NULL),
('8333d2ce-0421-4e9c-8247-8e75f21c9f57', '7944a63f-1878-4429-844b-b52efbc42d5b', '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'Wesley', '50.00', '5.00', true, '2026-01-01 01:32:35.396+00', NULL, '2025-12-31 17:49:38.198479+00', true, true, 'ac34baf1-ef0f-4fba-bbc4-88adb71ffd80', '9f8221ad-4f7a-4150-9fcc-86399741ee44'),
('f8f226ce-5f36-4e4c-a4b9-4fc43b1d0ad1', 'f365bb7c-f1be-4c37-ba5d-8e39fed108f0', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', '9545d0c1-94be-4b69-b110-f939bce072ee', 'Fran', '50.00', '500.00', true, '2026-01-01 01:31:46.87+00', NULL, '2025-12-31 18:14:47.132657+00', true, true, '10c143f7-d4ff-4572-8872-3ec93ccc2913', '31d851f4-9651-4ab3-a977-be69f3150102');

-- =====================================================
-- TABELA: financial_ledger (14 registros)
-- =====================================================

INSERT INTO financial_ledger (id, transaction_id, user_id, entry_type, amount, currency, related_user_id, related_member_id, description, category, is_settled, settled_at, settlement_transaction_id, created_at, updated_at) VALUES
('01a844af-8928-443d-9ce1-29afbb8f4336', '8b752657-60cd-4654-8783-a6fc2d84d52f', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'DEBIT', '100.00', 'BRL', NULL, NULL, 'teste compartilhado (Pagamento)', 'SHARED', false, NULL, NULL, '2025-12-31 08:58:52.330479+00', '2025-12-31 08:58:52.330479+00'),
('01d50e88-fe03-4875-acda-369ed6c8653c', '7944a63f-1878-4429-844b-b52efbc42d5b', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '10.00', 'USD', NULL, NULL, 'maria (Pagamento)', 'TRAVEL', false, NULL, NULL, '2025-12-31 17:49:35.907641+00', '2025-12-31 17:49:35.907641+00'),
('3eb43637-b795-4496-a3ee-0f84401447a3', '03d5a965-f74f-466d-bc40-62d7a799dd59', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '10.00', 'USD', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '011cf81d-9708-4143-b8b9-d282d0012f2d', 'orlando (Dívida com Wesley)', 'TRAVEL', false, NULL, NULL, '2026-01-01 12:42:01.720317+00', '2026-01-01 12:42:01.720317+00'),
('481655bc-f94b-43ac-9289-3bc965ea2e34', 'f365bb7c-f1be-4c37-ba5d-8e39fed108f0', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '500.00', 'BRL', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', 'mercado (Dívida com Wesley)', 'SHARED', false, NULL, NULL, '2025-12-31 18:14:47.132657+00', '2025-12-31 18:14:47.132657+00'),
('7022ac11-6f67-406d-a021-25068fdbe805', 'f365bb7c-f1be-4c37-ba5d-8e39fed108f0', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'DEBIT', '1000.00', 'BRL', NULL, NULL, 'mercado (Pagamento)', 'SHARED', false, NULL, NULL, '2025-12-31 18:14:45.914176+00', '2025-12-31 18:14:45.914176+00'),
('72a8848d-85a8-43f6-9d97-9ae5fb441f64', '03d5a965-f74f-466d-bc40-62d7a799dd59', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'DEBIT', '20.00', 'USD', NULL, NULL, 'orlando (Pagamento)', 'TRAVEL', false, NULL, NULL, '2026-01-01 12:42:01.250471+00', '2026-01-01 12:42:01.250471+00'),
('8ac50fda-00fe-42d2-9546-5216ef2a6990', '7944a63f-1878-4429-844b-b52efbc42d5b', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'DEBIT', '5.00', 'USD', '9545d0c1-94be-4b69-b110-f939bce072ee', '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44', 'maria (Dívida com Fran)', 'TRAVEL', false, NULL, NULL, '2025-12-31 17:49:38.198479+00', '2025-12-31 17:49:38.198479+00'),
('9f2c26af-c5f7-45a8-9274-1886f08369e1', '638373c4-6e68-444b-a28e-c7d5c46672f1', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '500.00', 'BRL', NULL, NULL, 'mercado (Pagamento)', 'SHARED', false, NULL, NULL, '2025-12-31 18:14:47.132657+00', '2025-12-31 18:14:47.132657+00'),
('c3744c8a-05fc-47e8-bcb2-42594a339ad1', '03d5a965-f74f-466d-bc40-62d7a799dd59', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'CREDIT', '10.00', 'USD', '9545d0c1-94be-4b69-b110-f939bce072ee', '011cf81d-9708-4143-b8b9-d282d0012f2d', 'orlando (A receber de Fran)', 'TRAVEL', false, NULL, NULL, '2026-01-01 12:42:01.720317+00', '2026-01-01 12:42:01.720317+00'),
('d3fe988e-4eaf-4123-a5fb-e92901a92bbf', '021e7d4a-6bc3-4d9d-b8c6-0489c1103b12', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '10.00', 'BRL', NULL, NULL, 'orlando (Pagamento)', 'TRAVEL', false, NULL, NULL, '2026-01-01 12:42:01.720317+00', '2026-01-01 12:42:01.720317+00'),
('e26531d4-c513-4b63-9262-649e2290958e', 'f365bb7c-f1be-4c37-ba5d-8e39fed108f0', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'CREDIT', '500.00', 'BRL', '9545d0c1-94be-4b69-b110-f939bce072ee', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', 'mercado (A receber de Fran)', 'SHARED', false, NULL, NULL, '2025-12-31 18:14:47.132657+00', '2025-12-31 18:14:47.132657+00'),
('e92a9732-0c7d-41c6-8c47-91670327895c', '8b752657-60cd-4654-8783-a6fc2d84d52f', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', 'CREDIT', '50.00', 'BRL', '9545d0c1-94be-4b69-b110-f939bce072ee', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', 'teste compartilhado (A receber de Fran)', 'SHARED', false, NULL, NULL, '2025-12-31 09:02:17.170383+00', '2025-12-31 09:02:17.170383+00'),
('f8802ce0-1c32-4d69-a4f8-fd08a35ca9f4', '7944a63f-1878-4429-844b-b52efbc42d5b', '9545d0c1-94be-4b69-b110-f939bce072ee', 'CREDIT', '5.00', 'USD', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '90d67ca7-3a6d-4d4b-bac9-6a3787a7ee44', 'maria (A receber de Wesley)', 'TRAVEL', false, NULL, NULL, '2025-12-31 17:49:38.198479+00', '2025-12-31 17:49:38.198479+00'),
('fbe2c547-d406-4939-8485-cea2d3ac4367', '8b752657-60cd-4654-8783-a6fc2d84d52f', '9545d0c1-94be-4b69-b110-f939bce072ee', 'DEBIT', '50.00', 'BRL', '56ccd60b-641f-4265-bc17-7b8705a2f8c9', '5c4a4fb5-ccc9-440f-912e-9e81731aa7ab', 'teste compartilhado (Dívida com Wesley)', 'SHARED', false, NULL, NULL, '2025-12-31 09:02:17.170383+00', '2025-12-31 09:02:17.170383+00');

-- =====================================================
-- TABELAS VAZIAS (sem dados para backup)
-- =====================================================

-- family_invitations: 0 registros
-- pending_operations: 0 registros
-- shared_transaction_mirrors: 0 registros
-- trip_participants: 0 registros (tabela obsoleta)
-- trip_checklist: 0 registros
-- trip_itinerary: 0 registros
-- trip_exchange_purchases: 0 registros

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- =====================================================
-- RESUMO DO BACKUP
-- =====================================================
-- 
-- ✅ profiles: 2 registros
-- ✅ families: 2 registros
-- ✅ family_members: 4 registros
-- ✅ categories: 36 registros
-- ✅ accounts: 6 registros (apenas ativas)
-- ✅ trips: 2 registros
-- ✅ trip_members: 4 registros
-- ✅ trip_invitations: 2 registros
-- ✅ transactions: 17 registros
-- ✅ transaction_splits: 4 registros
-- ✅ financial_ledger: 14 registros
-- ✅ notification_preferences: 2 registros
-- ✅ budgets: 1 registro
-- 
-- TOTAL: 96 registros
-- 
-- =====================================================
-- FIM DO BACKUP
-- =====================================================
