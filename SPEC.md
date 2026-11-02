# Group Fitness App: Stage 1 Spec

`GEMINI.md` holds the working rules. This file holds what to build. Read the section for the current milestone before starting it.

## 1. Product summary

A small web app for a group of five friends to track daily workouts. It replaces a shared Google Sheet where each person has a column and a filled cell means a workout happened that day.

Opening the app shows everyone's percentage of days worked out so far this year, plus one large control for logging today. Each person logs either "worked out" or "no workout". The explicit "no workout" choice exists so that skipping the app is visible. A person can add an optional short note such as "run" or "lift", and can edit any earlier day this year.

Launch is January 2027 with empty data. The app is a public webpage protected by a shared group passcode. There are no accounts. Each person picks their name once on their own device.

Later stages, which are NOT part of this spec: PWA install, a daily 8pm reminder notification, pausing reminders, and yearly goals. Several design choices below (time zones, a year-aware data model, a member list) exist so those stages fit in later without rework.

## 2. Scope

In scope:

- Passcode screen, name picker, Today screen, History screen
- Group stats list with percentages
- Logging, editing, and clearing days
- Supabase backend through SQL functions (Appendix A)
- A mock data mode with fake data for building the interface first
- Deployment preparation for Vercel

Out of scope (do not build, even if it seems easy):

- PWA manifest, service worker, or install prompts
- Push notifications or any reminder logic
- Goals, goal tracking, or goal-change friction
- Email or password logins, Supabase Auth, or any auth library
- Charts, streaks, badges, or achievements
- Importing data from the old Google Sheet
- Excluding vacation days from percentages

## 3. Stack

- Vite, React, TypeScript in strict mode. Node 20.19 or newer. Run `node --version` first. If it is older, stop and tell Jackie.
- Plain CSS in `src/styles.css`. No CSS framework, component library, or icon library. Write icons as inline SVG in `src/components/Icons.tsx`.
- React hooks for state. No router (two tabs switch with component state). No state library.
- Supabase (hosted Postgres) through `@supabase/supabase-js`. The client calls only the SQL functions in Appendix A.
- Vitest for unit tests of pure functions in `src/lib`.
- Allowed dependencies: react, react-dom, vite, @vitejs/plugin-react, typescript, vitest, @supabase/supabase-js, plus the type and lint packages that the Vite `react-ts` template installs. Ask before adding anything else.
- Required npm scripts: `dev`, `build`, `preview`, and `test` (set to `vitest run` so it exits on its own).
- Hosting is Vercel as a static site. Nothing in this repository runs on a server.

## 4. Rules and definitions

### 4.1 Dates and time zones

- A date is always a string in `YYYY-MM-DD` form.
- Never call `new Date('YYYY-MM-DD')`. It parses as UTC and causes off-by-one-day bugs. Do day arithmetic with `Date.UTC(year, month - 1, day)` and read results back with the `getUTC*` methods.
- A user's "today" is the current date on their device: `new Date().toLocaleDateString('en-CA')` returns `YYYY-MM-DD` in the device time zone. Wrap it as `todayLocal()` in `src/lib/dates.ts`.
- The device time zone is `Intl.DateTimeFormat().resolvedOptions().timeZone`, a named zone such as `America/New_York`. Store named zones, never numeric offsets, because named zones follow daylight saving time.
- When the app opens, and whenever it returns to the foreground, compare the signed-in member's stored time zone with the device time zone. If they differ, call `setMemberTimeZone`, then reload.
- The displayed year is the year of `todayLocal()`.

### 4.2 Day states

Each member-day is `worked_out`, `no_workout`, or unlogged (no row in the database). Unlogged days count as "no workout" in the percentage. Unlogged days look different from `no_workout` days in History.

### 4.3 Percentage rule

Implement once, as the pure function `computeStats(year, row)` in `src/lib/stats.ts`, and unit test it. Inputs come from `GroupStatsRow` (section 6). Definitions:

