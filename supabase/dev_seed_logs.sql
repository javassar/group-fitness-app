-- TEST DATA ONLY. Creates random logs for September and October 2026
-- so the interface has something to show. Remove it with reset_logs.sql.
insert into public.day_logs (member_id, log_date, status, note)
select
  m.id,
  g.day::date,
  case when random() < 0.6 then 'worked_out' else 'no_workout' end,
  case when random() < 0.3 then 'test entry' else null end
from public.members m
cross join generate_series('2026-09-01'::date, '2026-10-31'::date, interval '1 day') as g(day)
where random() < 0.9
on conflict do nothing;
