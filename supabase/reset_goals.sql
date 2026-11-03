-- Deletes 2026 goals and goal changes so members can set them fresh.
-- Run once in the Supabase SQL Editor.
delete from public.goal_changes where year = 2026;
delete from public.member_goals where year = 2026;