- `yearStart` is `year-01-01` and `yearEnd` is `year-12-31`.
- `daysCounted`:
  - 0 if `memberToday` is before `yearStart`
  - the number of days in the year if `memberToday` is after `yearEnd`
  - otherwise `dayOfYear(memberToday)` if `todayStatus` is not null, or `dayOfYear(memberToday) - 1` if today is unlogged
- `workoutDays = workedOutBeforeToday + (todayStatus === 'worked_out' ? 1 : 0)`
- `percent = daysCounted === 0 ? null : workoutDays / daysCounted`

Reason for this rule: today counts only after it is logged. The percentage therefore does not drop each morning before a person has had a chance to work out, and it can never exceed 100 percent. A `null` percent displays as an en dash.

### 4.4 Editing window

A member can set or clear any day from January 1 of the current year through today. Future dates are not allowed. The database enforces this too (Appendix A).

### 4.5 Unlogged days

The unlogged days for a member are the dates from January 1 of the current year through yesterday that have no log. Today is excluded because it is still pending. Implement `getUnloggedDates(...)` in `src/lib/dates.ts` and unit test it.

### 4.6 Identity and passcode

- Browser storage keys: `gfa.passcode` and `gfa.memberId`. Access them only through helpers in `src/lib/storage.ts` that wrap every call in try/catch and keep working if storage is unavailable. Use no other storage.
- The passcode is sent with every backend call. If any call fails with an error message containing `invalid passcode`, clear both keys and show the passcode screen.
- Anyone who knows the passcode can act as any member. This is accepted for a trusted friend group. Do not add checks to prevent it.

## 5. Screens

### 5.1 Passcode screen

Shown when there is no stored passcode. One text field labeled "Group passcode" and a "Continue" button. On submit, call `checkPasscode`. If it succeeds, store the passcode and continue. If it fails, show "That passcode is incorrect." If the request itself fails, show "Could not reach the server. Try again."

### 5.2 Name picker

Shown when a passcode is stored but no member is chosen. Heading "Who are you?" and one large button per member (from `listMembers`). Tapping a name stores `gfa.memberId`.

On every app load with both keys stored, call `listMembers`. If the stored member id is not in the list, clear `gfa.memberId` and show the name picker.

### 5.3 App shell

- Header: "Group Fitness" with the year, and a line "Signed in as {name}" with a "Not you?" button. That button clears `gfa.memberId` only, keeps the passcode, and shows the name picker.
- Bottom tab bar with two tabs: Today and History.
- In mock mode, show a small visible banner: "Demo mode: fake data, nothing is saved."

### 5.4 Today tab

From top to bottom:

1. **Unlogged banner**, shown only when the signed-in member has unlogged days: "{n} unlogged day(s) this year" with a "Review" button. Review opens the History tab with the "Only unlogged" filter turned on.
2. **Group stats list.** One row per member, sorted by percent descending (null last, ties by name). Each row shows: name, whole-number percent, a thin progress bar, and the text "{workoutDays} of {daysCounted} days". If the member's `todayStatus` is `worked_out`, show a check icon; if `no_workout`, show a dash icon; if unlogged, show nothing. Highlight the signed-in member's row. Tapping a row opens that member's History tab view (read-only for other members, editable for the signed-in member).
3. **Today card.** Shows today's date as a long label (for example "Monday, Jan 4"). Then a text input with placeholder "What did you do? (optional)", maximum 200 characters, prefilled with today's saved note if one exists. Then two buttons:
   - a large circular button with a check icon and the label "Worked out" (primary)
   - a smaller button labeled "No workout today"

   The button matching the saved status appears selected. Tapping either button saves immediately with the current note text, including when it is already selected (this is how a note-only change is saved). If today has a log, show a small "Clear today's log" text button that deletes it. Disable the buttons while a save is in progress.

### 5.5 History tab

