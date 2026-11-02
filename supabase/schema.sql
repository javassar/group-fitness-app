-- Group Fitness App schema. Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.day_logs (
  member_id uuid not null references public.members (id) on delete cascade,
  log_date date not null,
  status text not null check (status in ('worked_out', 'no_workout')),
  note text check (note is null or char_length(note) <= 200),
  updated_at timestamptz not null default now(),
  primary key (member_id, log_date)
);

create table if not exists public.group_settings (
  id int primary key default 1 check (id = 1),
  passcode_hash text not null
);

-- Row level security with no policies: the public API key cannot read or
-- write these tables directly. All access goes through the functions below.
alter table public.members enable row level security;
alter table public.day_logs enable row level security;
alter table public.group_settings enable row level security;

-- Internal helper. Raises an error unless the passcode is correct.
create or replace function public.assert_passcode(p_passcode text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from group_settings
    where passcode_hash = crypt(coalesce(p_passcode, ''), passcode_hash)
  ) then
    raise exception 'invalid passcode' using errcode = '28000';
  end if;
end;
$$;

create or replace function public.check_passcode(p_passcode text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from group_settings
    where passcode_hash = crypt(coalesce(p_passcode, ''), passcode_hash)
  );
$$;

create or replace function public.list_members(p_passcode text)
returns table (id uuid, name text, time_zone text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select m.id, m.name, m.time_zone
    from members m
    order by m.name;
end;
$$;

create or replace function public.set_member_time_zone(
  p_passcode text, p_member_id uuid, p_time_zone text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  if not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone: %', p_time_zone;
  end if;
  update members set time_zone = p_time_zone where id = p_member_id;
end;
$$;

create or replace function public.get_group_stats(p_passcode text, p_year int)
returns table (
  member_id uuid,
  name text,
  time_zone text,
  member_today date,
  worked_out_before_today int,
  today_status text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select
      m.id,
      m.name,
      m.time_zone,
      t.local_today,
      (
        select count(*)::int
        from day_logs l
        where l.member_id = m.id
          and l.status = 'worked_out'
          and l.log_date between make_date(p_year, 1, 1) and make_date(p_year, 12, 31)
          and l.log_date < t.local_today
      ),
      (
        select l.status
        from day_logs l
        where l.member_id = m.id
          and l.log_date = t.local_today
          and extract(year from t.local_today)::int = p_year
      )
    from members m
    cross join lateral (
      select (now() at time zone m.time_zone)::date as local_today
    ) t
    order by m.name;
end;
$$;

create or replace function public.get_member_logs(
  p_passcode text, p_member_id uuid, p_year int)
returns table (log_date date, status text, note text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select l.log_date, l.status, l.note
    from day_logs l
    where l.member_id = p_member_id
      and l.log_date between make_date(p_year, 1, 1) and make_date(p_year, 12, 31)
    order by l.log_date;
end;
$$;

create or replace function public.set_day_log(
  p_passcode text, p_member_id uuid, p_log_date date, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_today date;
begin
  perform assert_passcode(p_passcode);
  if p_status not in ('worked_out', 'no_workout') then
    raise exception 'invalid status';
  end if;
  select (now() at time zone m.time_zone)::date
    into v_today
    from members m
    where m.id = p_member_id;
  if v_today is null then
    raise exception 'unknown member';
  end if;
  if p_log_date > v_today
     or p_log_date < make_date(extract(year from v_today)::int, 1, 1) then
    raise exception 'date out of allowed range';
  end if;
  insert into day_logs (member_id, log_date, status, note, updated_at)
  values (p_member_id, p_log_date, p_status, nullif(btrim(p_note), ''), now())
  on conflict (member_id, log_date)
  do update set status = excluded.status,
                note = excluded.note,
                updated_at = now();
end;
$$;

create or replace function public.clear_day_log(
  p_passcode text, p_member_id uuid, p_log_date date)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  delete from day_logs
  where member_id = p_member_id and log_date = p_log_date;
end;
$$;

-- Only the app-facing functions are callable with the public API key.
revoke all on function public.assert_passcode(text) from public, anon, authenticated;
grant execute on function public.check_passcode(text) to anon;
grant execute on function public.list_members(text) to anon;
grant execute on function public.set_member_time_zone(text, uuid, text) to anon;
grant execute on function public.get_group_stats(text, int) to anon;
grant execute on function public.get_member_logs(text, uuid, int) to anon;
grant execute on function public.set_day_log(text, uuid, date, text, text) to anon;
grant execute on function public.clear_day_log(text, uuid, date) to anon;
