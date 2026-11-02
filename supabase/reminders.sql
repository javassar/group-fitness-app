-- Stage 2: reminders. Run once in the Supabase SQL Editor, after schema.sql.

alter table public.members
  add column if not exists reminders_paused_until date,
  add column if not exists last_reminded_on date;

alter table public.group_settings
  add column if not exists sender_secret_hash text;

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  member_id uuid not null references public.members (id) on delete cascade,
  p256dh_key text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Internal helper: checks the secret used by the Vercel sender functions.
create or replace function public.assert_sender_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from group_settings
    where sender_secret_hash is not null
      and sender_secret_hash = crypt(coalesce(p_secret, ''), sender_secret_hash)
  ) then
    raise exception 'invalid sender secret' using errcode = '28000';
  end if;
end;
$$;

-- App-facing functions (group passcode).

create or replace function public.save_push_subscription(
  p_passcode text, p_member_id uuid, p_endpoint text, p_p256dh_key text, p_auth_key text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  if not exists (select 1 from members where id = p_member_id) then
    raise exception 'unknown member';
  end if;
  insert into push_subscriptions (endpoint, member_id, p256dh_key, auth_key)
  values (p_endpoint, p_member_id, p_p256dh_key, p_auth_key)
  on conflict (endpoint) do update
    set member_id = excluded.member_id,
        p256dh_key = excluded.p256dh_key,
        auth_key = excluded.auth_key;
end;
$$;

create or replace function public.remove_push_subscription(
  p_passcode text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  delete from push_subscriptions where endpoint = p_endpoint;
end;
$$;

create or replace function public.get_reminder_settings(
  p_passcode text, p_member_id uuid)
returns table (paused_until date)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_passcode(p_passcode);
  return query
    select m.reminders_paused_until
    from members m
    where m.id = p_member_id;
end;
$$;

create or replace function public.set_reminders_paused_until(
  p_passcode text, p_member_id uuid, p_paused_until date)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_today date;
begin
  perform assert_passcode(p_passcode);
  select (now() at time zone m.time_zone)::date
    into v_today
    from members m
    where m.id = p_member_id;
  if v_today is null then
    raise exception 'unknown member';
  end if;
  if p_paused_until is not null and p_paused_until < v_today then
    raise exception 'pause date is in the past';
  end if;
  update members
    set reminders_paused_until = p_paused_until
    where id = p_member_id;
end;
$$;

-- Sender functions (sender secret). Used only by the Vercel functions.

create or replace function public.get_reminder_targets(
  p_secret text, p_force boolean default false)
returns table (
  member_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text,
  logged_count int,
  member_count int
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  return query
    select
      m.id,
      s.endpoint,
      s.p256dh_key,
      s.auth_key,
      (select count(*)::int from day_logs l where l.log_date = t.local_today),
      (select count(*)::int from members)
    from members m
    join push_subscriptions s on s.member_id = m.id
    cross join lateral (
      select
        (now() at time zone m.time_zone)::date as local_today,
        extract(hour from (now() at time zone m.time_zone))::int as local_hour
    ) t
    where not exists (
            select 1 from day_logs l
            where l.member_id = m.id and l.log_date = t.local_today
          )
      and (m.reminders_paused_until is null or m.reminders_paused_until < t.local_today)
      and (
            p_force
            or (
              t.local_hour >= 20
              and (m.last_reminded_on is null or m.last_reminded_on < t.local_today)
            )
          );
end;
$$;

create or replace function public.mark_reminded(p_secret text, p_member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  update members as m
    set last_reminded_on = (now() at time zone m.time_zone)::date
    where m.id = any (p_member_ids);
end;
$$;

create or replace function public.delete_dead_subscriptions(
  p_secret text, p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  delete from push_subscriptions where endpoint = any (p_endpoints);
end;
$$;

create or replace function public.get_member_subscriptions(
  p_secret text, p_member_id uuid)
returns table (endpoint text, p256dh_key text, auth_key text)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform assert_sender_secret(p_secret);
  return query
    select s.endpoint, s.p256dh_key, s.auth_key
    from push_subscriptions s
    where s.member_id = p_member_id;
end;
$$;

revoke all on function public.assert_sender_secret(text) from public, anon, authenticated;
grant execute on function public.save_push_subscription(text, uuid, text, text, text) to anon;
grant execute on function public.remove_push_subscription(text, text) to anon;
grant execute on function public.get_reminder_settings(text, uuid) to anon;
grant execute on function public.set_reminders_paused_until(text, uuid, date) to anon;
grant execute on function public.get_reminder_targets(text, boolean) to anon;
grant execute on function public.mark_reminded(text, uuid[]) to anon;
grant execute on function public.delete_dead_subscriptions(text, text[]) to anon;
grant execute on function public.get_member_subscriptions(text, uuid) to anon;
