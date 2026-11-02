# Group Fitness App: Stage 3 Spec (yearly goals)

This spec continues `SPEC.md` and `SPEC-2.md`. Everything in those files still applies unless this file says otherwise. This file covers Milestones 8 to 10. Read the section for the current milestone before starting it.

## 1. Summary

Each member sets one goal per year the first time they open the app that year. The goal is either a number of workout days or a percent of days, whichever the member prefers. Every time the app opens, the Today tab says whether the member is on pace.

Changing a goal takes effort: the member must type a passage with no mistakes, and the group can see every change.

## 2. Design decisions for this stage

- **Start year:** goals begin in 2027. A constant `GOALS_START_YEAR` defaults to 2027, so the app shows no goal screens during the rest of 2026. For testing, the environment variable `VITE_GOALS_START_YEAR` can override it.
- **Storage:** a goal is stored as the type and number the member chose, so "200 days" stays "200 days" on screen. Pace math converts either type to the same comparison.
- **Visibility:** everyone can see everyone's goal and how many times it has changed. On-pace status is shown only for the signed-in member, since the group already sees each person's percentage.
- **Friction:** the typed passage is enforced in the browser only. This matches the existing trust model, where anyone with the passcode can act as any member. The server validates goal values but does not check that a passage was typed.
- **Timer:** the five-minute timer is not built. The typed passage and the public change log are the deterrents.
- **Joining mid-year:** a member who sets a goal partway through the year is measured against the full year, as in the percentage rule in `SPEC.md` section 4.3.

## 3. Scope

In scope: goal setup screen, goal card, goal text in the stats list, change flow with typed passage, change log, SQL, tests.

Out of scope: timers, notifications about goals, monthly or weekly goals, a history screen for past years' goals, end-of-year summaries, and editing another member's goal.

## 4. Stack

No new dependencies. Do not add any.

## 5. Rules and definitions

### 5.1 Goal values

A goal is `{ type: 'days' | 'percent', value: number }`.

- `days`: a whole number from 1 to the number of days in the year.
- `percent`: a whole number from 1 to 100.

`validateGoalInput(type, value, year)` in `src/lib/goals.ts` returns `null` when valid, or one of these messages: "Enter a whole number." / "Days must be between 1 and {daysInYear}." / "Percent must be between 1 and 100."

### 5.2 Pace rule

Implement once, as the pure function `computeGoalStatus(goal, year, workoutDays, daysCounted)` in `src/lib/goals.ts`. The inputs `workoutDays` and `daysCounted` come from `computeStats` (`SPEC.md` section 4.3), so the "today counts only once logged" rule applies here too.

Let `D = daysInYear(year)` and `den = goal.type === 'days' ? D : 100`. All values are integers.

- If `daysCounted === 0`, the state is `not_started`.
- Otherwise `surplus = workoutDays * den - goal.value * daysCounted`.
- If `surplus >= 0`, the state is `on_track` and `daysAhead = Math.floor(surplus / den)`.
- If `surplus < 0`, the state is `behind` and `daysBehind = Math.ceil(-surplus / den)`.

This compares `workoutDays / daysCounted` with `goal.value / den` using integer arithmetic only, so there are no rounding surprises.

### 5.3 Display text

Implement as pure functions in `src/lib/goals.ts`:

- `describeGoal(goal, year)`
  - days: `"{value} days (about {round(value / D * 100)}% of the year)"`
  - percent: `"{value}% of days (about {ceil(value * D / 100)} days)"`
- `describeGoalShort(goal)`: `"{value} days"` or `"{value}%"`
- `goalStatusText(status)`:
  - `not_started`: "Log today to start tracking your goal."
  - `on_track` with `daysAhead >= 1`: "On track, {n} day(s) ahead of pace." (use "day" when n is 1)
  - `on_track` otherwise: "On track."
  - `behind`: "Behind pace. {n} more workout day(s) to catch up." (use "day" when n is 1)

### 5.4 When a goal is required

A goal is required for the signed-in member when `year >= GOALS_START_YEAR` and no goal exists for that year. Until goals have finished loading, show "Loading..." instead of the app, so the setup screen never flashes for someone who already has a goal. While a goal is required, the setup screen replaces the whole app, including the tab bar.