- Heading with the member's name ("Your log" for the signed-in member).
- A toggle labeled "Only unlogged days".
- A list of every date from today back to January 1 of the current year, newest first. Each row shows: weekday and date (for example "Mon, Jan 4"), a status chip ("Worked out", "No workout", or "Not logged", with "Not logged" visually distinct), and the note if there is one.
- For the signed-in member, tapping a row expands an inline editor with the note input and three buttons: "Worked out", "No workout", "Clear". Saving works the same way as the Today card. Only one row is expanded at a time.
- When viewing another member, rows are read-only and a "Back" button returns to the member's own History.

### 5.6 Refreshing

Reload stats and logs after every save, whenever the page becomes visible again (the `visibilitychange` event), and whenever `todayLocal()` returns a different date than the one the screen was built with (day rollover).

### 5.7 Loading and errors

Show "Loading..." text on first load. If a load or save fails, show a plain error message with a "Try again" button. Never leave the screen blank or frozen.

### 5.8 Visual design

Mobile-first. Content column is centered with a maximum width of 480px. Touch targets are at least 44px tall. System font stack. Colors are CSS variables with one accent color. Support `prefers-color-scheme: dark`. Use a short transition on the check button and no other animation. Every interactive element is a real `<button>` or `<input>` with a visible label or `aria-label`.

## 6. Code structure

```
src/
  main.tsx
  App.tsx
  styles.css
  data/
    types.ts
    index.ts
    mockClient.ts
    supabaseClient.ts
  lib/
    dates.ts
    dates.test.ts
    stats.ts
    stats.test.ts
    storage.ts
  components/
    Icons.tsx
    StatsList.tsx
    TodayCard.tsx
    DayEditor.tsx
    TabBar.tsx
  screens/
    PasscodeScreen.tsx
    NamePickerScreen.tsx
    TodayScreen.tsx
    HistoryScreen.tsx
supabase/
  schema.sql
  seed.sql
  dev_seed_logs.sql
  reset_logs.sql
.env.example
README.md
```

### 6.1 Data layer contract

Write these types in `src/data/types.ts`. Both `mockClient.ts` and `supabaseClient.ts` implement `DataClient`, so the screens never know which one is active.

```ts
export type DayStatus = 'worked_out' | 'no_workout';

export interface Member {
  id: string;
  name: string;
  timeZone: string;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  note: string | null;
}

export interface GroupStatsRow {
  memberId: string;
  name: string;
  timeZone: string;
  memberToday: string; // member's local date, YYYY-MM-DD
  workedOutBeforeToday: number; // worked_out days in the year before memberToday
  todayStatus: DayStatus | null; // null if today is unlogged or memberToday is outside the year
}

export interface DataClient {
  checkPasscode(passcode: string): Promise<boolean>;
  listMembers(): Promise<Member[]>;
  setMemberTimeZone(memberId: string, timeZone: string): Promise<void>;
  getGroupStats(year: number): Promise<GroupStatsRow[]>;
  getMemberLogs(memberId: string, year: number): Promise<DayLog[]>;
  setDayLog(memberId: string, date: string, status: DayStatus, note: string | null): Promise<void>;
  clearDayLog(memberId: string, date: string): Promise<void>;
}
```

`src/data/index.ts` exports a function that builds the active client from a passcode. It uses the mock client when `VITE_USE_MOCK === 'true'` or when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. Otherwise it uses the Supabase client.

### 6.2 Mock client

- The passcode `test` is accepted. Any other passcode fails.
- Five members named as in `supabase/seed.sql`, all using the device time zone.
- Fake logs for the current year covering the most recent 60 days or since January 1, whichever is shorter, generated with a fixed-seed pseudo-random function so results are repeatable. Roughly 55 percent `worked_out`, 25 percent `no_workout`, 20 percent unlogged. A few entries have notes.
- State lives in memory and resets on reload. Mock `getGroupStats` must return rows shaped exactly like the real function (section 6.1) so `computeStats` behaves the same.

