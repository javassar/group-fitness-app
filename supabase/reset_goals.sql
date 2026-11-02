-- Deletes ALL goals and goal changes for everyone.
-- Run once before the January 2027 launch to remove test data.
delete from public.goal_changes;
delete from public.member_goals;