`year` is the year of `todayLocal()`. The server only accepts goals for the member's current local year.

### 5.5 Typed passage

- The passage lives in `src/lib/passage.ts` as the exported constant `PASSAGE`. Default text (Shakespeare, public domain):

  `Let me not to the marriage of true minds admit impediments. Love is not love which alters when it alteration finds, or bends with the remover to remove.`

- Jackie may change `PASSAGE` later. It must use only letters, digits, spaces, commas, and periods. iPhone smart punctuation rewrites apostrophes, quotation marks, and double hyphens as people type, which would make a correct entry fail.
- `checkTyped(passage, typed)` returns `'complete'` when `typed === passage`, `'ok'` when `passage.startsWith(typed)` and the two differ, and `'typo'` otherwise. Comparison is exact, including case and spaces.
- The text area: `autoCorrect="off"`, `autoCapitalize="off"`, `spellCheck={false}`, `autoComplete="off"`. Block paste and drop (`onPaste` and `onDrop` call `preventDefault`).
- On every change, run `checkTyped`. On `'typo'`, clear the text area and show "That did not match. Start again from the beginning." The message disappears at the next keystroke. On `'complete'`, move to step 2 of the change flow.

### 5.6 Change log

The database records every goal row creation and change. The group-facing log lists only changes (entries that had an earlier goal), newest first, limited to 20. The first goal a member sets is not a change.

## 6. Screens

### 6.1 Goal setup screen (blocking)

- Heading: "Set your {year} goal"
- Body: "Choose how many days you will work out this year, or what percent of days. You can change it later, but it takes effort and the group sees every change."
- A two-option control: "Days" (default) and "Percent of days".
- A numeric text input (`inputMode="numeric"`) with a live helper line: for days, "That is about {round(value / D * 100)}% of the year."; for percent, "That is about {ceil(value * D / 100)} days." Show validation messages from `validateGoalInput` once the member has typed something.
- A "Set goal" button, disabled while the input is invalid. Tapping it shows a confirmation: "Your {year} goal will be {describeGoal}. Changing it later means typing a passage with no mistakes." with two buttons: "Confirm goal" and "Go back". Confirming calls `setGoal`, then shows the normal app.

### 6.2 Goal card (Today tab)

Placed between the unlogged banner and the group stats list. Shows "{year} goal", the `describeGoal` text, the `goalStatusText` line, and a "Change goal" text button. Shown only when `year >= GOALS_START_YEAR` and a goal exists.

### 6.3 Stats list additions

Under each member's name, a muted line: "Goal: {describeGoalShort}" followed by " (changed {n} time(s))" when `changeCount >= 1`. When `year >= GOALS_START_YEAR` and the member has no goal yet, the line reads "No goal set yet". Before the start year, show no goal text.

### 6.4 Goal changes list

Below the stats list, a "Goal changes" heading with a Show/Hide button (hidden by default). Each entry: "{name} changed their goal from {old short} to {new short} on {Mon D}." Dates are formatted in the device's time zone. Hide the whole section when there are no changes.

### 6.5 Change goal flow (full screen with a "Cancel" button at the top)

- **Step 1:** heading "Change your goal". Body: "To change your goal, type this passage exactly. One mistake and you start over." The passage in a bordered block, the text area from section 5.5, and a counter "{n} of {total} characters".
- **Step 2:** shown after the passage is complete. The same two-option control and input as the setup screen, prefilled with the current goal. Button "Save new goal", disabled while the input is invalid or unchanged. No second confirmation. Saving calls `setGoal`, then returns to the Today tab.
- Cancel at any point leaves the goal unchanged.

## 7. Code structure and data layer

New or changed files:

```
src/
  lib/
    goals.ts            (GOALS_START_YEAR, daysInYear use, validateGoalInput, computeGoalStatus, describeGoal, describeGoalShort, goalStatusText)
    goals.test.ts
    passage.ts          (PASSAGE, checkTyped)
    passage.test.ts
  screens/
    GoalSetupScreen.tsx
    GoalChangeScreen.tsx
  components/
    GoalCard.tsx
    GoalChangesList.tsx
supabase/
  goals.sql
  reset_goals.sql
```

