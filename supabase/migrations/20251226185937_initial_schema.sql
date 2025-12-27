-- =================================================
-- SISTEMA FINANCEIRO COMPLETO - MIGRAÇÃO INICIAL
-- =================================================

-- 1. TIPOS ENUMERADOS
CREATE TYPE public.transaction_type AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');
CREATE TYPE public.transaction_domain AS ENUM ('PERSONAL', 'SHARED', 'TRAVEL');
CREATE TYPE public.account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH');
CREATE TYPE public.sync_status AS ENUM ('SYNCED', 'PENDING', 'ERROR');
CREATE TYPE public.family_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE public.split_method AS ENUM ('EQUAL', 'PERCENTAGE', 'CUSTOM');
CREATE TYPE public.trip_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- 2. TABELA DE PERFIS (profiles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;;