### 6.3 Supabase client

- Create the client with `createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })`. Auth is not used.
- Call `supabase.rpc('<function name>', { p_passcode, ... })` for each method. Parameter names match Appendix A.
- Convert snake_case result columns to the camelCase fields above. Dates arrive as `YYYY-MM-DD` strings.
- If an RPC returns an error, throw an `Error` whose message includes the database message so the `invalid passcode` check in section 4.6 works.
- The key in `VITE_SUPABASE_ANON_KEY` is the project's public key (labeled "anon" or "publishable" in the Supabase dashboard). It is safe to ship in the page because the SQL functions require the passcode.

## 7. Unit tests (Vitest)

`src/lib/stats.test.ts` covers `computeStats`:

- January 1, today unlogged: `daysCounted` 0, percent null
- January 1, today `worked_out`: 1 of 1, 100 percent
- March 1, 2027 (non-leap), today unlogged, `workedOutBeforeToday` 30: `daysCounted` 59
- March 1, 2028 (leap year), today unlogged: `daysCounted` 60
- Today `no_workout`: day counted, workout not counted
- Past year (`memberToday` in the following year): `daysCounted` equals days in that year and `todayStatus` is ignored
- Future year: `daysCounted` 0, percent null

`src/lib/dates.test.ts` covers:

- `dayOfYear` for 2027-01-01, 2027-03-01, 2028-03-01, 2027-12-31
- A newest-first date list from 2027-03-01 back to 2027-01-01 has exactly 60 entries and no duplicates or gaps across the March daylight saving change
- `getUnloggedDates` excludes today, excludes logged days, and returns an empty list on January 1

## 8. Milestones

Stop after each milestone. Write the milestone report from `GEMINI.md`. Wait for "continue".

### Milestone 1: scaffold and mock interface

1. Check the Node version.
2. Scaffold in a temporary subfolder, because this repository already has files: run `npm create vite@latest tmp-app -- --template react-ts`, move the generated files into the repository root, merge the generated `.gitignore` into the existing one, then delete `tmp-app`. Do not delete or overwrite `README.md`, `GEMINI.md`, `SPEC.md`, or `.git`.
3. Install dependencies, add Vitest, and set the npm scripts from section 3.
4. Write `src/lib`, `src/data/types.ts`, `mockClient.ts`, `src/data/index.ts` (mock only for now), all components and screens, and `styles.css`.
5. Write the unit tests from section 7.

Done when:

- `npm run build` and `npm test` finish with no errors.
- Jackie can run `npm run dev` and, using the passcode `test`: pick a name; see the stats list for five members; log today as worked out and see her percentage change; switch it to no workout; clear it; open History and see unlogged days marked; use the "Only unlogged days" filter; edit a past day and see the stats update; tap another member to view their log read-only; use "Not you?" to return to the name picker.
- In your report, list any of these steps you could not verify yourself.

### Milestone 2: Supabase backend

1. Install `@supabase/supabase-js`.
2. Create the four files in `supabase/` with the exact SQL from Appendix A.
3. Write `supabaseClient.ts`, update `src/data/index.ts` per section 6.1, and create `.env.example` containing the two variable names with empty values.
4. Add a "Backend setup" section to `README.md` summarizing the human steps in section 10.
5. Print the human steps from section 10 to Jackie and stop. Wait until she confirms she finished them.
6. After she confirms, run these checks against the live project, reading the URL and public key from `.env.local`:
   - A direct read of the `day_logs` table with the public key returns an empty list (`[]`). If it returns any rows, stop and report this as a serious problem.
   - Calling an RPC with a wrong passcode returns an error containing `invalid passcode`.
7. Ask Jackie to test in her browser with `npm run dev`.