Add to `src/data/types.ts`, and to both the mock and Supabase clients:

```ts
export type GoalType = 'days' | 'percent';
export interface Goal { type: GoalType; value: number }
export interface MemberGoal { memberId: string; goal: Goal; changeCount: number }
export interface GoalChange {
  memberId: string;
  memberName: string;
  oldGoal: Goal;
  newGoal: Goal;
  changedAt: string; // ISO timestamp
}

// added to DataClient:
getGoals(year: number): Promise<MemberGoal[]>;
setGoal(memberId: string, year: number, goal: Goal): Promise<void>;
getGoalChanges(year: number): Promise<GoalChange[]>;
```

The Supabase client maps these to `get_goals`, `set_goal`, and `get_goal_changes` in Appendix A (parameter names match the SQL). The mock client keeps goals in memory and behaves like the SQL: the first goal creates no change entry, a different goal creates one, and setting the identical goal does nothing.

`GOALS_START_YEAR` is `Number(import.meta.env.VITE_GOALS_START_YEAR ?? 2027)`.

## 8. Unit tests (Vitest)

`src/lib/goals.test.ts`, using year 2027 (365 days) unless stated:

- `validateGoalInput`: days 0, 366, 1.5, and NaN fail; days 1 and 365 pass; percent 0 and 101 fail; percent 1 and 100 pass; days 366 passes for 2028.
- `computeGoalStatus`:
  - days goal 200, `daysCounted` 0: `not_started`
  - days goal 200, `workoutDays` 55, `daysCounted` 100: `on_track` with `daysAhead` 0 (expected pace is 54.79)
  - days goal 200, `workoutDays` 54, `daysCounted` 100: `behind` with `daysBehind` 1
  - percent goal 50, `workoutDays` 5, `daysCounted` 10: `on_track`, `daysAhead` 0
  - percent goal 50, `workoutDays` 4, `daysCounted` 10: `behind`, `daysBehind` 1
  - percent goal 50, `workoutDays` 20, `daysCounted` 30: `on_track` with `daysAhead` 5
- `describeGoal`: days 200 gives "200 days (about 55% of the year)"; percent 60 gives "60% of days (about 219 days)".
- `describeGoalShort` and `goalStatusText`: singular and plural forms for 1 day and 2 days.

`src/lib/passage.test.ts`:

- an empty string returns `ok`
- a correct prefix returns `ok`
- a wrong character returns `typo`
- a case difference returns `typo`
- the full passage returns `complete`
- the full passage plus an extra character returns `typo`

## 9. Milestones

Stop after each milestone and write the milestone report from `GEMINI.md`. Jackie pushes to GitHub herself, Vercel deploys, and she tests.

### Milestone 8: foundation

1. Append Appendix B to `GEMINI.md`.
2. Write `supabase/goals.sql` and `supabase/reset_goals.sql` from Appendix A exactly.
3. Add the types and both client implementations (section 7).
4. Write `src/lib/goals.ts`, `src/lib/passage.ts`, and the tests in section 8.
5. Print human task 1 from section 10 and stop. Wait until Jackie confirms she ran the SQL.
6. After she confirms, run these checks, reading the URL and public key from `.env.local`:
   - A direct read of `member_goals` and of `goal_changes` with the public key returns an empty list (`[]`). Any rows mean something is wrong, so stop and report it.
   - Calling `get_goals` with a wrong passcode returns an error containing `invalid passcode`.

Done when `npm run build` and `npm test` pass and both checks pass.

### Milestone 9: set and display goals

1. Add `GOALS_START_YEAR`. Load goals together with the other app data.
2. Build the setup screen and the gate (section 5.4).
3. Build the goal card and the goal text in the stats list.
4. Add a "Testing goals" note to `README.md` explaining `VITE_GOALS_START_YEAR` (local only, never in Vercel).

