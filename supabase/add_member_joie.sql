-- ==============================================================================
-- Add new member Joie to public.members
-- Run this once in your Supabase SQL Editor.
-- ==============================================================================

insert into public.members (name)
values ('Joie')
on conflict (name) do nothing;
