-- Group Fitness App: Vacation / Injury Pause (Freeze Mode)
-- Run once in the Supabase SQL Editor.

create table if not exists public.member_pauses (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  start_date date not null,
  end_date date, -- null while pause is currently active
  created_at timestamptz not null default now()
);

alter table public.member_pauses enable row level security;

-- Fetch all pauses for a given year
create or replace function public.get_member_pauses(p_passcode text, p_year int)
returns table (
  id bigint,
  member_id uuid,
  year int,
  start_date date,
  end_date date
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select p.id, p.member_id, p.year, p.start_date, p.end_date
    from member_pauses p
    where p.year = p_year
    order by p.start_date asc;
end;
$$;

-- Toggle pause on or off for a member
create or replace function public.set_member_pause_state(
  p_passcode text,
  p_member_id uuid,
  p_year int,
  p_is_paused boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_today date;
  v_active_id bigint;
  v_start_date date;
begin
  perform assert_passcode(p_passcode);

  select (now() at time zone m.time_zone)::date
    into v_today
    from members m
    where m.id = p_member_id;

  if v_today is null then
    raise exception 'unknown member';
  end if;

  if p_year <> extract(year from v_today)::int then
    raise exception 'pauses can only be modified for the current year';
  end if;

  select id, start_date
    into v_active_id, v_start_date
    from member_pauses
    where member_id = p_member_id
      and year = p_year
      and end_date is null
    order by start_date desc
    limit 1;

  if p_is_paused then
    -- Turn pause ON if not already paused
    if v_active_id is null then
      insert into member_pauses (member_id, year, start_date, end_date)
      values (p_member_id, p_year, v_today, null);
    end if;
  else
    -- Turn pause OFF by closing the active pause
    if v_active_id is not null then
      if v_today > v_start_date then
        update member_pauses
          set end_date = (v_today - interval '1 day')::date
          where id = v_active_id;
      else
        -- If paused and unpaused on the exact same day, delete or close it
        update member_pauses
          set end_date = v_today
          where id = v_active_id;
      end if;
    end if;
  end if;
end;
$$;

grant execute on function public.get_member_pauses(text, int) to anon;
grant execute on function public.set_member_pause_state(text, uuid, int, boolean) to anon;