Done when, with `VITE_GOALS_START_YEAR=2026` in Jackie's `.env.local` (mock mode first with `VITE_USE_MOCK=true`, then real mode):

- The first open shows only the setup screen. Invalid numbers show the right messages. The confirmation step appears, and "Go back" returns to the form.
- After confirming, the Today tab shows the goal card with a status line, and the stats list shows each member's goal.
- Reloading keeps the goal and does not show the setup screen again.
- With the override removed and the current year 2026, no goal UI appears anywhere.

### Milestone 10: changing goals and the change log

1. Build `GoalChangeScreen` with both steps (section 6.5).
2. Build `GoalChangesList` and wire the stats list's "changed n times" text.
3. Finish loading and error states for goal calls (same pattern as `SPEC.md` section 5.7).
4. Update `README.md` with a short "Goals" section.
5. Run `git grep -n -E "service_role|sb_secret_|VAPID_PRIVATE|CRON_SECRET|VITE_GOALS_START_YEAR"` and review every match with Jackie. Mentions in README text are fine. Any real value in a tracked file, or a `VITE_GOALS_START_YEAR` entry in a committed file, must be reported immediately.

Done when, on Jackie's phone:

- Tapping "Change goal" shows the passage. Pasting does nothing. A typo clears the box and shows the restart message. Typing the whole passage correctly opens step 2.
- Saving a different goal updates the goal card, adds an entry to the goal changes list, and increases the "changed n times" count.
- Cancel at any point changes nothing. Saving an identical goal creates no entry.

## 10. Human tasks and launch checklist

1. **Run the goals SQL.** After Milestone 8's code is written, run `supabase/goals.sql` in the Supabase SQL Editor.
2. **Testing note.** Set `VITE_GOALS_START_YEAR=2026` only in your local `.env.local`. Never add it in Vercel. Test goals created in 2026 are removed with `supabase/reset_goals.sql`.
3. **Launch checklist (late December):**
   1. Delete the `VITE_GOALS_START_YEAR` line from `.env.local` and confirm Vercel's environment variables do not contain it.
   2. In the SQL Editor, run `supabase/reset_goals.sql` and `supabase/reset_logs.sql` to remove all test data.
   3. Set everyone's time zone so "today" is correct before each person's first open: `update public.members set time_zone = 'America/Phoenix';`
   4. Check the member list matches the group, including you. Add anyone missing with an `insert into public.members (name) values ('Name');` statement.
   5. Confirm the reminder checks in `SPEC-2.md` Milestone 7 (steps 6 and 7) have passed, meaning scheduled reminders arrived correctly on three evenings.
   6. Send each friend the app link, the group passcode, and these steps: open the link in Safari, open the Share menu, choose Add to Home Screen, open the app from the Home Screen, enter the passcode, pick your name, go to Settings, turn on reminders, and tap Send test notification.
   7. On January 1, each person is asked to set a goal the first time they open the app.
   8. Check the Supabase dashboard occasionally. Free projects can be paused after a period of inactivity, and daily use by the group should prevent that.

## 11. Security rules

- The two new tables have row level security enabled with no policies. The public key cannot read or write them directly.
- Goals are read and written only through functions that check the group passcode.
- The database validates the goal type, the value range, and that the year is the member's current local year. It does not verify the typed passage.

---

## Appendix A: SQL

Create these two files exactly as written.

### supabase/goals.sql

```sql
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
```

### supabase/reset_goals.sql

```sql
-- Deletes ALL goals and goal changes for everyone.
-- Run once before the January 2027 launch to remove test data.
delete from public.goal_changes;
delete from public.member_goals;
```

## Appendix B: additions to GEMINI.md

Append this block to the end of `GEMINI.md` in Milestone 8, step 1.

```
## Additions for SPEC-3.md (milestones 8 to 10)

- The build spec for milestones 8 to 10 is SPEC-3.md. SPEC.md and SPEC-2.md still apply. No new dependencies are allowed in this stage.
- The database validates goal values only. The typed-passage friction lives in the browser by design. Do not try to enforce it on the server.
- VITE_GOALS_START_YEAR is for local testing only. Never add it to Vercel or to any committed file.
```
