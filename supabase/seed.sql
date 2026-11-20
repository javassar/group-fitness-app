-- Confirm these names before running. One row per person in the group.
insert into public.members (name)
values ('Jan'), ('Jack'), ('Audrey'), ('Gray'), ('Jackie'), ('Jeannie'), ('Joie')
on conflict (name) do nothing;
