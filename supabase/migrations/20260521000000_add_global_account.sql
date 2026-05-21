-- Migration: Add GLOBAL_ACCOUNT to account_type enum

-- Add GLOBAL_ACCOUNT to the account_type enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'GLOBAL_ACCOUNT';