Done when, in the browser: a wrong passcode is rejected; the correct passcode shows the real member list; a log saved on one device or browser window appears in a second window after reload; and stats match what the mock showed for similar data. If any SQL in `supabase/` produces an error when Jackie runs it, fix the file and give her the corrected SQL.

### Milestone 3: hardening

Implement sections 4.1 (time zone sync), 4.6 (invalid passcode handling), 5.6 (refreshing and day rollover), and 5.7 (loading and errors) completely, if any piece is still missing. Also:

- Prevent double submits by disabling controls while a save runs.
- Enforce the 200-character note limit in the input.
- Check the layout at 375px wide and confirm no horizontal scrolling.
- Make sure all interactive elements have accessible names.
- Finish `README.md`: what the app is, how to run it locally (mock mode and real mode), how to run tests, and the deployment steps from Milestone 4.

Done when `npm run build` and `npm test` pass and the checklist above is confirmed in the report.

### Milestone 4: deployment preparation

Jackie does the deployment itself. Your job:

1. Confirm `npm run build` produces `dist/` with no errors and that `.env.local` is ignored by git.
2. Run `git grep -n -E "service_role|sb_secret_|eyJ"` and review every match with Jackie. Explanatory mentions in README text are fine. Any real key in a tracked file is a problem to report immediately.
3. Give Jackie a step-by-step checklist for Vercel: import the GitHub repository, choose the Vite framework preset, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables, deploy, then open the live URL on a phone and test the full flow.

Done when Jackie has a working live URL.

## 9. Security rules

- The tables have row level security enabled with no policies. All reads and writes go through the SQL functions, and every function checks the passcode.
- The passcode is stored only as a hash in the database and typed by each person into the app. It never appears in any file in this repository.
- The `service_role` key and any "secret" key never appear in this project, in any file, prompt, or environment variable.
- The group passcode must be a long passphrase (four or more random words), since it is the only protection against strangers who find the URL.

## 10. Human tasks (the agent cannot do these)

Present these to Jackie at the end of Milestone 2, one at a time if she prefers.

1. Create a free Supabase account and a new project. Pick the region closest to most of the group. Save the database password in a password manager.
2. Open the SQL Editor in the Supabase dashboard. Edit the names in `supabase/seed.sql` if they are wrong. Run `supabase/schema.sql`, then `supabase/seed.sql`. Optionally run `supabase/dev_seed_logs.sql` to create fake test data for September and October 2026.
3. Set the group passcode. In the SQL Editor, run the following with a real passphrase in place of the placeholder. Run it directly in the editor. Do not save it in any file in the repository.

   ```sql
   insert into public.group_settings (id, passcode_hash)
   values (1, extensions.crypt('PUT YOUR PASSPHRASE HERE', extensions.gen_salt('bf')))
   on conflict (id) do update set passcode_hash = excluded.passcode_hash;
   ```

4. In the dashboard, open Project Settings, then API (the page may be labeled API Keys). Copy the Project URL and the public key (labeled "anon" or "publishable"). Create a file named `.env.local` in the repository root:

   ```
   VITE_SUPABASE_URL=paste the project URL here
   VITE_SUPABASE_ANON_KEY=paste the public key here
   ```

   Never copy the `service_role` or secret key.
5. Before the January 2027 launch, run `supabase/reset_logs.sql` to delete all test data, and confirm the member list is correct.

---

## Appendix A: SQL

Create these four files exactly as written, in `supabase/`.

### supabase/schema.sql

```sql
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
```

### supabase/seed.sql

```sql
-- Confirm these names before running. One row per person in the group.
insert into public.members (name)
values ('Jan'), ('Jack'), ('Audrey'), ('Gray'), ('Jackie')
on conflict (name) do nothing;
```

### supabase/dev_seed_logs.sql

```sql
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
```

### supabase/reset_logs.sql

```sql
-- Deletes ALL logged days for everyone.
-- Run once before the January 2027 launch to remove test data.
delete from public.day_logs;
```
