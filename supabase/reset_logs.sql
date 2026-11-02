-- Deletes ALL logged days for everyone.
-- Run once before the January 2027 launch to remove test data.
delete from public.day_logs;
