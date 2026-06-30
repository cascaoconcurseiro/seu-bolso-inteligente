-- Migration: Update pg_cron jobs with CRON_SECRET for Edge Function auth
-- Security audit 2026-06-30 — CRON_SECRET enforcement

BEGIN;

-- Job 3: send-bill-reminders-daily — update with CRON_SECRET header
SELECT cron.alter_job(
  job_id := 3,
  command := $$
  SELECT net.http_post(
    url := 'https://vrrcagukyfnlhxuvnssp.supabase.co/functions/v1/send-bill-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer mczed8B2PMLQzxHuwfpHxav9XS56B-r_VLqGLWpNYrfz3CuYjRhUJEepVJDyBGBr'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job 4: send-monthly-report-monthly — add CRON_SECRET header
SELECT cron.alter_job(
  job_id := 4,
  command := $$
  SELECT net.http_post(
    url := 'https://vrrcagukyfnlhxuvnssp.supabase.co/functions/v1/send-monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer mczed8B2PMLQzxHuwfpHxav9XS56B-r_VLqGLWpNYrfz3CuYjRhUJEepVJDyBGBr'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job 6: push-bill-reminders — DUPLICATE of job 3, disable it
SELECT cron.alter_job(
  job_id := 6,
  active := false
);

-- Job 7: send-monthly-report-job — DUPLICATE of job 4, disable it
SELECT cron.alter_job(
  job_id := 7,
  active := false
);

COMMIT;
