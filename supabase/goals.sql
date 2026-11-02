-- Stage 3: yearly goals. Run once in the Supabase SQL Editor, after reminders.sql.

create table if not exists public.member_goals (
  member_id uuid not null references public.members (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  goal_type text not null check (goal_type in ('days', 'percent')),
  goal_value int not null check (goal_value >= 1),
  set_at timestamptz not null default now(),
  primary key (member_id, year)
);

create table if not exists public.goal_changes (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  year int not null,
  old_goal_type text,
  old_goal_value int,
  new_goal_type text not null,
  new_goal_value int not null,
  changed_at timestamptz not null default now()
);

alter table public.member_goals enable row level security;
alter table public.goal_changes enable row level security;

create or replace function public.get_goals(p_passcode text, p_year int)
returns table (member_id uuid, goal_type text, goal_value int, change_count int)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select
      g.member_id,
      g.goal_type,
      g.goal_value,
      (
        select count(*)::int
        from goal_changes c
        where c.member_id = g.member_id
          and c.year = g.year
          and c.old_goal_type is not null
      )
    from member_goals g
    where g.year = p_year;
end;
$$;

create or replace function public.set_goal(
  p_passcode text, p_member_id uuid, p_year int, p_goal_type text, p_goal_value int)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_today date;
  v_days_in_year int;
  v_old member_goals%rowtype;
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
    raise exception 'goals can only be set for the current year';
  end if;

  if p_goal_type not in ('days', 'percent') then
    raise exception 'invalid goal type';
  end if;
  v_days_in_year := (make_date(p_year, 12, 31) - make_date(p_year, 1, 1)) + 1;
  if p_goal_type = 'days' and (p_goal_value < 1 or p_goal_value > v_days_in_year) then
    raise exception 'days goal out of range';
  end if;
  if p_goal_type = 'percent' and (p_goal_value < 1 or p_goal_value > 100) then
    raise exception 'percent goal out of range';
  end if;

  select * into v_old
    from member_goals g
    where g.member_id = p_member_id and g.year = p_year;

  if found then
    if v_old.goal_type = p_goal_type and v_old.goal_value = p_goal_value then
      return;
    end if;
    update member_goals
      set goal_type = p_goal_type, goal_value = p_goal_value, set_at = now()
      where member_id = p_member_id and year = p_year;
    insert into goal_changes
      (member_id, year, old_goal_type, old_goal_value, new_goal_type, new_goal_value)
    values
      (p_member_id, p_year, v_old.goal_type, v_old.goal_value, p_goal_type, p_goal_value);
  else
    insert into member_goals (member_id, year, goal_type, goal_value)
    values (p_member_id, p_year, p_goal_type, p_goal_value);
    insert into goal_changes
      (member_id, year, old_goal_type, old_goal_value, new_goal_type, new_goal_value)
    values
      (p_member_id, p_year, null, null, p_goal_type, p_goal_value);
  end if;
end;
$$;

create or replace function public.get_goal_changes(
  p_passcode text, p_year int, p_limit int default 20)
returns table (
  member_id uuid,
  member_name text,
  old_goal_type text,
  old_goal_value int,
  new_goal_type text,
  new_goal_value int,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select
      c.member_id,
      m.name,
      c.old_goal_type,
      c.old_goal_value,
      c.new_goal_type,
      c.new_goal_value,
      c.changed_at
    from goal_changes c
    join members m on m.id = c.member_id
    where c.year = p_year
      and c.old_goal_type is not null
    order by c.changed_at desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;

grant execute on function public.get_goals(text, int) to anon;
grant execute on function public.set_goal(text, uuid, int, text, int) to anon;
grant execute on function public.get_goal_changes(text, int, int) to anon;
