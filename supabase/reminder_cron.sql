-- ════════════════════════════════════════════════════════════════════
-- BearFit — reminder scheduler
-- Vercel Hobby cron only runs once a day, so Supabase pg_cron pings the
-- app every minute; /api/cron/reminders decides which pushes are due.
--
-- BEFORE RUNNING: replace the two placeholders below
--   YOUR-APP.vercel.app  → your production domain
--   YOUR_CRON_SECRET     → same value as CRON_SECRET in Vercel env
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('bearfit-reminders')
where exists (select 1 from cron.job where jobname = 'bearfit-reminders');

select cron.schedule(
  'bearfit-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
