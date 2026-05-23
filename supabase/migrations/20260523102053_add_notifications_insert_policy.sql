-- Migration: Add Notifications Insert Policy
-- Created: 2026-05-23
-- Purpose: Allow authenticated users to create notifications

BEGIN;

DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;

CREATE POLICY "Users can create notifications" ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

COMMIT;
